"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildNavigationUrl,
  calculatePathDistanceMeters,
  calculateDistanceMeters,
  formatApproximateDistance,
  getDistanceFeedback,
  getPrevCheckpoint,
  getRouteSegment,
  isLikelyIOSUserAgent
} from "@/src/core/gameLogic";
import type { Checkpoint, GameContent, Location } from "@/src/types/game";

type LocationPermissionState = PermissionState | "idle" | "unsupported";

type CheckpointMapProps = {
  game: GameContent;
  checkpoint: Checkpoint;
};

type LeafletModule = typeof import("leaflet");

const DEFAULT_MAP_ZOOM = 17;
const MAP_FIT_PADDING: [number, number] = [28, 28];

function areLocationsClose(left: Location, right: Location) {
  return Math.abs(left.lat - right.lat) < 0.00002 && Math.abs(left.lng - right.lng) < 0.00002;
}

function ensureRouteEndpoints(points: Location[], start: Location, end: Location) {
  const normalizedPoints = [...points];

  if (normalizedPoints.length === 0 || !areLocationsClose(normalizedPoints[0], start)) {
    normalizedPoints.unshift(start);
  }

  const lastPoint = normalizedPoints[normalizedPoints.length - 1];
  if (!lastPoint || !areLocationsClose(lastPoint, end)) {
    normalizedPoints.push(end);
  }

  return normalizedPoints;
}

function toLeafletLatLng(location: Location): [number, number] {
  return [location.lat, location.lng];
}

function createMarkerIcon(leaflet: LeafletModule, variant: "start" | "end") {
  const size = variant === "end" ? 24 : 18;
  const anchor = Math.round(size / 2);

  return leaflet.divIcon({
    className: "map-marker-icon",
    html: `<span class="map-marker map-marker--${variant}"></span>`,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor]
  });
}

export function CheckpointMap({ game, checkpoint }: CheckpointMapProps) {
  const location = checkpoint.location;
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const routeLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [permissionState, setPermissionState] = useState<LocationPermissionState>("idle");
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [distanceText, setDistanceText] = useState<string | null>(null);

  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false;
    }

    return isLikelyIOSUserAgent(navigator.userAgent);
  }, []);

  useEffect(() => {
    if (!location || typeof navigator === "undefined") {
      return;
    }

    if (typeof navigator.geolocation === "undefined") {
      setPermissionState("unsupported");
      return;
    }

    if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
      return;
    }

    let isActive = true;
    let permissionStatus: PermissionStatus | null = null;

    async function checkPermission() {
      try {
        permissionStatus = await navigator.permissions.query({
          name: "geolocation" as PermissionName
        });

        if (!isActive) {
          return;
        }

        setPermissionState(permissionStatus.state);
        permissionStatus.onchange = () => {
          setPermissionState(permissionStatus?.state ?? "idle");
        };
      } catch {
        setPermissionState("idle");
      }
    }

    void checkPermission();

    return () => {
      isActive = false;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [location]);

  if (!location) {
    return null;
  }

  const targetLocation = location;
  const navigationUrl = buildNavigationUrl(targetLocation, checkpoint.locationText, isIOS ? "ios" : "default");
  const routeData = useMemo(() => {
    const prevCheckpoint = getPrevCheckpoint(game, checkpoint.id);
    const originLocation = prevCheckpoint?.location ?? null;

    if (!originLocation) {
      return {
        originCheckpoint: null,
        routeLocations: [] as Location[],
        routeDistance: null as string | null,
        routeNote: null as string | null
      };
    }

    const routeSegment = getRouteSegment(game, prevCheckpoint.id, checkpoint.id);
    const hasRoutePoints = Boolean(
      routeSegment
      && routeSegment.fromId === prevCheckpoint.id
      && routeSegment.toId === checkpoint.id
      && Array.isArray(routeSegment.points)
      && routeSegment.points.length >= 2
    );
    const routeLocations = hasRoutePoints
      ? ensureRouteEndpoints(routeSegment.points, originLocation, targetLocation)
      : [originLocation, targetLocation];
    const routeDistanceMeters = routeSegment?.distanceM ?? calculatePathDistanceMeters(routeLocations);

    return {
      originCheckpoint: prevCheckpoint,
      routeLocations,
      routeDistance: routeDistanceMeters > 0 ? formatApproximateDistance(routeDistanceMeters) : null,
      routeNote: hasRoutePoints ? null : "Trasa nie je dostupná, zobrazujem priamu čiaru."
    };
  }, [checkpoint.id, checkpoint.order, game, targetLocation]);

  useEffect(() => {
    if (!location || !mapElementRef.current || mapRef.current) {
      return;
    }

    let isActive = true;

    async function initializeMap() {
      try {
        const leaflet = await import("leaflet");

        if (!isActive || !mapElementRef.current || mapRef.current) {
          return;
        }

        leafletRef.current = leaflet;

        const map = leaflet.map(mapElementRef.current, {
          zoomControl: false
        });

        leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19
        }).addTo(map);

        leaflet.control.zoom({
          position: "bottomright"
        }).addTo(map);

        routeLayerRef.current = leaflet.layerGroup().addTo(map);
        mapRef.current = map;
        setMapLoadError(null);
        setIsMapReady(true);
      } catch {
        if (!isActive) {
          return;
        }

        setMapLoadError("Mapu sa teraz nepodarilo načítať. Navigáciu a kontrolu polohy môžeš stále použiť.");
      }
    }

    void initializeMap();

    return () => {
      isActive = false;
      routeLayerRef.current?.clearLayers();
      routeLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      setIsMapReady(false);
    };
  }, [location]);

  useEffect(() => {
    if (!location || !isMapReady || !leafletRef.current || !mapRef.current || !routeLayerRef.current) {
      return;
    }

    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const routeLayer = routeLayerRef.current;
    const destinationLatLng = toLeafletLatLng(targetLocation);
    const originLocation = routeData.originCheckpoint?.location ?? null;

    routeLayer.clearLayers();
    map.invalidateSize();

    if (!originLocation) {
      leaflet.marker(destinationLatLng, {
        icon: createMarkerIcon(leaflet, "end")
      }).addTo(routeLayer);

      map.setView(destinationLatLng, DEFAULT_MAP_ZOOM);
      return;
    }

    const originLatLng = toLeafletLatLng(originLocation);
    const routeLatLngs = routeData.routeLocations.map(toLeafletLatLng);
    const polyline = leaflet.polyline(routeLatLngs, {
      color: "#7c4a1d",
      lineCap: "round",
      lineJoin: "round",
      opacity: 0.9,
      weight: 5
    }).addTo(routeLayer);

    leaflet.marker(originLatLng, {
      icon: createMarkerIcon(leaflet, "start")
    }).addTo(routeLayer);

    leaflet.marker(destinationLatLng, {
      icon: createMarkerIcon(leaflet, "end")
    }).addTo(routeLayer);

    const bounds = polyline.getBounds();
    bounds.extend(originLatLng);
    bounds.extend(destinationLatLng);

    map.fitBounds(bounds, {
      padding: MAP_FIT_PADDING
    });
  }, [checkpoint.id, isMapReady, routeData, targetLocation, location]);

  function showDeniedMessage() {
    setDistanceText(null);
    setGpsMessage(
      "Poloha je momentálne zablokovaná. V Android Chrome otvor Nastavenia stránky > Povolenia > Poloha. V iOS Safari otvor aA > Nastavenia webovej stránky > Poloha a povoľ ju pre túto stránku."
    );
  }

  function handleCheckLocation() {
    if (typeof navigator === "undefined" || typeof navigator.geolocation === "undefined") {
      setDistanceText(null);
      setGpsMessage("Toto zariadenie nevie zistiť polohu v prehliadači. Hra však môže pokračovať aj bez toho.");
      setPermissionState("unsupported");
      return;
    }

    if (permissionState === "denied") {
      showDeniedMessage();
      return;
    }

    setIsCheckingLocation(true);
    setGpsMessage(
      permissionState === "prompt"
        ? "Poloha je dobrovoľná pomôcka. Po potvrdení zistím len približnú vzdialenosť k tomuto checkpointu."
        : null
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const distanceMeters = calculateDistanceMeters(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          },
          targetLocation
        );

        setPermissionState("granted");
        setDistanceText(formatApproximateDistance(distanceMeters));
        setGpsMessage(getDistanceFeedback(distanceMeters));
        setIsCheckingLocation(false);
      },
      (error) => {
        setIsCheckingLocation(false);
        setDistanceText(null);

        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState("denied");
          showDeniedMessage();
          return;
        }

        if (error.code === error.TIMEOUT) {
          setGpsMessage("Nepodarilo sa zistiť polohu včas. Skús to znova vonku alebo bližšie pri otvorenom priestore.");
          return;
        }

        setGpsMessage("Polohu sa teraz nepodarilo načítať. Skús to znova o chvíľu, hra však môže pokračovať ďalej.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  return (
    <section className="map-card">
      <div className="map-frame">
        {mapLoadError ? (
          <div className="map-fallback">
            <p className="section-copy">{mapLoadError}</p>
          </div>
        ) : (
          <div
            aria-label={`Mapa pre checkpoint ${checkpoint.title}`}
            className="map-live"
            ref={mapElementRef}
          />
        )}
      </div>

      {routeData.routeDistance || routeData.routeNote ? (
        <section className="support-card">
          {routeData.routeDistance ? (
            <p className="section-copy">Trasa k tomuto checkpointu: {routeData.routeDistance}</p>
          ) : null}
          {routeData.routeNote ? <p className="map-note">{routeData.routeNote}</p> : null}
        </section>
      ) : null}

      <div className="action-row">
        <a className="secondary-action-link" href={navigationUrl} rel="noreferrer" target="_blank">
          Otvoriť navigáciu
        </a>
        <button className="secondary-action-button" onClick={handleCheckLocation} type="button">
          {isCheckingLocation ? "Kontrolujem polohu..." : "Skontrolovať polohu"}
        </button>
      </div>

      {permissionState === "prompt" ? (
        <section className="support-card">
          <p className="section-copy">
            Poloha je dobrovoľná pomôcka. Použije sa až po kliknutí na kontrolu polohy a nič neblokuje.
          </p>
        </section>
      ) : null}

      {gpsMessage || distanceText ? (
        <section className="support-card">
          {gpsMessage ? <p className="section-copy">{gpsMessage}</p> : null}
          {distanceText ? <p className="map-distance">Približná vzdialenosť: {distanceText}</p> : null}
        </section>
      ) : null}
    </section>
  );
}
