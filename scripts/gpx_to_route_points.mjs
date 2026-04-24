#!/usr/bin/env node
/**
 * GPX -> route JSON with explicit points
 *
 * Usage:
 *   node scripts/gpx_to_route_points.mjs routes_gpx/1-2.gpx --from cp_01 --to cp_02 --mode dense
 *   node scripts/gpx_to_route_points.mjs routes_gpx/1-2.gpx --from cp_01 --to cp_02 --mode light --epsilon 6
 *
 * Stdout:
 *   JSON route object ready to paste into game.sk.json routes[]
 *
 * Stderr:
 *   Sanity-check info: bounds, first/last point, input/output counts, distance
 */

import fs from "node:fs";
import path from "node:path";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    mode: "dense",
    epsilon: 6
  };

  const file = argv[2];
  if (!file) {
    fail(
      "Missing GPX file path.\nUsage: node scripts/gpx_to_route_points.mjs route.gpx --from cp_01 --to cp_02 --mode dense|light [--epsilon meters]"
    );
  }

  for (let index = 3; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--from") {
      options.fromId = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument === "--to") {
      options.toId = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument === "--mode") {
      options.mode = argv[index + 1] ?? options.mode;
      index += 1;
      continue;
    }

    if (argument === "--epsilon") {
      options.epsilon = Number(argv[index + 1] ?? options.epsilon);
      index += 1;
      continue;
    }
  }

  if (typeof options.fromId !== "string" || options.fromId.trim().length === 0) {
    fail("Missing --from checkpoint id.");
  }

  if (typeof options.toId !== "string" || options.toId.trim().length === 0) {
    fail("Missing --to checkpoint id.");
  }

  if (!["dense", "light"].includes(options.mode)) {
    fail(`Invalid --mode ${options.mode}. Use dense or light.`);
  }

  if (!Number.isFinite(options.epsilon) || options.epsilon <= 0) {
    fail(`Invalid --epsilon ${options.epsilon}. Must be > 0 meters.`);
  }

  return {
    file,
    fromId: options.fromId.trim(),
    toId: options.toId.trim(),
    mode: options.mode,
    epsilon: options.epsilon
  };
}

function extractPointsFromGpx(xml) {
  const trkptRe = /<trkpt\b[^>]*\blat="([^"]+)"[^>]*\blon="([^"]+)"[^>]*>/g;
  const rteptRe = /<rtept\b[^>]*\blat="([^"]+)"[^>]*\blon="([^"]+)"[^>]*>/g;

  const trackPoints = [];
  for (const match of xml.matchAll(trkptRe)) {
    const lat = Number(match[1]);
    const lng = Number(match[2]);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      trackPoints.push({ lat, lng });
    }
  }

  if (trackPoints.length > 0) {
    return trackPoints;
  }

  const routePoints = [];
  for (const match of xml.matchAll(rteptRe)) {
    const lat = Number(match[1]);
    const lng = Number(match[2]);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      routePoints.push({ lat, lng });
    }
  }

  return routePoints;
}

function projectToLocalMeters(points) {
  const meanLatRad =
    points.reduce((sum, point) => sum + (point.lat * Math.PI) / 180, 0) / Math.max(points.length, 1);
  const earthRadiusMeters = 6371000;

  return points.map((point) => {
    const latRad = (point.lat * Math.PI) / 180;
    const lngRad = (point.lng * Math.PI) / 180;

    return {
      x: earthRadiusMeters * lngRad * Math.cos(meanLatRad),
      y: earthRadiusMeters * latRad
    };
  });
}

function perpendicularDistanceMeters(point, start, end) {
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const wx = point.x - start.x;
  const wy = point.y - start.y;

  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) {
    return Math.hypot(point.x - end.x, point.y - end.y);
  }

  const t = c1 / c2;
  const projectedX = start.x + t * vx;
  const projectedY = start.y + t * vy;

  return Math.hypot(point.x - projectedX, point.y - projectedY);
}

function rdpSimplify(points, epsilonMeters) {
  if (points.length <= 2) {
    return points;
  }

  const projected = projectToLocalMeters(points);
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [startIndex, endIndex] = stack.pop();
    let maxDistance = -1;
    let splitIndex = -1;

    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distance = perpendicularDistanceMeters(projected[index], projected[startIndex], projected[endIndex]);

      if (distance > maxDistance) {
        maxDistance = distance;
        splitIndex = index;
      }
    }

    if (maxDistance > epsilonMeters && splitIndex !== -1) {
      keep[splitIndex] = true;
      stack.push([startIndex, splitIndex], [splitIndex, endIndex]);
    }
  }

  return points.filter((_, index) => keep[index]);
}

function haversineMeters(left, right) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLat = toRadians(right.lat - left.lat);
  const deltaLng = toRadians(right.lng - left.lng);
  const leftLat = toRadians(left.lat);
  const rightLat = toRadians(right.lat);

  const haversine =
    Math.sin(deltaLat / 2) ** 2
    + Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

function totalDistanceMeters(points) {
  let total = 0;

  for (let index = 1; index < points.length; index += 1) {
    total += haversineMeters(points[index - 1], points[index]);
  }

  return Math.round(total);
}

function getBounds(points) {
  return points.reduce(
    (bounds, point) => ({
      minLat: Math.min(bounds.minLat, point.lat),
      maxLat: Math.max(bounds.maxLat, point.lat),
      minLng: Math.min(bounds.minLng, point.lng),
      maxLng: Math.max(bounds.maxLng, point.lng)
    }),
    {
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY
    }
  );
}

function main() {
  const { file, fromId, toId, mode, epsilon } = parseArgs(process.argv);
  const absolutePath = path.resolve(file);
  const xml = fs.readFileSync(absolutePath, "utf8");
  const inputPoints = extractPointsFromGpx(xml);

  if (inputPoints.length < 2) {
    fail("No route points found in GPX. Expected at least 2 trkpt/rtept points.");
  }

  const outputPoints = mode === "light" ? rdpSimplify(inputPoints, epsilon) : inputPoints;
  const route = {
    fromId,
    toId,
    distanceM: totalDistanceMeters(outputPoints),
    points: outputPoints
  };

  const sanityCheck = {
    file: absolutePath,
    mode,
    epsilon,
    inputPoints: inputPoints.length,
    outputPoints: outputPoints.length,
    bounds: getBounds(outputPoints),
    firstPoint: outputPoints[0],
    lastPoint: outputPoints[outputPoints.length - 1],
    distanceM: route.distanceM
  };

  process.stdout.write(`${JSON.stringify(route, null, 2)}\n`);
  process.stderr.write(`${JSON.stringify(sanityCheck, null, 2)}\n`);
}

main();
