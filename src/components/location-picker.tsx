"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { Geo } from "@/lib/geo";
import { MapPin, Navigation } from "./icons";
import { Button } from "./ui/button";
const FieldMap = dynamic(() => import("./field-map"), { ssr: false });
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
          "Location access was not available. Choose the point on the map instead.",
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
      {value ? (
        <output>
          {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
        </output>
      ) : (
        <p>Pan and zoom, then tap to place the pin.</p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
