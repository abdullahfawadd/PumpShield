"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Geo } from "@/lib/geo";
export type MapPoint = {
  latitude: number;
  longitude: number;
  received_at?: string;
  accuracy?: number;
};
export default function RouteMap({
  points,
  station,
  depot,
  selected,
  label = "Reported contractor locations",
  onPick,
}: {
  points: MapPoint[];
  station?: Geo | null;
  depot?: Geo | null;
  selected?: Geo | null;
  label?: string;
  onPick?: (point: Geo) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);
  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    void import("leaflet").then((L) => {
      if (disposed || !element.current) return;
      map = L.map(element.current, { scrollWheelZoom: false }).setView(
        [24.88, 67.03],
        11,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);
      map.on("click", (event) =>
        pick.current?.({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        }),
      );
      const coords = points
        .filter(
          (point) =>
            Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
        )
        .map((point) => [point.latitude, point.longitude] as [number, number]);
      const bounds = L.latLngBounds(coords);
      const last = coords.at(-1);
      if (last) {
        L.polyline(coords, { color: "#fff", weight: 8 }).addTo(map);
        L.polyline(coords, {
          color: "#07524f",
          weight: 4,
        }).addTo(map);
        L.circleMarker(last, {
          radius: 9,
          color: "#fff",
          weight: 3,
          fillColor: "#07524f",
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip("Last reported position");
      }
      for (const [point, name, color] of [
        [station, "Receiving petrol station", "#172f26"],
        [depot, "Loading depot", "#815118"],
        [selected, "Selected location", "#07524f"],
      ] as const) {
        if (!point) continue;
        const position = L.latLng(point.latitude, point.longitude);
        bounds.extend(position);
        L.circleMarker(position, {
          radius: 8,
          color: "#fff",
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(name);
      }
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [35, 35],
          maxZoom: 14,
        });
      }
    });
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [points, station, depot, selected]);
  return (
    <div className="route-map" ref={element} role="region" aria-label={label} />
  );
}
