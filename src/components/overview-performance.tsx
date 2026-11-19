"use client";
import { useEffect, useRef, useState } from "react";
import { number } from "@/lib/utils";
import {
  FUEL_GRADES,
  fuelGradeName,
  isFuelGrade,
  type FuelGrade,
} from "@/lib/fuel-grades";
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
  const [grade, setGrade] = useState<FuelGrade | "all">("all");
  const [selected, setSelected] = useState("");
  const chartScroll = useRef<HTMLDivElement>(null);
  const series = grade === "all" ? model.days : model.gradeDays[grade];
  const selectedDay = series.find((d) => d.date === selected) || series.at(-1);
  const max = Math.max(1, ...series.map((d) => d[metric]));
  const total = series.reduce((sum, d) => sum + d[metric], 0);
  const observedShifts = series.reduce((sum, d) => sum + d.shiftIds.length, 0);
  const hidden = privateMode && metric === "revenue";
  useEffect(() => {
    const chart = chartScroll.current;
    if (!chart) return;
    const showLatest = () => {
      chart.scrollLeft = chart.scrollWidth;
    };
    showLatest();
    const observer = new ResizeObserver(showLatest);
    observer.observe(chart);
    return () => observer.disconnect();
  }, [days, grade, hidden, series.length]);
  return (
    <section
      className="overview-card overview-performance"
      aria-labelledby="performance-title"
    >
      <div className="overview-section-title">
        <div>
          <h2 id="performance-title">Shift sales</h2>
          <span className="overview-eyebrow">
            Last {days} days · Pakistan time
          </span>
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
      <div className="overview-chart-filter">
        <label htmlFor="overview-fuel-filter">Fuel grade</label>
        <select
          id="overview-fuel-filter"
          value={grade}
          onChange={(event) =>
            setGrade(
              isFuelGrade(event.target.value) ? event.target.value : "all",
            )
          }
        >
          <option value="all">All fuels</option>
          {FUEL_GRADES.map((value) => (
            <option key={value} value={value}>
              {fuelGradeName(value)}
            </option>
          ))}
        </select>
      </div>
      <div className="overview-chart-head">
        <div>
          <strong>
            {hidden
              ? "••••••"
              : series.length
                ? number(total, metric === "liters" ? 1 : 0)
                : "—"}
            <small>{metric === "liters" ? "L" : "PKR"}</small>
          </strong>
          <span>
            {series.length} recorded {series.length === 1 ? "day" : "days"} ·{" "}
            {observedShifts} closed {observedShifts === 1 ? "shift" : "shifts"}
          </span>
        </div>
        <span className="overview-chart-legend">
          <i />
          {metric === "liters" ? "Dispensed volume" : "Recorded revenue"}
        </span>
      </div>
      {series.length > 0 && !hidden ? (
        <div className="overview-chart-frame">
          <div className="overview-chart-axis" aria-hidden="true">
            <span>{number(max)}</span>
            <span>{number(max / 2)}</span>
            <span>0</span>
          </div>
          <div
            className="overview-chart-scroll"
            ref={chartScroll}
            role="region"
            aria-label={`${metric === "liters" ? "Litres" : "Revenue"} by recorded day`}
            tabIndex={0}
          >
            <div
              className="overview-bars"
              style={{ minWidth: `${Math.max(180, series.length * 48)}px` }}
            >
              <div className="overview-grid-lines" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              {series.map((d) => (
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
        </div>
      ) : (
        <div className="overview-chart-empty">
          {hidden
            ? "Financial values are hidden in privacy mode."
            : grade === "all"
              ? "No closed shifts in this period."
              : "No recorded sales for this fuel grade in this period."}
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
      {grade === "all" && model.periodShifts.length > 0 && !privateMode && (
        <details className="overview-data">
          <summary>Payment mix</summary>
          <OverviewPaymentMix totals={model.totals} privateMode={privateMode} />
        </details>
      )}
      {series.length > 0 && (
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
                {series.map((d) => (
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
      )}
    </section>
  );
}
