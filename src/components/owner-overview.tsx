"use client";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { Dashboard, Delivery, Shift, Tank, Station } from "@/lib/types";
import { date, money, number } from "@/lib/utils";
import { useClock } from "@/lib/use-clock";
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
import { OverviewStock } from "./overview-stock";
import { Button as AstryxButton } from "@astryxdesign/core/Button";

const widgetNames: Record<OverviewWidget, string> = {
  performance: "Shift sales",
  stock: "Tank stock",
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
  offline_parchi: "Credit fill posted",
  offline_arrival: "Arrival audit posted",
  offline_shift: "Shift close posted",
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
  onStock: (tankId?: string) => void;
}) {
  const [days, setDays] = useState<7 | 30>(7);
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
  const clock = useClock();
  const currentShift = shifts.find((shift) => shift.status === "open");
  const dueAt = currentShift ? Date.parse(currentShift.due_at) : NaN;
  const overdue = dueAt <= clock;
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
  const source = (id: string) => {
    const delivery = data.deliveries.find((record) => record.id === id);
    if (delivery)
      return {
        title: delivery.reference,
        view:
          delivery.station_id === station?.id ? "delivery_detail" : undefined,
      };
    const shift = data.shifts.find((record) => record.id === id);
    if (shift)
      return {
        title: shift.name,
        view:
          shift.station_id === station?.id && shift.status !== "open"
            ? "shift_detail"
            : undefined,
      };
    const account = data.accounts.find((record) => record.id === id);
    return { title: account?.name, view: undefined };
  };
  const observed = model.periodShifts.length > 0;
  return (
    <div className="overview-studio">
      <div className="overview-toolbar">
        <div className="overview-live">
          <i aria-hidden="true" />
          Refreshed{" "}
          <span>
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
      <section
        className="overview-current-shift"
        data-overdue={overdue}
        aria-labelledby="overview-current-shift-title"
      >
        <span className="overview-shift-icon" aria-hidden="true">
          <Clock3 size={20} />
        </span>
        <div>
          <h2 id="overview-current-shift-title">
            {currentShift?.name ?? "No open shift"}
          </h2>
          {currentShift && (
            <p>
              {overdue
                ? "Overdue · close required"
                : Number.isFinite(dueAt)
                  ? `Open · due ${date(currentShift.due_at)}`
                  : "Open"}
            </p>
          )}
        </div>
        {station && (
          <Button
            size="sm"
            onClick={() =>
              onOpen(
                currentShift ? "close_shift" : "open_shift",
                currentShift?.id,
              )
            }
          >
            {currentShift ? "Close shift" : "Open shift"}
            <ArrowUpRight size={15} />
          </Button>
        )}
      </section>
      <div
        className="overview-kpis"
        aria-label={`Station totals for the last ${days} days`}
      >
        <div className="overview-kpi overview-kpi-feature">
          <span>
            <Droplets size={18} />
            Fuel dispensed
          </span>
          <strong>
            {observed ? number(model.totals.liters, 1) : "—"}
            <small>L</small>
          </strong>
          <footer>
            <span>
              {observed
                ? `${model.periodShifts.length} closed shifts`
                : "No closed shifts"}
            </span>
            <span>Last {days} days</span>
          </footer>
        </div>
        <div className="overview-kpi">
          <span>
            <WalletCards size={18} />
            Recorded revenue
          </span>
          <strong>
            {privateMode
              ? "••••••"
              : observed
                ? number(model.totals.revenue)
                : "—"}
            <small>PKR</small>
          </strong>
          <footer>Last {days} days</footer>
        </div>
        <div className="overview-kpi overview-kpi-review">
          <span>
            <Clock3 size={18} />
            Ready to receive
          </span>
          <strong>
            {model.stages.find((item) => item.status === "approved")?.count ??
              0}
            <small>loads</small>
          </strong>
          <footer>Approved deliveries</footer>
        </div>
      </div>
      {model.excludedInvalidRecords > 0 && (
        <p className="overview-warning" role="status">
          {model.excludedInvalidRecords} invalid legacy shift records excluded.
          Verify the source records before reporting.
        </p>
      )}
      <section
        className="overview-review"
        data-pending={model.review.count > 0}
        aria-labelledby="overview-reviews"
      >
        <div className="overview-section-title">
          <h2 id="overview-reviews">Review queue</h2>
          {model.review.count > 0 && (
            <span className="overview-count has-reviews">
              {model.review.count} pending
            </span>
          )}
        </div>
        {!model.review.count ? (
          <p className="overview-clear">
            <Check size={18} /> No pending reviews.
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
                  {d.shortage != null && d.shortage > 0 && (
                    <span>{number(d.shortage, 1)} L unexplained shortage</span>
                  )}
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
                    {s.result &&
                      `${privateMode ? "••••••" : money(s.result.cash_variance)} cash variance`}
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
                <OverviewStock
                  key={id}
                  tanks={tanks}
                  shifts={shifts}
                  nozzles={data.nozzles}
                  onOpenShift={(shiftId) => onOpen("shift_detail", shiftId)}
                  onStock={onStock}
                />
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
                    {model.stages.map((s) => (
                      <button
                        key={s.status}
                        aria-pressed={stage === s.status}
                        onClick={() =>
                          setStage(stage === s.status ? null : s.status)
                        }
                      >
                        <span className="overview-stage-line" />
                        <small>{s.label}</small>
                        <strong>{s.count}</strong>
                      </button>
                    ))}
                  </div>
                  <ReceivingFocus
                    deliveries={listed}
                    station={station}
                    onOpen={onOpen}
                  />
                </section>
              );
            return (
              <details className="overview-card overview-activity" key={id}>
                <summary>Workspace activity</summary>
                <ol>
                  {data.events.slice(0, 5).map((e) => {
                    const record = source(e.subject_id);
                    const view = record.view;
                    return (
                      <li key={e.id}>
                        <span
                          className="overview-event-dot"
                          aria-hidden="true"
                        />
                        <div>
                          <strong>
                            {eventNames[e.action] || "Station record updated"}
                          </strong>
                          {record.title &&
                            (view ? (
                              <button
                                className="overview-activity-record"
                                onClick={() => onOpen(view, e.subject_id)}
                              >
                                {record.title} <ArrowUpRight size={13} />
                              </button>
                            ) : (
                              <span>{record.title}</span>
                            ))}
                          <time>{date(e.created_at)}</time>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {!data.events.length && (
                  <p className="overview-empty">No saved activity yet.</p>
                )}
              </details>
            );
          })}
      </div>
    </div>
  );
}
