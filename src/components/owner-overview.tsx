"use client";
import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import type { Dashboard, Delivery, Shift, Tank, Station } from "@/lib/types";
import { date, money, number } from "@/lib/utils";
import { fuelGradeLabel } from "@/lib/fuel-grades";
import {
  buildOverviewModel,
  defaultOverviewLayout,
  moveOverviewWidget,
  parseOverviewLayout,
  setOverviewWidgetVisible,
  type OverviewLayout,
  type OverviewWidget,
} from "@/lib/overview-model";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Droplets,
  Settings2,
  Truck,
  WalletCards,
} from "./icons";
import { Button } from "./ui/button";
import { ReceivingFocus } from "./receiving-focus";
import { ShiftPerformance } from "./overview-performance";
import { Button as AstryxButton } from "@astryxdesign/core/Button";

const widgetNames: Record<OverviewWidget, string> = {
  performance: "Shift performance",
  stock: "Tank levels",
  deliveries: "Delivery pipeline",
  activity: "Recent activity",
};
const eventNames: Record<string, string> = {
  delivery: "Delivery registered",
  submit_delivery: "Arrival audit submitted",
  approve_delivery: "Delivery approved",
  decant: "Stock received",
  open_shift: "Shift opened",
  close_shift: "Shift submitted",
  review_shift: "Shift verified",
  parchi: "Credit fill recorded",
  payment: "Payment recorded",
  account: "Account created",
  vehicle: "Vehicle authorized",
  price: "Price recorded",
  invite: "Staff invitation issued",
  station: "Station added",
  tank: "Tank configured",
  nozzle: "Nozzle configured",
  work_item_create: "Work item created",
  work_item_transition: "Work item progressed",
  work_item_comment: "Work item note added",
  create_gatepass: "Driver sharing link issued",
  station_position: "Station location updated",
  offline_parchi: "Offline fill posted",
  offline_arrival: "Offline arrival audit posted",
  offline_shift: "Offline shift posted",
  accept_invite: "Staff invitation accepted",
  decline_invite: "Staff invitation declined",
  create_workspace: "Workspace created",
};
const storageEvent = "pumpshield:overview-layout";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(storageEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(storageEvent, listener);
  };
}
const serverLayout = () => "";

export function OwnerOverview({
  data,
  deliveries,
  shifts,
  tanks,
  station,
  privateMode,
  loadedAt,
  onOpen,
  onStock,
}: {
  data: Dashboard;
  deliveries: Delivery[];
  shifts: Shift[];
  tanks: Tank[];
  station?: Station;
  privateMode: boolean;
  loadedAt: number;
  onOpen: (type: string, id?: string) => void;
  onStock: () => void;
}) {
  const [days, setDays] = useState<7 | 30>(7);
  const [inspectedTank, setInspectedTank] = useState("");
  const [stage, setStage] = useState<Delivery["status"] | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [sessionLayout, setSessionLayout] = useState<{
    key: string;
    layout: OverviewLayout;
  } | null>(null);
  const [layoutNote, setLayoutNote] = useState("");
  const storageKey = `pumpshield:overview:1:${data.member?.workspace_id}:${station?.id}:${data.member?.user_id}`;
  const getLayout = useCallback(() => {
    try {
      return localStorage.getItem(storageKey) || "";
    } catch {
      return "";
    }
  }, [storageKey]);
  const stored = useSyncExternalStore(subscribe, getLayout, serverLayout);
  const savedLayout = useMemo(() => parseOverviewLayout(stored), [stored]);
  const layout =
    sessionLayout?.key === storageKey ? sessionLayout.layout : savedLayout;
  function saveLayout(next: OverviewLayout) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSessionLayout(null);
      setLayoutNote("Saved on this browser.");
      window.dispatchEvent(new Event(storageEvent));
    } catch {
      setSessionLayout({ key: storageKey, layout: next });
      setLayoutNote("Saved for this session. Browser storage is unavailable.");
    }
  }
  const model = useMemo(
    () => buildOverviewModel({ shifts, deliveries, days, now: loadedAt }),
    [shifts, deliveries, days, loadedAt],
  );
  const active = deliveries.filter((d) => d.status !== "decanted");
  const reviewDeliveries = model.review.deliveries.slice(
    0,
    showAllReviews ? undefined : 4,
  );
  const reviewShifts = model.review.shifts.slice(
    0,
    showAllReviews ? undefined : Math.max(0, 4 - reviewDeliveries.length),
  );
  const listed = stage ? deliveries.filter((d) => d.status === stage) : active;
  const reference = (id: string) =>
    data.deliveries.find((r) => r.id === id)?.reference ||
    data.shifts.find((r) => r.id === id)?.name ||
    data.accounts.find((r) => r.id === id)?.name ||
    "";
  const totalCapacity = tanks.reduce((sum, t) => sum + t.capacity, 0);
  const totalStock = tanks.reduce((sum, t) => sum + t.stock, 0);
  return (
    <div className="overview-studio">
      <div className="overview-toolbar">
        <div className="overview-live">
          <i aria-hidden="true" />
          Station snapshot{" "}
          <span>
            ·{" "}
            {new Intl.DateTimeFormat("en-PK", {
              timeZone: "Asia/Karachi",
              hour: "2-digit",
              minute: "2-digit",
            }).format(loadedAt)}
          </span>
        </div>
        <div className="overview-tools">
          <div
            className="overview-segments"
            role="group"
            aria-label="Reporting period"
          >
            {([7, 30] as const).map((n) => (
              <AstryxButton
                label={`${n} days`}
                variant={days === n ? "primary" : "secondary"}
                key={n}
                aria-pressed={days === n}
                onClick={() => setDays(n)}
              />
            ))}
          </div>
          <details className="overview-customize">
            <summary>
              <Settings2 size={17} />
              Customize
            </summary>
            <div className="overview-customizer">
              <strong>Your overview</strong>
              <p>Choose and reorder panels. Reviews always stay visible.</p>
              {layout.order.map((id, index) => (
                <div className="overview-widget-option" key={id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!layout.hidden.includes(id)}
                      onChange={(e) =>
                        saveLayout(
                          setOverviewWidgetVisible(
                            layout,
                            id,
                            e.target.checked,
                          ),
                        )
                      }
                    />
                    {widgetNames[id]}
                  </label>
                  <button
                    aria-label={`Move ${widgetNames[id]} up`}
                    disabled={index === 0}
                    onClick={() =>
                      saveLayout(moveOverviewWidget(layout, id, -1))
                    }
                  >
                    ↑
                  </button>
                  <button
                    aria-label={`Move ${widgetNames[id]} down`}
                    disabled={index === layout.order.length - 1}
                    onClick={() =>
                      saveLayout(moveOverviewWidget(layout, id, 1))
                    }
                  >
                    ↓
                  </button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => saveLayout(defaultOverviewLayout())}
              >
                Reset layout
              </Button>
              <p className="overview-save-note" role="status">
                {layoutNote ||
                  "Layout preferences only; no station data is stored here."}
              </p>
            </div>
          </details>
        </div>
      </div>
      <div className="overview-kpis">
        <div className="overview-kpi overview-kpi-feature">
          <span>
            <Droplets size={18} />
            Fuel dispensed
          </span>
          <strong>
            {number(model.totals.liters, 1)}
            <small>L</small>
          </strong>
          <footer>
            <span>{model.periodShifts.length} closed shifts</span>
            <span>Last {days} days</span>
          </footer>
        </div>
        <div className="overview-kpi">
          <span>
            <WalletCards size={18} />
            Recorded revenue
          </span>
          <strong>
            {privateMode ? "••••••" : number(model.totals.revenue)}
            <small>PKR</small>
          </strong>
          <footer>From submitted shift readings</footer>
        </div>
        <div className="overview-kpi overview-kpi-review">
          <span>
            <Clock3 size={18} />
            Awaiting review
          </span>
          <strong>
            {model.review.count}
            <small>records</small>
          </strong>
          <footer>
            {model.review.deliveries.length} arrival audits ·{" "}
            {model.review.shifts.length} shifts
          </footer>
        </div>
      </div>
      {model.excludedInvalidRecords > 0 && (
        <p className="overview-warning" role="status">
          {model.excludedInvalidRecords} invalid legacy shift records excluded.
          Verify the source records before reporting.
        </p>
      )}
      <section className="overview-review" aria-labelledby="overview-reviews">
        <div className="overview-section-title">
          <h2 id="overview-reviews">Review queue</h2>
          <span
            className={`overview-count ${model.review.count ? "has-reviews" : ""}`}
          >
            {model.review.count
              ? `${model.review.count} pending`
              : "Up to date"}
          </span>
        </div>
        {!model.review.count ? (
          <p className="overview-clear">
            <Check size={18} />
            All arrival audits and submitted shifts have been reviewed.
          </p>
        ) : (
          <div className="overview-review-list">
            {reviewDeliveries.map((d) => (
              <button
                key={d.id}
                className="overview-review-item"
                onClick={() => onOpen("delivery_detail", d.id)}
              >
                <span className="overview-review-icon">
                  <Truck size={20} />
                </span>
                <span>
                  <small>Arrival audit</small>
                  <strong>
                    {d.vehicle} · {d.reference}
                  </strong>
                  <span>
                    {d.shortage == null
                      ? "Measurements and evidence ready"
                      : `${number(d.shortage, 1)} L unexplained shortage`}
                  </span>
                </span>
                <ArrowUpRight size={18} />
              </button>
            ))}
            {reviewShifts.map((s) => (
              <button
                key={s.id}
                className="overview-review-item"
                onClick={() => onOpen("shift_detail", s.id)}
              >
                <span className="overview-review-icon">
                  <Clock3 size={20} />
                </span>
                <span>
                  <small>Shift reconciliation</small>
                  <strong>{s.name}</strong>
                  <span>
                    {s.result
                      ? `${privateMode ? "••••••" : money(s.result.cash_variance)} cash variance`
                      : "Readings and evidence ready"}
                  </span>
                </span>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
        )}
        {model.review.count > 4 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllReviews((value) => !value)}
          >
            {showAllReviews
              ? "Show fewer reviews"
              : `Show all ${model.review.count} reviews`}
          </Button>
        )}
      </section>
      <div className="overview-widget-grid">
        {layout.order
          .filter((id) => !layout.hidden.includes(id))
          .map((id) => {
            if (id === "performance")
              return (
                <ShiftPerformance
                  key={id}
                  model={model}
                  days={days}
                  privateMode={privateMode}
                  onOpen={onOpen}
                />
              );
            if (id === "stock")
              return (
                <section
                  className="overview-card overview-stock"
                  key={id}
                  aria-labelledby="overview-stock-title"
                >
                  <div className="overview-section-title">
                    <div>
                      <span className="overview-eyebrow">Inventory</span>
                      <h2 id="overview-stock-title">Tank levels</h2>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onStock}>
                      View stock <ArrowUpRight size={15} />
                    </Button>
                  </div>
                  <div className="overview-stock-total">
                    <strong>
                      {number(totalStock, 1)}
                      <small>L</small>
                    </strong>
                    <span>of {number(totalCapacity)} L capacity</span>
                  </div>
                  <div className="overview-tanks">
                    {tanks.map((t) => {
                      const percent =
                        t.capacity > 0
                          ? Math.max(
                              0,
                              Math.min(100, (t.stock / t.capacity) * 100),
                            )
                          : 0;
                      return (
                        <div className="overview-tank" key={t.id}>
                          <button
                            className="overview-tank-vessel"
                            style={{ "--fill": `${percent}%` } as CSSProperties}
                            aria-label={`Inspect ${t.name}: ${Math.round(percent)} percent recorded stock`}
                            aria-pressed={inspectedTank === t.id}
                            onClick={() =>
                              setInspectedTank(
                                inspectedTank === t.id ? "" : t.id,
                              )
                            }
                          >
                            <div />
                            <span>{Math.round(percent)}%</span>
                          </button>
                          <div>
                            <span className="overview-grade">
                              {fuelGradeLabel(t.grade)}
                            </span>
                            <strong>{t.name}</strong>
                            <span className="overview-tank-value">
                              {number(t.stock, 1)}{" "}
                              <small>/ {number(t.capacity)} L</small>
                            </span>
                            <meter
                              min={0}
                              max={Math.max(t.capacity, 1)}
                              value={Math.max(0, Math.min(t.stock, t.capacity))}
                              aria-label={`${t.name} recorded stock`}
                            />
                            <time>Updated {date(t.updated_at)}</time>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {inspectedTank &&
                    tanks.some((t) => t.id === inspectedTank) && (
                      <div
                        className="overview-nozzle-detail"
                        aria-live="polite"
                      >
                        <h3>
                          {tanks.find((t) => t.id === inspectedTank)?.name} ·
                          connected nozzles
                        </h3>
                        <div>
                          {data.nozzles
                            .filter((n) => n.tank_id === inspectedTank)
                            .map((n) => (
                              <span key={n.id}>
                                <strong>{n.name}</strong>
                                <small>Saved totalizer</small>
                                <b>{number(n.totalizer, 1)} L</b>
                              </span>
                            ))}
                        </div>
                        {!data.nozzles.some(
                          (n) => n.tank_id === inspectedTank,
                        ) && <p>No nozzles configured for this tank.</p>}
                        <p>
                          Saved counters, without a live hardware connection.
                        </p>
                      </div>
                    )}
                  {!tanks.length && (
                    <p className="muted">
                      No tanks configured for this station.
                    </p>
                  )}
                  <p className="overview-footnote">
                    Recorded ledger stock. Confirm physical levels with a
                    verified dip.
                  </p>
                </section>
              );
            if (id === "deliveries")
              return (
                <section
                  className="overview-card overview-pipeline"
                  key={id}
                  aria-labelledby="overview-deliveries-title"
                >
                  <div className="overview-section-title">
                    <div>
                      <span className="overview-eyebrow">Receiving</span>
                      <h2 id="overview-deliveries-title">Delivery pipeline</h2>
                    </div>
                    <span className="subtle-pill">{active.length} active</span>
                  </div>
                  <div
                    className="overview-pipeline-stages"
                    role="group"
                    aria-label="Filter deliveries by stage"
                  >
                    {model.stages.map((s, i) => (
                      <button
                        key={s.status}
                        aria-pressed={stage === s.status}
                        onClick={() =>
                          setStage(stage === s.status ? null : s.status)
                        }
                      >
                        <span className="overview-stage-line" />
                        <small>
                          {String(i + 1).padStart(2, "0")} · {s.label}
                        </small>
                        <strong>{s.count}</strong>
                      </button>
                    ))}
                  </div>
                  <ReceivingFocus
                    deliveries={listed}
                    station={station}
                    onOpen={onOpen}
                  />
                  <p className="overview-footnote">
                    Stage counts cover the loaded delivery register.
                  </p>
                </section>
              );
            return (
              <section
                className="overview-card overview-activity"
                key={id}
                aria-labelledby="overview-activity-title"
              >
                <div className="overview-section-title">
                  <div>
                    <span className="overview-eyebrow">Audit log</span>
                    <h2 id="overview-activity-title">Workspace activity</h2>
                  </div>
                  <Clock3 size={19} />
                </div>
                <ol>
                  {data.events.slice(0, 5).map((e) => (
                    <li key={e.id}>
                      <span className="overview-event-dot" aria-hidden="true" />
                      <div>
                        <strong>
                          {eventNames[e.action] || "Station record updated"}
                        </strong>
                        {reference(e.subject_id) && (
                          <span>{reference(e.subject_id)}</span>
                        )}
                        <time>{date(e.created_at)}</time>
                      </div>
                    </li>
                  ))}
                </ol>
                {!data.events.length && (
                  <p className="overview-empty">No saved activity yet.</p>
                )}
              </section>
            );
          })}
      </div>
      <p className="overview-footnote">
        Recent loaded records · dates in Pakistan time · review records before
        approval
      </p>
    </div>
  );
}
