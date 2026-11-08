"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
export type MapPoint = {
  latitude: number;
  longitude: number;
  received_at?: string;
  accuracy?: number;
};
export default function RouteMap({
  points,
  label = "Reported contractor locations",
}: {
  points: MapPoint[];
  label?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    void import("leaflet").then((L) => {
      if (disposed || !element.current) return;
      map = L.map(element.current, { scrollWheelZoom: false }).setView(
        [24.88, 67.03],
        11,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);
      if (points.length) {
        const coords = points.map(
          (p) => [p.latitude, p.longitude] as [number, number],
        );
        L.polyline(coords, {
          color: "#7154d8",
          weight: 4,
          opacity: 0.85,
        }).addTo(map);
        const last = coords.at(-1)!;
        L.circleMarker(last, {
          radius: 9,
          color: "#fff",
          weight: 3,
          fillColor: "#7154d8",
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip("Last reported position");
        map.fitBounds(L.latLngBounds(coords), {
          padding: [35, 35],
          maxZoom: 14,
        });
      }
    });
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [points]);
  return (
    <div className="route-map" ref={element} role="img" aria-label={label} />
  );
}
