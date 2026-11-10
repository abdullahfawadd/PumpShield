"use client";
import { useState } from "react";
import { number } from "@/lib/utils";
import type { buildOverviewModel } from "@/lib/overview-model";
import { ArrowUpRight } from "./icons";
import { OverviewPaymentMix } from "./overview-payment-mix";

type Model = ReturnType<typeof buildOverviewModel>;
const dayLabel = (value: string) =>
  new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00+05:00`));
export function ShiftPerformance({
  model,
  days,
  privateMode,
  onOpen,
}: {
  model: Model;
  days: number;
  privateMode: boolean;
  onOpen: (type: string, id?: string) => void;
}) {
  const [metric, setMetric] = useState<"liters" | "revenue">("liters");
  const [selected, setSelected] = useState("");
  const selectedDay =
    model.days.find((d) => d.date === selected) || model.days.at(-1);
  const max = Math.max(1, ...model.days.map((d) => d[metric]));
  const hidden = privateMode && metric === "revenue";
  return (
    <section
      className="overview-card overview-performance"
      aria-labelledby="performance-title"
    >
      <div className="overview-section-title">
        <div>
          <span className="overview-eyebrow">Last {days} days</span>
          <h2 id="performance-title">Shift performance</h2>
        </div>
        <div
          className="overview-segments"
          role="group"
          aria-label="Chart measure"
        >
          <button
            aria-pressed={metric === "liters"}
            onClick={() => setMetric("liters")}
          >
            Litres
          </button>
          <button
            aria-pressed={metric === "revenue"}
            onClick={() => setMetric("revenue")}
          >
            Revenue
          </button>
        </div>
      </div>
      <div className="overview-chart-head">
        <div>
          <strong>
            {hidden
              ? "••••••"
              : number(model.totals[metric], metric === "liters" ? 1 : 0)}
            <small>{metric === "liters" ? "L" : "PKR"}</small>
          </strong>
          <span>
            {model.days.length} recorded days · {model.periodShifts.length}{" "}
            closed shifts
          </span>
        </div>
        <span className="overview-chart-legend">
          <i />
          {metric === "liters" ? "Dispensed volume" : "Recorded revenue"}
        </span>
      </div>
      {model.days.length && !hidden ? (
        <div
          className="overview-chart-scroll"
          role="region"
          aria-label={`${metric === "liters" ? "Litres" : "Revenue"} by recorded day`}
          tabIndex={0}
        >
          <div
            className="overview-bars"
            style={{ minWidth: `${Math.max(220, model.days.length * 44)}px` }}
          >
            <div className="overview-grid-lines" aria-hidden="true">
              <span>{number(max, 0)}</span>
              <span>{number(max / 2, 0)}</span>
              <span>0</span>
            </div>
            {model.days.map((d) => (
              <button
                key={d.date}
                className="overview-chart-day"
                aria-pressed={selectedDay?.date === d.date}
                aria-label={`${dayLabel(d.date)}: ${number(d[metric], 1)} ${metric === "liters" ? "litres" : "PKR"}, ${d.shiftIds.length} shifts. Show records.`}
                onClick={() => setSelected(d.date)}
              >
                <span className="overview-bar-track">
                  <span
                    style={{
                      height: `${Math.max(d[metric] > 0 ? 2 : 0, (d[metric] / max) * 100)}%`,
                    }}
                  />
                </span>
                <small>{dayLabel(d.date)}</small>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="overview-chart-empty">
          {hidden
            ? "Financial values are hidden in privacy mode."
            : "No closed shifts recorded in this period."}
        </div>
      )}
      {selectedDay && !hidden && (
        <div className="overview-chart-selection" aria-live="polite">
          <span>
            <strong>{dayLabel(selectedDay.date)}</strong> ·{" "}
            {number(selectedDay[metric], 1)} {metric === "liters" ? "L" : "PKR"}
          </span>
          <div>
            {selectedDay.shiftIds.map((id) => (
              <button key={id} onClick={() => onOpen("shift_detail", id)}>
                {model.periodShifts.find((s) => s.id === id)?.name ||
                  "View shift"}
                <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        </div>
      )}
      <OverviewPaymentMix totals={model.totals} privateMode={privateMode} />
      <details className="overview-data">
        <summary>View daily data</summary>
        <div
          className="table-scroll"
          role="region"
          aria-label="Daily shift totals"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Litres</th>
                <th>Revenue PKR</th>
                <th>Shifts</th>
              </tr>
            </thead>
            <tbody>
              {model.days.map((d) => (
                <tr key={d.date}>
                  <td>{dayLabel(d.date)}</td>
                  <td>{number(d.liters, 1)}</td>
                  <td>{privateMode ? "••••" : number(d.revenue)}</td>
                  <td>{d.shiftIds.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
