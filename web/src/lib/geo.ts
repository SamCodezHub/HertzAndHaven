/** Great-circle distance in kilometres. */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Interpolate a position along a lat/lng path at a 0..1 progress value. */
export function interpolateRoute(
  route: [number, number][],
  progress: number,
): { lat: number; lng: number } {
  if (!route.length) return { lat: 0, lng: 0 };
  if (route.length === 1) return { lat: route[0][0], lng: route[0][1] };

  const segments: number[] = [];
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const d = haversine(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);
    segments.push(d);
    total += d;
  }
  if (total === 0) return { lat: route[0][0], lng: route[0][1] };

  let remaining = total * Math.min(1, Math.max(0, progress));
  for (let i = 0; i < segments.length; i++) {
    if (remaining <= segments[i] || i === segments.length - 1) {
      const t = segments[i] === 0 ? 0 : remaining / segments[i];
      return {
        lat: route[i][0] + (route[i + 1][0] - route[i][0]) * t,
        lng: route[i][1] + (route[i + 1][1] - route[i][1]) * t,
      };
    }
    remaining -= segments[i];
  }
  return { lat: route[route.length - 1][0], lng: route[route.length - 1][1] };
}

/** Build a polyline between two points with a small lateral offset for realism. */
export function buildRouteTo(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  const jitter = 0.012;
  return [
    [from.lat, from.lng],
    [midLat + jitter, midLng - jitter],
    [midLat - jitter * 0.6, midLng + jitter * 0.8],
    [to.lat, to.lng],
  ] as [number, number][];
}
