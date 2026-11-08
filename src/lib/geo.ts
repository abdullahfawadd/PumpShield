export type Geo = { latitude: number; longitude: number };
export function bearing(a: Geo, b: Geo) {
  const rad = Math.PI / 180;
  const d = (b.longitude - a.longitude) * rad;
  const y = Math.sin(d) * Math.cos(b.latitude * rad);
  const x =
    Math.cos(a.latitude * rad) * Math.sin(b.latitude * rad) -
    Math.sin(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.cos(d);
  return (Math.atan2(y, x) / rad + 360) % 360;
}
export function interpolatePosition(a: Geo, b: Geo, t: number): Geo {
  const progress = Math.min(1, Math.max(0, t));
  const delta = ((b.longitude - a.longitude + 540) % 360) - 180;
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * progress,
    longitude: ((a.longitude + delta * progress + 540) % 360) - 180,
  };
}
