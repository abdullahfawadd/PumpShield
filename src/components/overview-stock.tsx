"use client";

import { useId, useState, type CSSProperties } from "react";
import { fuelGradeName } from "@/lib/fuel-grades";
import { getLatestTankReconciliation } from "@/lib/overview-model";
import type { Nozzle, Shift, Tank } from "@/lib/types";
import { date, number } from "@/lib/utils";
import { ArrowUpRight, Droplets } from "./icons";
import { Button } from "./ui/button";

const litres = (value: number) =>
  Number.isFinite(value) ? `${number(value, 1)} L` : "—";

export function OverviewStock({
  tanks,
  shifts,
  nozzles,
  onOpenShift,
  onStock,
}: {
  tanks: Tank[];
  shifts: Shift[];
  nozzles: Nozzle[];
  onOpenShift: (id: string) => void;
  onStock: (tankId?: string) => void;
}) {
  const [selected, setSelected] = useState<string>();
  const detailId = useId();
  const tank = tanks.find((item) => item.id === selected) ?? tanks[0];
  const latest = tank && getLatestTankReconciliation(shifts, tank.id);
  const attachedNozzles = tank
    ? nozzles.filter((item) => item.tank_id === tank.id)
    : [];
  const reading = latest?.reading;
  const variance = reading?.variance;
  const capacity = tanks.reduce((sum, item) => sum + item.capacity, 0);
  const stock = tanks.reduce((sum, item) => sum + item.stock, 0);
  const occupied = capacity > 0 ? (stock / capacity) * 100 : 0;
  const aggregateLevel = Math.max(0, Math.min(100, occupied));

  return (
    <section
      className="overview-card overview-stock"
      aria-labelledby="overview-stock-title"
    >
      <div className="overview-section-title">
        <div className="overview-panel-heading">
          <span className="overview-panel-icon">
            <Droplets size={17} aria-hidden="true" />
          </span>
          <h2 id="overview-stock-title">Tank stock</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onStock()}>
          View stock <ArrowUpRight size={15} />
        </Button>
      </div>
      {tank ? (
        <>
          <div className="overview-stock-total">
            <div>
              <strong>
                {number(stock, 1)} <small>L</small>
              </strong>
              <span> of {number(capacity)} L capacity</span>
            </div>
            {capacity > 0 && <b>{Math.round(occupied)}% full</b>}
            <div
              className="overview-capacity-meter"
              aria-hidden="true"
              style={{ "--fill": `${aggregateLevel}%` } as CSSProperties}
            />
          </div>
          <div
            className="overview-tank-picker"
            role="group"
            aria-label="Inspect a tank"
          >
            {tanks.map((item) => {
              const ratio = item.capacity > 0 ? item.stock / item.capacity : 0;
              const fill = Math.max(0, Math.min(100, ratio * 100));
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={tank.id === item.id}
                  aria-controls={detailId}
                  className={`overview-tank-card grade-${String(item.grade).toLowerCase()}`}
                  onClick={() => setSelected(item.id)}
                >
                  <span
                    className="overview-tank-gauge"
                    aria-hidden="true"
                    style={{ "--fill": `${fill}%` } as CSSProperties}
                  />
                  <span className="overview-tank-identity">
                    <strong>{item.name}</strong>
                    <small>{fuelGradeName(item.grade)}</small>
                  </span>
                  <span className="overview-tank-reading">
                    <strong>{litres(item.stock)}</strong>
                    <small>{Math.round(ratio * 100)}% full</small>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="overview-tank-source" id={detailId}>
            <div className="overview-tank-source-header">
              <div>
                <h3>{tank.name}</h3>
                {Number.isFinite(Date.parse(tank.updated_at)) && (
                  <span>Stock updated {date(tank.updated_at)}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStock(tank.id)}
              >
                Tank record <ArrowUpRight size={14} />
              </Button>
            </div>
            {latest && reading ? (
              <>
                <button
                  type="button"
                  className="overview-shift-source-link"
                  onClick={() => onOpenShift(latest.shift.id)}
                >
                  <span>
                    <small>Last shift close</small>
                    <strong>{latest.shift.name}</strong>
                  </span>
                  <span className="overview-shift-source-meta">
                    <small>{date(latest.shift.closed_at)}</small>
                    <small>
                      {latest.shift.status === "review"
                        ? "Awaiting review"
                        : "Verified"}
                    </small>
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
                <dl
                  className="overview-stock-reconciliation"
                  aria-label="Latest shift reconciliation"
                >
                  <div>
                    <dt>Dispensed</dt>
                    <dd>{litres(reading.sold)}</dd>
                  </div>
                  <div>
                    <dt>Expected</dt>
                    <dd>{litres(reading.expected)}</dd>
                  </div>
                  <div>
                    <dt>Closing dip</dt>
                    <dd>{litres(reading.actual)}</dd>
                  </div>
                  <div
                    className="overview-stock-variance"
                    data-difference={
                      variance != null &&
                      Number.isFinite(variance) &&
                      variance !== 0
                    }
                  >
                    <dt>Variance</dt>
                    <dd>
                      {variance == null
                        ? "—"
                        : `${variance > 0 ? "+" : ""}${litres(variance)}`}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="overview-footnote">
                No closing dip recorded for this tank.
              </p>
            )}
            {attachedNozzles.length > 0 && (
              <details className="overview-data overview-stock-nozzles">
                <summary>
                  {attachedNozzles.length} nozzle{" "}
                  {attachedNozzles.length === 1 ? "counter" : "counters"}
                </summary>
                <dl>
                  {attachedNozzles.map((nozzle) => (
                    <div key={nozzle.id}>
                      <dt>{nozzle.name}</dt>
                      <dd>{litres(nozzle.totalizer)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </div>
        </>
      ) : (
        <p className="overview-empty">No tanks configured for this station.</p>
      )}
    </section>
  );
}
