"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildNavigationUrl,
  buildOpenStreetMapEmbedUrl,
  calculateDistanceMeters,
  formatApproximateDistance,
  getDistanceFeedback,
  isLikelyIOSUserAgent
} from "@/src/core/gameLogic";
import type { Checkpoint } from "@/src/types/game";

type LocationPermissionState = PermissionState | "idle" | "unsupported";

type CheckpointMapProps = {
  checkpoint: Checkpoint;
};

export function CheckpointMap({ checkpoint }: CheckpointMapProps) {
  const location = checkpoint.location;
  const [permissionState, setPermissionState] = useState<LocationPermissionState>("idle");
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
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
  const mapUrl = buildOpenStreetMapEmbedUrl(targetLocation);
  const navigationUrl = buildNavigationUrl(targetLocation, checkpoint.locationText, isIOS ? "ios" : "default");

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
      <iframe
        className="map-embed"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={mapUrl}
        title={`Mapa pre checkpoint ${checkpoint.title}`}
      />

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
