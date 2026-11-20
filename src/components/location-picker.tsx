"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { Geo } from "@/lib/geo";
import { MapPin, Navigation } from "./icons";
import { Button } from "./ui/button";
const FieldMap = dynamic(() => import("./field-map"), {
  ssr: false,
  loading: () => (
    <div className="field-map compact field-map-placeholder" role="status">
      Loading map…
    </div>
  ),
});
export function LocationPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Geo | null;
  onChange: (point: Geo) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    latitude: string;
    longitude: string;
  } | null>(null);
  function locate() {
    setBusy(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Location is unavailable on this device.");
      setBusy(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onChange({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        });
        setBusy(false);
      },
      () => {
        setError(
          "Location access was unavailable. Choose a point on the map or enter coordinates.",
        );
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  return (
    <div className="location-picker">
      <div className="location-picker-heading">
        <span>
          <MapPin size={16} />
          {label}
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={locate}
          disabled={busy}
        >
          <Navigation size={14} />
          {busy ? "Locating…" : "Use my location"}
        </Button>
      </div>
      <FieldMap picker={{ value, onPick: onChange }} label={label} compact />
      <div className="location-coordinate-summary">
        {value ? (
          <output aria-label="Selected coordinates">
            {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
          </output>
        ) : (
          <p>Tap the map to place a pin.</p>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={!!coordinates}
          onClick={() => {
            setError("");
            setCoordinates(
              coordinates
                ? null
                : {
                    latitude: value?.latitude.toFixed(6) ?? "",
                    longitude: value?.longitude.toFixed(6) ?? "",
                  },
            );
          }}
        >
          {coordinates ? "Close coordinates" : "Enter coordinates"}
        </Button>
      </div>
      {coordinates && (
        <div className="location-coordinate-editor">
          <label>
            Latitude
            <input
              inputMode="decimal"
              value={coordinates.latitude}
              onChange={(e) =>
                setCoordinates({ ...coordinates, latitude: e.target.value })
              }
            />
          </label>
          <label>
            Longitude
            <input
              inputMode="decimal"
              value={coordinates.longitude}
              onChange={(e) =>
                setCoordinates({ ...coordinates, longitude: e.target.value })
              }
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const latitude = Number(coordinates.latitude.trim());
              const longitude = Number(coordinates.longitude.trim());
              if (
                !coordinates.latitude.trim() ||
                !coordinates.longitude.trim() ||
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude) ||
                Math.abs(latitude) > 90 ||
                Math.abs(longitude) > 180
              ) {
                setError(
                  "Enter latitude between −90 and 90, and longitude between −180 and 180.",
                );
                return;
              }
              onChange({ latitude, longitude });
              setError("");
              setCoordinates(null);
            }}
          >
            Use these coordinates
          </Button>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
