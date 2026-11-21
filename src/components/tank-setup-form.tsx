"use client";

import { useState } from "react";
import { command } from "@/lib/api";
import { parseChart } from "@/lib/calibration-chart";
import { FUEL_GRADE_OPTIONS } from "@/lib/fuel-grades";
import { CalibrationChartInput } from "./calibration-chart-input";
import { ActionForm, Field, Select } from "./forms";

export function TankSetupForm({
  stationId,
  onDone,
}: {
  stationId: string;
  onDone: () => void;
}) {
  const [chartText, setChartText] = useState("");
  const [source, setSource] = useState<File | null>(null);
  const [checkingFile, setCheckingFile] = useState(false);

  return (
    <ActionForm
      op="tank"
      base={{ station_id: stationId }}
      onDone={onDone}
      submit="Save calibrated tank"
      disabled={checkingFile}
      transform={(form) => {
        const chart = parseChart(chartText);
        const capacity = Number(form.get("capacity"));
        if (chart.some(({ liters }) => liters > capacity))
          throw new Error(
            "Calibration volumes must fit within the tank capacity.",
          );
        return { ...Object.fromEntries(form), chart };
      }}
      submitOnline={async (payload) => {
        if (!source) return command("tank", payload);
        const form = new FormData();
        form.append("setup", JSON.stringify(payload));
        form.append("source", source);
        const response = await fetch("/api/calibration-files", {
          method: "POST",
          body: form,
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(
            result.error ||
              "Could not save the tank and calibration file. Try again.",
          );
        }
      }}
    >
      <div className="form-grid">
        <Field
          label="Tank name"
          name="name"
          maxLength={100}
          placeholder="e.g. Petrol tank 01"
        />
        <Select label="Fuel grade" name="grade" options={FUEL_GRADE_OPTIONS} />
        <Field
          label="Capacity (litres)"
          name="capacity"
          type="number"
          min={1}
        />
      </div>
      <div className="notice">
        Starting stock is <strong>0 L</strong>. Deliveries and shift
        reconciliation record subsequent stock.
      </div>
      <CalibrationChartInput
        chartText={chartText}
        onChartText={setChartText}
        onSourceFile={setSource}
        onPendingChange={setCheckingFile}
      />
    </ActionForm>
  );
}
