"use client";
import { Fragment, useState } from "react";
import { number } from "@/lib/utils";
import {
  FUEL_GRADES,
  fuelGradeName,
  isFuelGrade,
  type FuelGrade,
} from "@/lib/fuel-grades";
import type { buildOverviewModel, OverviewPeriod } from "@/lib/overview-model";
import { Activity, ArrowUpRight } from "./icons";
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
  onDaysChange,
  privateMode,
  onOpen,
}: {
  model: Model;
  days: OverviewPeriod;
  onDaysChange: (period: OverviewPeriod) => void;
  privateMode: boolean;
  onOpen: (type: string, id?: string) => void;
}) {
  const [metric, setMetric] = useState<"liters" | "revenue">("liters");
  const [grade, setGrade] = useState<FuelGrade | "all">("all");
  const [selected, setSelected] = useState("");
  const series = grade === "all" ? model.days : model.gradeDays[grade];
  const selectedDay = series.find((d) => d.date === selected) || series.at(-1);
  const max = Math.max(1, ...series.map((d) => d[metric]));
  const total = series.reduce((sum, d) => sum + d[metric], 0);
  const observedShifts = series.reduce((sum, d) => sum + d.shiftIds.length, 0);
  const hidden = privateMode && metric === "revenue";
  const gaps = series.map((day, index) =>
    index === 0
      ? 0
      : (Date.parse(day.date) - Date.parse(series[index - 1].date)) /
          86_400_000 -
        1,
  );
  const chartWidth = Math.max(
    180,
    series.length * 50 + gaps.filter((gap) => gap > 0).length * 40,
  );
  return (
    <section
      className="overview-card overview-performance"
      aria-labelledby="performance-title"
    >
      <div className="overview-section-title">
        <div className="overview-panel-heading">
          <span className="overview-panel-icon">
            <Activity size={18} aria-hidden="true" />
          </span>
          <h2 id="performance-title">Shift sales</h2>
        </div>
        <div
          className="overview-segments"
          role="group"
          aria-label="Reporting period"
        >
          {([7, 30] as const).map((period) => (
            <button
              key={period}
              aria-pressed={days === period}
              onClick={() => onDaysChange(period)}
            >
              {period} days
            </button>
          ))}
        </div>
      </div>
      <div className="overview-sales-controls">
        {!hidden && series.length > 0 && (
          <div className="overview-chart-head">
            <div>
              <strong>
                {number(total, metric === "liters" ? 1 : 0)}
                <small>{metric === "liters" ? "L" : "PKR"}</small>
              </strong>
              <span>
                {observedShifts} closed{" "}
                {observedShifts === 1 ? "shift" : "shifts"}
              </span>
            </div>
          </div>
        )}
        <div className="overview-sales-filters">
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
          <div className="overview-chart-filter">
            <label htmlFor="overview-fuel-filter" className="sr-only">
              Fuel grade
            </label>
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
        </div>
      </div>
      {series.length > 0 && !hidden ? (
        <div className="overview-plot">
          <div className="overview-chart-frame">
            <div className="overview-chart-axis" aria-hidden="true">
              <span>{number(max)}</span>
              <span>{number(max / 2)}</span>
              <span>0</span>
            </div>
            <div
              key={`${days}:${grade}`}
              className="overview-chart-scroll"
              dir="rtl"
              role="region"
              aria-label={`${metric === "liters" ? "Litres" : "Revenue"} by recorded day`}
              tabIndex={0}
            >
              <div
                className="overview-bars"
                dir="ltr"
                style={{ minWidth: `${chartWidth}px` }}
              >
                <div className="overview-grid-lines" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                {series.map((d, index) => (
                  <Fragment key={d.date}>
                    {gaps[index] > 0 && (
                      <div className="overview-chart-gap">
                        <span aria-hidden="true">{gaps[index]}d</span>
                        <span className="sr-only">
                          {gaps[index]} {gaps[index] === 1 ? "day" : "days"}{" "}
                          without a record in this view
                        </span>
                      </div>
                    )}
                    <button
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
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
          {gaps.some((gap) => gap > 0) && (
            <p className="overview-plot-note">
              Dashed gaps mark days without records for this filter.
            </p>
          )}
        </div>
      ) : (
        <div className="overview-chart-empty">
          {hidden
            ? "Financial values are hidden in privacy mode."
            : grade === "all"
              ? `No closed shifts in the last ${days} days.`
              : "No sales recorded for this fuel grade in this period."}
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
