"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Map as MapType, Marker, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapPoint } from "./route-map";
import { bearing, interpolatePosition, type Geo } from "@/lib/geo";
import { Navigation, MapPin, RefreshCw } from "./icons";
const FlatMap = dynamic(() => import("./route-map"), { ssr: false });
type Point = MapPoint & { heading?: number | null; speed_ms?: number | null };
type Props = {
  points?: Point[];
  station?: Geo | null;
  depot?: Geo | null;
  label?: string;
  picker?: { value: Geo | null; onPick: (point: Geo) => void };
  compact?: boolean;
};
const EMPTY: Point[] = [];
export default function FieldMap({
  points = EMPTY,
  station,
  depot,
  label = "Delivery map",
  picker,
  compact = false,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<MapType | null>(null);
  const marker = useRef<Marker | null>(null);
  const pins = useRef<Marker[]>([]);
  const animation = useRef(0);
  const displayed = useRef<Geo | null>(null);
  const latest = useRef({ points, station, depot, picker });
  const [loaded, setLoaded] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [tilted, setTilted] = useState(!picker);
  const [follow, setFollow] = useState(true);
  const [terrain, setTerrain] = useState(false);
  useEffect(() => {
    latest.current = { points, station, depot, picker };
  }, [points, station, depot, picker]);
  useEffect(() => {
    let disposed = false;
    let current: MapType | undefined;
    const timeout = setTimeout(() => {
      if (!disposed && !current?.isStyleLoaded()) setFallback(true);
    }, 20000);
    void import("maplibre-gl")
      .then((M) => {
        if (disposed || !host.current) return;
        try {
          M.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
          const initial = latest.current.picker?.value ||
            latest.current.points.at(-1) ||
            latest.current.station || { latitude: 24.86, longitude: 67.03 };
          current = new M.Map({
            container: host.current,
            style: process.env.NEXT_PUBLIC_MAPTILER_KEY
              ? `https://api.maptiler.com/maps/hybrid/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY}`
              : "https://tiles.openfreemap.org/styles/dark",
            center: [initial.longitude, initial.latitude],
            zoom: 12,
            pitch: latest.current.picker ? 0 : 48,
            bearing: latest.current.picker ? 0 : -16,
            attributionControl: { compact: true },
            maxPitch: 65,
          });
          map.current = current;
          current.addControl(
            new M.NavigationControl({ showCompass: true }),
            "top-right",
          );
          current.addControl(
            new M.ScaleControl({ unit: "metric" }),
            "bottom-left",
          );
          current.on("dragstart", () => setFollow(false));
          current.on("click", (event) =>
            latest.current.picker?.onPick({
              latitude: Number(event.lngLat.lat.toFixed(6)),
              longitude: Number(event.lngLat.lng.toFixed(6)),
            }),
          );
          current.on("load", () => {
            if (disposed || !current) return;
            current.addSource("ps-trail", {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            });
            current.addLayer({
              id: "ps-trail-glow",
              type: "line",
              source: "ps-trail",
              paint: {
                "line-color": "#77b7ff",
                "line-width": 10,
                "line-opacity": 0.15,
                "line-blur": 3,
              },
            });
            current.addLayer({
              id: "ps-trail-line",
              type: "line",
              source: "ps-trail",
              layout: { "line-cap": "round", "line-join": "round" },
              paint: {
                "line-color": "#e9f5ff",
                "line-width": 3,
                "line-opacity": 0.95,
              },
            });
            current.addSource("ps-elevation", {
              type: "raster-dem",
              tiles: [
                "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              maxzoom: 15,
              encoding: "terrarium",
              attribution:
                'Terrain © <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Mapzen / data contributors</a>',
            });
            const coordinates = [
              ...latest.current.points,
              ...[latest.current.station, latest.current.depot].filter(
                (p): p is Geo => !!p,
              ),
            ];
            if (coordinates.length > 1) {
              const bounds = new M.LngLatBounds();
              coordinates.forEach((p) =>
                bounds.extend([p.longitude, p.latitude]),
              );
              current.fitBounds(bounds, {
                padding: compact ? 38 : 65,
                maxZoom: 14,
                duration: 0,
              });
            }
            setLoaded(true);
          });
          current.on("webglcontextlost", () => {
            if (!disposed) setFallback(true);
          });
        } catch {
          setFallback(true);
        }
      })
      .catch(() => setFallback(true));
    return () => {
      disposed = true;
      clearTimeout(timeout);
      cancelAnimationFrame(animation.current);
      marker.current?.remove();
      pins.current.forEach((p) => p.remove());
      current?.remove();
      map.current = null;
    };
  }, [compact]);
  useEffect(() => {
    const m = map.current;
    if (!loaded || !m || fallback) return;
    let cancelled = false;
    void import("maplibre-gl").then((M) => {
      if (cancelled) return;
      pins.current.forEach((p) => p.remove());
      pins.current = [];
      for (const [point, kind] of [
        [station, "station"],
        [depot, "depot"],
        [picker?.value, "selected"],
      ] as const) {
        if (!point) continue;
        const el = document.createElement("span");
        el.className = `field-map-pin pin-${kind}`;
        el.textContent = kind === "depot" ? "D" : "P";
        el.setAttribute(
          "aria-label",
          kind === "selected"
            ? "Selected location"
            : kind === "station"
              ? "Station"
              : "Loading depot",
        );
        const pin = new M.Marker({ element: el })
          .setLngLat([point.longitude, point.latitude])
          .setPopup(
            new M.Popup({ offset: 20 }).setText(
              kind === "depot"
                ? "Loading depot"
                : kind === "station"
                  ? "Receiving petrol station"
                  : "Selected location",
            ),
          )
          .addTo(m);
        pins.current.push(pin);
      }
      const valid = points.filter(
        (p) => Number.isFinite(p.longitude) && Number.isFinite(p.latitude),
      );
      (m.getSource("ps-trail") as GeoJSONSource)?.setData({
        type: "FeatureCollection",
        features:
          valid.length > 1
            ? [
                {
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "LineString",
                    coordinates: valid.map((p) => [p.longitude, p.latitude]),
                  },
                },
              ]
            : [],
      });
      const last = valid.at(-1);
      if (!last) {
        if (picker?.value)
          m.easeTo({
            center: [picker.value.longitude, picker.value.latitude],
            duration: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? 0
              : 400,
          });
        marker.current?.remove();
        marker.current = null;
        displayed.current = null;
        return;
      }
      const previous = valid.at(-2);
      const rotation = last.heading ?? (previous ? bearing(previous, last) : 0);
      if (!marker.current) {
        const el = document.createElement("div");
        el.className = "field-truck-marker";
        const img = document.createElement("img");
        img.src = "/brand/truck-marker.svg";
        img.alt = "Last reported tanker position";
        img.width = 34;
        img.height = 58;
        el.appendChild(img);
        marker.current = new M.Marker({
          element: el,
          rotationAlignment: "map",
          pitchAlignment: "map",
        })
          .setLngLat([last.longitude, last.latitude])
          .addTo(m);
      }
      marker.current
        .getElement()
        .classList.toggle(
          "signal-stale",
          !!last.received_at &&
            Date.now() - Date.parse(last.received_at) > 90000,
        );
      marker.current.setRotation(rotation);
      cancelAnimationFrame(animation.current);
      const from = displayed.current || last;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const started = performance.now();
      const animate = (time: number) => {
        if (cancelled) return;
        const t = reduced ? 1 : Math.min(1, (time - started) / 1200);
        const p = interpolatePosition(from, last, t);
        marker.current?.setLngLat([p.longitude, p.latitude]);
        displayed.current = p;
        if (t < 1) animation.current = requestAnimationFrame(animate);
      };
      animation.current = requestAnimationFrame(animate);
      if (follow)
        m.easeTo({
          center: [last.longitude, last.latitude],
          duration: reduced ? 0 : 900,
        });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(animation.current);
    };
  }, [loaded, points, station, depot, picker, follow, fallback]);
  useEffect(() => {
    if (!loaded || !map.current) return;
    map.current.easeTo({
      pitch: tilted ? 48 : 0,
      bearing: tilted ? -16 : 0,
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 600,
    });
  }, [tilted, loaded]);
  useEffect(() => {
    if (loaded && map.current)
      map.current.setTerrain(
        terrain ? { source: "ps-elevation", exaggeration: 1 } : null,
      );
  }, [terrain, loaded]);
  return (
    <section
      className={`field-map ${compact ? "compact" : ""} ${picker ? "is-picker" : ""}`}
      aria-label={label}
    >
      <div ref={host} className="field-map-surface" />
      {fallback ? (
        <div className="field-flat-fallback">
          <FlatMap
            points={picker?.value ? [picker.value] : points}
            label={label}
            onPick={picker?.onPick}
          />
          <p>3D unavailable on this device. Showing the standard map.</p>
        </div>
      ) : (
        <>
          <div className="field-map-label">
            <span className="map-signal-dot" />
            {picker ? "SELECT A LOCATION" : "REPORTED DELIVERY TRAIL"}
          </div>
          <div className="field-map-actions">
            <button
              type="button"
              onClick={() => setTilted(!tilted)}
              aria-pressed={tilted}
              disabled={!loaded}
            >
              {tilted ? "2D" : "3D"}
            </button>
            <button
              type="button"
              onClick={() => setTerrain(!terrain)}
              aria-pressed={terrain}
              disabled={!loaded}
            >
              Terrain
            </button>
            {!picker && (
              <button
                type="button"
                aria-label="Follow last reported position"
                aria-pressed={follow}
                onClick={() => setFollow(true)}
              >
                <Navigation size={17} />
              </button>
            )}
          </div>
          {!loaded && (
            <span className="map-loading-label" role="status">
              <RefreshCw className="spin" size={16} />
              Loading map…
            </span>
          )}
          {picker && (
            <span className="map-pick-hint">
              <MapPin size={15} />
              Tap the exact location on the map
            </span>
          )}
        </>
      )}
    </section>
  );
}
