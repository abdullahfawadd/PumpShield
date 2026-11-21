"use client";

import { useId, useRef, useState } from "react";
import {
  CALIBRATION_CHART_ACCEPT,
  CALIBRATION_CHART_TEXT_BYTES,
  readCalibrationChartFile,
} from "@/lib/calibration-chart-file";
import { parseChart } from "@/lib/calibration-chart";
import { Button } from "./ui/button";

type Props = {
  chartText: string;
  onChartText: (text: string) => void;
  onSourceFile: (file: File | null) => void;
  onPendingChange?: (pending: boolean) => void;
};

export function CalibrationChartInput({
  chartText,
  onChartText,
  onSourceFile,
  onPendingChange,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const formatsId = useId();
  const selection = useRef(0);
  const [source, setSource] = useState<{
    name: string;
    imported: boolean;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState("");

  async function selectFile(file: File) {
    const current = ++selection.current;
    setError("");
    setPending(true);
    onPendingChange?.(true);
    try {
      const result = await readCalibrationChartFile(file);
      if (current !== selection.current || !input.current) return;
      setSource({ name: file.name, imported: result.chartText !== undefined });
      setReviewed(false);
      if (result.chartText !== undefined) onChartText(result.chartText);
      onSourceFile(
        new File([file], file.name, {
          type: result.contentType,
          lastModified: file.lastModified,
        }),
      );
    } catch (cause) {
      if (current !== selection.current || !input.current) return;
      input.current.value = "";
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not read the chart file.",
      );
    } finally {
      if (current === selection.current) {
        setPending(false);
        onPendingChange?.(false);
      }
    }
  }

  const points = (() => {
    try {
      return chartText ? parseChart(chartText).length : 0;
    } catch {
      return 0;
    }
  })();

  return (
    <>
      <label>
        Certified calibration chart file
        <input
          ref={input}
          type="file"
          accept={CALIBRATION_CHART_ACCEPT}
          aria-describedby={formatsId}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void selectFile(file);
          }}
        />
      </label>
      <p className="fine-print" id={formatsId}>
        PDF, JPG or PNG (up to 4 MB) are saved as reference. CSV, TSV or TXT (up
        to 100 KB) also import the calibration rows.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {pending && (
        <p className="fine-print" role="status">
          Checking chart file…
        </p>
      )}
      {source && (
        <div className="chamber-chart-preview">
          <p role="status">
            <strong>{source.name}</strong>{" "}
            {source.imported
              ? "selected. Check the imported rows against your chart."
              : "selected. Enter the certified depth and volume rows below."}
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (input.current) input.current.value = "";
              setSource(null);
              setReviewed(false);
              setError("");
              onSourceFile(null);
            }}
          >
            Remove file
          </Button>
        </div>
      )}
      <label>
        Calibration rows (millimetres, litres)
        <textarea
          value={chartText}
          onChange={(event) => {
            onChartText(event.currentTarget.value);
            setReviewed(false);
          }}
          rows={5}
          maxLength={CALIBRATION_CHART_TEXT_BYTES}
          placeholder={
            "mm,litres\nPaste or type one depth and volume pair per row"
          }
          required
        />
      </label>
      {points > 0 && (
        <p className="fine-print" role="status">
          {points.toLocaleString("en-PK")} chart points ready for review
        </p>
      )}
      {source && (
        <label className="inline-check">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(event) => setReviewed(event.currentTarget.checked)}
            required
          />
          I checked these rows against the certified chart.
        </label>
      )}
    </>
  );
}
