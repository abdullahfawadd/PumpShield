"use client";
import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Geo } from "@/lib/geo";
export default function RouteMap({
  points,
  station,
  depot,
  selected,
  label = "Reported contractor locations",
  onPick,
  expanded,
}: {
  points: Geo[];
  station?: Geo | null;
  depot?: Geo | null;
  selected?: Geo | null;
  label?: string;
  onPick?: (point: Geo) => void;
  expanded: boolean;
}) {
  const element = useRef<HTMLDivElement>(null);
  const pick = useRef(onPick);
  const engine = useRef<{
    library: typeof import("leaflet");
    map: LeafletMap;
    overlays: LayerGroup;
  } | null>(null);
  const fitted = useRef(false);
  const hasFramedReport = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);
  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | undefined;
    let resizeObserver: ResizeObserver | undefined;
    void import("leaflet")
      .then((L) => {
        if (disposed || !element.current) return;
        map = L.map(element.current, {
          scrollWheelZoom: false,
          zoomControl: false,
          dragging: !matchMedia("(pointer: coarse)").matches,
        }).setView([24.88, 67.03], 11);
        L.control.zoom({ position: "topright" }).addTo(map);
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
        const overlays = L.layerGroup().addTo(map);
        engine.current = { library: L, map, overlays };
        resizeObserver = new ResizeObserver(() =>
          map?.invalidateSize({ pan: false, debounceMoveend: true }),
        );
        resizeObserver.observe(element.current);
        setStatus("ready");
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      map?.remove();
      engine.current = null;
      fitted.current = false;
      hasFramedReport.current = false;
    };
  }, []);

  useEffect(() => {
    const current = engine.current;
    if (
      status !== "ready" ||
      !current ||
      !matchMedia("(pointer: coarse)").matches
    )
      return;
    if (expanded) current.map.dragging.enable();
    else current.map.dragging.disable();
  }, [expanded, status]);

  useEffect(() => {
    const current = engine.current;
    if (status !== "ready" || !current) return;
    const { library: L, map, overlays } = current;
    // GPS updates replace the route layers without resetting the user's view.
    overlays.clearLayers();
    const coords = points
      .filter(
        (point) =>
          Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
      )
      .map((point) => [point.latitude, point.longitude] as [number, number]);
    const bounds = L.latLngBounds(coords);
    const last = coords.at(-1);
    if (last) {
      L.polyline(coords, { color: "#fff", weight: 8 }).addTo(overlays);
      L.polyline(coords, {
        color: "#07524f",
        weight: 4,
      }).addTo(overlays);
      L.circleMarker(last, {
        radius: 9,
        color: "#fff",
        weight: 3,
        fillColor: "#07524f",
        fillOpacity: 1,
      })
        .addTo(overlays)
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
        .addTo(overlays)
        .bindTooltip(name);
    }
    if (
      bounds.isValid() &&
      (!fitted.current || (last && !hasFramedReport.current))
    ) {
      map.fitBounds(bounds, {
        padding: [35, 35],
        maxZoom: 14,
      });
      fitted.current = true;
      hasFramedReport.current = Boolean(last);
    } else if (selected) {
      map.panTo([selected.latitude, selected.longitude], { animate: false });
    }
  }, [points, station, depot, selected, status]);
  return (
    <div className="route-map" ref={element} role="region" aria-label={label}>
      {status === "error" && (
        <p className="map-loading-label" role="status">
          Street map unavailable
        </p>
      )}
    </div>
  );
}
