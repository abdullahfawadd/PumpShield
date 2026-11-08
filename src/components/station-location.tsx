"use client";
import { useState } from "react";
import type { Station } from "@/lib/types";
import type { Geo } from "@/lib/geo";
import { field } from "@/lib/field-api";
import { LocationPicker } from "./location-picker";
import { Button } from "./ui/button";
import { toast } from "sonner";
export function StationLocation({
  station,
  onSaved,
}: {
  station: Station;
  onSaved: () => void;
}) {
  const [point, setPoint] = useState<Geo | null>(
    station.latitude != null && station.longitude != null
      ? {
          latitude: Number(station.latitude),
          longitude: Number(station.longitude),
        }
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="panel station-location-panel">
      <div className="panel-heading">
        <div>
          <h2>Station location</h2>
          <p>
            Place the receiving pin once. Driver tracking uses this destination.
          </p>
        </div>
      </div>
      <div className="station-location-body">
        <LocationPicker
          label="Receiving petrol station"
          value={point}
          onChange={setPoint}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button
          disabled={!point || busy}
          onClick={async () => {
            if (!point) return;
            setBusy(true);
            setError("");
            try {
              await field("station_position", {
                station_id: station.id,
                ...point,
                radius_m: station.geofence_m || 500,
              });
              toast.success("Station location saved");
              onSaved();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Unable to save location",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Save station location"}
        </Button>
      </div>
    </section>
  );
}
