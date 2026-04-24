import type { Location } from "@/src/types/game";

export function decodePolyline(encoded: string): Location[] {
  const points: Location[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      if (index >= encoded.length) {
        return points;
      }

      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    const latitudeDelta = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    latitude += latitudeDelta;

    result = 0;
    shift = 0;

    do {
      if (index >= encoded.length) {
        return points;
      }

      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    const longitudeDelta = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    longitude += longitudeDelta;

    points.push({
      lat: latitude / 1e5,
      lng: longitude / 1e5
    });
  }

  return points;
}
