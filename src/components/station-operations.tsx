"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock3,
  Columns3,
  Fuel,
  Menu,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Wrench,
} from "@/components/icons";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import type { Dashboard, Delivery } from "@/lib/types";
import { date, number, stationTimeInstant } from "@/lib/utils";
import { deliveryStageLabel } from "@/lib/delivery-stages";
import {
  FUEL_GRADE_OPTIONS,
  fuelGradeLabel,
  type FuelGrade,
} from "@/lib/fuel-grades";
import { useMobileLayout } from "@/lib/use-mobile-layout";
import { useClock } from "@/lib/use-clock";
type Kind = "exception" | "indent" | "maintenance" | "handover";
type WorkFilters = { kind: Kind; query: string; stage: string; mine: boolean };
const makeFilters = (kind: Kind): WorkFilters => ({
  kind,
  query: "",
  stage: "all",
  mine: false,
});
type Item = {
  id: string;
  kind: Kind;
  station_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_at: string | null;
  assigned_to: string | null;
  supplier: string | null;
  grade: FuelGrade | null;
  liters: number | null;
  equipment: string | null;
  delivery_id: string | null;
  shift_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type HistoryEvent = {
  id: number;
  actor_id: string;
  action: string;
  note: string;
  created_at: string;
};
type Snapshot = {
  items: Item[];
  people: { id: string; name: string; role: string }[];
  delivery_links?: DeliveryLink[];
};
type DeliveryLink = {
  id: string;
  reference: string;
  status: Delivery["status"];
  grade: FuelGrade;
  linked_work_id: string | null;
};
const kinds: {
  id: Kind;
  name: string;
  mobileName: string;
  singular: string;
  caption: string;
  icon: typeof Fuel;
  stages: string[];
}[] = [
  {
    id: "exception",
    name: "Discrepancy cases",
    mobileName: "Cases",
    singular: "case",
    caption: "Record a shortage or discrepancy for follow-up.",
    icon: AlertCircle,
    stages: ["open", "investigating", "resolved"],
  },
  {
    id: "indent",
    name: "Fuel indents",
    mobileName: "Indents",
    singular: "fuel indent",
    caption: "Request fuel from a supplier.",
    icon: Fuel,
    stages: ["requested", "approved", "dispatched", "received"],
  },
  {
    id: "maintenance",
    name: "Maintenance",
    mobileName: "Maintenance",
    singular: "maintenance task",
    caption: "Schedule work on station equipment.",
    icon: Wrench,
    stages: ["scheduled", "in_progress", "completed"],
  },
  {
    id: "handover",
    name: "Shift handovers",
    mobileName: "Handovers",
    singular: "handover",
    caption: "Leave a briefing for a named team member.",
    icon: MessageSquare,
    stages: ["pending", "accepted"],
  },
];
const label = (v: string) =>
  ({
    created: "Created",
    open: "Open",
    investigating: "Investigating",
    resolved: "Resolved",
    requested: "Requested",
    approved: "Approved",
    dispatched: "Dispatched",
    received: "Received",
    scheduled: "Scheduled",
    in_progress: "In progress",
    completed: "Completed",
    pending: "Pending",
    accepted: "Accepted",
    cancelled: "Cancelled",
    comment: "Note added",
  })[v] || v.replaceAll("_", " ");
const terminal = ["resolved", "received", "completed", "accepted", "cancelled"];
const actionLabels: Record<string, string> = {
  investigating: "Start investigating",
  resolved: "Resolve case",
  approved: "Approve fuel indent",
  dispatched: "Record dispatch",
  received: "Mark indent received",
  in_progress: "Start maintenance",
  completed: "Complete maintenance",
  accepted: "Acknowledge handover",
  cancelled: "Cancel record",
};
const priorityRank: Record<string, number> = { normal: 0, high: 1, urgent: 2 };
function workContext(item: Item) {
  return item.kind === "indent"
    ? `${fuelGradeLabel(item.grade)} · ${number(item.liters || 0)} L`
    : item.equipment;
}
export function StationOperations({
  stationId,
  data,
  workKind,
  onWorkKindChange,
  onOpenDelivery,
}: {
  stationId: string;
  data: Dashboard;
  workKind?: string;
  onWorkKindChange?: (kind: string) => void;
  onOpenDelivery?: (id: string) => void;
}) {
  const owner = data.member?.role === "owner";
  const [localKind, setKind] = useState<Kind>(owner ? "exception" : "handover");
  const requestedKind = kinds.some((k) => k.id === workKind)
    ? (workKind as Kind)
    : localKind;
  const kind: Kind =
    !owner && requestedKind === "exception" ? "handover" : requestedKind;
  const [snapshot, setSnapshot] = useState<Snapshot>({
    items: [],
    people: [],
    delivery_links: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [saveError, setSaveError] = useState<{
    action: string;
    message: string;
  } | null>(null);
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [filters, setFilters] = useState<WorkFilters>(() => makeFilters(kind));
  const currentFilters = filters.kind === kind ? filters : makeFilters(kind);
  const { query, stage: stageFilter, mine } = currentFilters;
  const updateFilters = (patch: Partial<Omit<WorkFilters, "kind">>) =>
    setFilters({ ...currentFilters, ...patch });
  const [view, setView] = useState<"auto" | "board" | "list">("auto");
  const mobile = useMobileLayout();
  const now = useClock();
  const layout = view === "auto" ? (mobile ? "list" : "board") : view;
  const requestVersion = useRef(0);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!stationId) {
        return;
      }
      const version = ++requestVersion.current;
      try {
        const r = await fetch(`/api/operations?station=${stationId}`, {
          signal,
          cache: "no-store",
        });
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        if (version !== requestVersion.current || signal?.aborted) return;
        setSnapshot(body);
        setError("");
      } catch (e) {
        if (
          e instanceof Error &&
          e.name !== "AbortError" &&
          version === requestVersion.current
        )
          setError(e.message);
      } finally {
        if (!signal?.aborted && version === requestVersion.current)
          setLoading(false);
      }
    },
    [stationId],
  );
  useEffect(() => {
    const controller = new AbortController();
    const initial = setTimeout(() => void load(controller.signal), 0);
    const timer = setInterval(() => {
      if (!document.hidden) void load(controller.signal);
    }, 20000);
    return () => {
      clearTimeout(initial);
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);
  const save = async (op: string, p: Record<string, unknown>) => {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setSaveError(null);
    try {
      const r = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, p }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      await load();
      toast.success("Saved to the station record");
      return true;
    } catch (e) {
      setSaveError({
        action: op === "transition" ? String(p.status) : op,
        message: e instanceof Error ? e.message : "Unable to save",
      });
      return false;
    } finally {
      setBusy(false);
      saving.current = false;
    }
  };
  const config = kinds.find((k) => k.id === kind)!;
  const item = snapshot.items.find((i) => i.id === selected && i.kind === kind);
  const person = (id: string | null) =>
    snapshot.people.find((p) => p.id === id)?.name ||
    (id ? "Former team member" : "Unassigned");
  const hasFilters = !!query || stageFilter !== "all" || mine;
  const search = query.trim().toLowerCase();
  const items = snapshot.items
    .filter(
      (record) =>
        record.kind === kind &&
        (!mine || record.assigned_to === data.member?.user_id) &&
        (stageFilter === "all"
          ? record.status !== "cancelled"
          : record.status === stageFilter) &&
        `${record.title} ${record.supplier || ""} ${record.equipment || ""} ${record.description} ${person(record.assigned_to)}`
          .toLowerCase()
          .includes(search),
    )
    .sort((a, b) => {
      const aClosed = terminal.includes(a.status);
      const bClosed = terminal.includes(b.status);
      if (aClosed !== bClosed) return Number(aClosed) - Number(bClosed);
      return aClosed
        ? 0
        : (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0);
    });
  const boardStages = stageFilter === "all" ? config.stages : [stageFilter];
  const canCreate = owner || kind === "maintenance" || kind === "handover";
  const recipients = snapshot.people.filter(
    (p) => kind !== "handover" || p.id !== data.member?.user_id,
  );
  const missingRecipient = kind === "handover" && !recipients.length;
  const selectRecord = (id: string) => {
    setSaveError(null);
    setSelected(id);
  };
  const due = (record: Item) =>
    record.due_at && !terminal.includes(record.status) ? (
      <time
        dateTime={record.due_at}
        className={`ops-list-due ${Date.parse(record.due_at) <= now ? "overdue" : ""}`}
      >
        {Date.parse(record.due_at) <= now ? "Overdue · " : "Due "}
        {date(record.due_at)} PKT
      </time>
    ) : null;
  const deliveryLinks =
    snapshot.delivery_links ??
    data.deliveries.flatMap((delivery) => {
      if (delivery.station_id !== stationId) return [];
      const tank = data.tanks.find((t) => t.id === delivery.tank_id);
      if (!tank) return [];
      return [
        {
          id: delivery.id,
          reference: delivery.reference,
          status: delivery.status,
          grade: tank.grade,
          linked_work_id:
            snapshot.items.find(
              (work) =>
                work.kind === "indent" &&
                work.status !== "cancelled" &&
                work.delivery_id === delivery.id,
            )?.id ?? null,
        },
      ];
    });
  const linkedDelivery = deliveryLinks.find((d) => d.id === item?.delivery_id);
  const canAdvance = item && !terminal.includes(item.status);
  const assignedToMe = item?.assigned_to === data.member?.user_id;
  const currentStage = item ? config.stages.indexOf(item.status) : -1;
  const nextStatus =
    canAdvance && currentStage >= 0
      ? config.stages[currentStage + 1]
      : undefined;
  const dispatchChoices =
    item?.kind === "indent" && item.status === "approved"
      ? deliveryLinks.filter(
          (d) =>
            d.grade === item.grade &&
            (!d.linked_work_id || d.linked_work_id === item.id),
        )
      : [];
  const waitingMessage =
    !item || !canAdvance
      ? ""
      : nextStatus === "approved" && !owner
        ? "Awaiting owner approval."
        : (!owner || item.kind === "handover") && !assignedToMe
          ? item.assigned_to
            ? `Waiting for ${person(item.assigned_to)}.`
            : "An owner needs to advance this record."
          : item.kind === "indent" &&
              nextStatus === "dispatched" &&
              !dispatchChoices.length
            ? `Create a ${fuelGradeLabel(item.grade)} delivery at this station to record dispatch.`
            : item.kind === "indent" &&
                nextStatus === "received" &&
                linkedDelivery?.status !== "decanted"
              ? linkedDelivery
                ? "Finish receiving the linked delivery to complete this indent."
                : "Ask the owner to check the linked delivery."
              : "";
  const availableAction = waitingMessage ? undefined : nextStatus;
  if (!stationId)
    return <div className="ops-empty">Add a station to organise its work.</div>;
  return (
    <section className={`station-operations ops-view-${layout}`}>
      <div className="ops-tabs" role="group" aria-label="Station workflows">
        {kinds
          .filter((k) => owner || k.id !== "exception")
          .map((k) => {
            const active = snapshot.items.filter(
              (i) => i.kind === k.id && !terminal.includes(i.status),
            ).length;
            return (
              <button
                key={k.id}
                type="button"
                aria-pressed={kind === k.id}
                onClick={() => {
                  setKind(k.id);
                  onWorkKindChange?.(k.id);
                  setFilters(makeFilters(k.id));
                }}
              >
                <k.icon size={17} aria-hidden="true" />
                <span className="ops-tab-name">
                  {mobile ? k.mobileName : k.name}
                </span>
                {active > 0 && (
                  <span className="ops-tab-count">
                    {active}
                    <span className="sr-only"> active</span>
                  </span>
                )}
              </button>
            );
          })}
      </div>
      <div className="ops-heading">
        <h2>{config.name}</h2>
        {canCreate && (
          <Button
            disabled={loading || busy}
            onClick={() => {
              setSaveError(null);
              setCreate(true);
            }}
          >
            <Plus size={16} />
            New {config.singular}
          </Button>
        )}
      </div>
      <div className="ops-toolbar">
        <label className="ops-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search station work"
            placeholder="Search records or assignees"
            value={query}
            onChange={(e) => updateFilters({ query: e.target.value })}
          />
        </label>
        <select
          aria-label="Filter work status"
          value={stageFilter}
          onChange={(e) => updateFilters({ stage: e.target.value })}
        >
          <option value="all">All statuses</option>
          {[...config.stages, "cancelled"].map((stage) => (
            <option key={stage} value={stage}>
              {label(stage)}
            </option>
          ))}
        </select>
        <div
          className="view-toggle"
          role="group"
          aria-label="Station work layout"
        >
          <button
            type="button"
            aria-pressed={layout === "board"}
            onClick={() => setView("board")}
          >
            <Columns3 size={15} aria-hidden="true" /> Board
          </button>
          <button
            type="button"
            aria-pressed={layout === "list"}
            onClick={() => setView("list")}
          >
            <Menu size={15} aria-hidden="true" /> List
          </button>
        </div>
        <div className="ops-results">
          <button
            type="button"
            className="ops-mine"
            aria-pressed={mine}
            onClick={() => updateFilters({ mine: !mine })}
          >
            {mine && <Check size={15} aria-hidden="true" />} Assigned to me
          </button>
          {hasFilters && (
            <button
              type="button"
              className="text-link ops-clear"
              onClick={() => setFilters(makeFilters(kind))}
            >
              Clear filters
            </button>
          )}
          {!loading && (
            <span role="status">
              {items.length} {items.length === 1 ? "record" : "records"}
            </span>
          )}
          <Button
            size="icon"
            variant="ghost"
            aria-label="Refresh station work"
            title="Refresh station work"
            onClick={() => void load()}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {snapshot.items.length > 0 ? "Saved records are still visible. " : ""}
          {error}{" "}
          <button
            type="button"
            className="text-link"
            onClick={() => void load()}
          >
            Retry
          </button>
        </p>
      )}
      {loading ? (
        <p role="status">Loading saved station work…</p>
      ) : !items.length ? (
        !error && (
          <div className="ops-empty ops-record-empty">
            <config.icon size={24} aria-hidden="true" />
            <p>
              {hasFilters
                ? "No records match these filters."
                : `No ${config.name.toLowerCase()} yet.`}
            </p>
          </div>
        )
      ) : layout === "board" ? (
        <div
          className="ops-board"
          role="region"
          aria-label={`${config.name} stages`}
          tabIndex={0}
        >
          {boardStages.map((stage) => (
            <section className="ops-lane" key={stage}>
              <header>
                <span
                  className={`ops-stage-dot stage-${stage}`}
                  aria-hidden="true"
                />
                <h3>{label(stage)}</h3>
                <b>{items.filter((i) => i.status === stage).length}</b>
              </header>
              <div>
                {items
                  .filter((i) => i.status === stage)
                  .map((i) => (
                    <button
                      className={`ops-card priority-${i.priority}`}
                      key={i.id}
                      type="button"
                      onClick={() => selectRecord(i.id)}
                    >
                      <h4>{i.title}</h4>
                      {(workContext(i) || i.priority !== "normal") && (
                        <div className="ops-card-top">
                          {workContext(i) && <span>{workContext(i)}</span>}
                          {i.priority !== "normal" && (
                            <span
                              className={`ops-priority priority-${i.priority}`}
                            >
                              {i.priority}
                            </span>
                          )}
                        </div>
                      )}
                      {i.description && <p>{i.description}</p>}
                      <footer>
                        <span>
                          {i.assigned_to === data.member?.user_id
                            ? "Assigned to you"
                            : person(i.assigned_to)}
                        </span>
                        <ArrowRight size={16} aria-hidden="true" />
                      </footer>
                      {due(i)}
                    </button>
                  ))}
                {!items.some((i) => i.status === stage) && (
                  <div className="ops-lane-empty">
                    <span>No records</span>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : null}
      {!loading && items.length > 0 && layout === "list" && (
        <div className="ops-list" aria-label={`${config.name} list`}>
          {items.map((record) => (
            <button
              key={record.id}
              className="ops-list-row"
              type="button"
              onClick={() => selectRecord(record.id)}
            >
              <div className="ops-list-identity">
                <h3>{record.title}</h3>
                {workContext(record) && <p>{workContext(record)}</p>}
              </div>
              <div className="ops-list-statuses">
                <span className={`status work-status-${record.status}`}>
                  {label(record.status)}
                </span>
                {record.priority !== "normal" && (
                  <span className={`ops-priority priority-${record.priority}`}>
                    {record.priority}
                  </span>
                )}
              </div>
              <span className="ops-list-assignee">
                {record.assigned_to === data.member?.user_id
                  ? "Assigned to you"
                  : person(record.assigned_to)}
              </span>
              {due(record)}
              <ArrowRight
                className="ops-list-arrow"
                size={18}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      )}
      {snapshot.items.length === 500 && (
        <p className="ops-footnote">
          Showing the 500 most recent station records.
        </p>
      )}
      <Dialog
        open={create}
        onOpenChange={setCreate}
        title={`New ${config.singular}`}
        description={config.caption}
      >
        <form
          className="action-form ops-create-form"
          method="post"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const p = Object.fromEntries(f.entries());
            let dueAt: string | null;
            try {
              dueAt = p.due_at ? stationTimeInstant(String(p.due_at)) : null;
            } catch (error) {
              setSaveError({
                action: "create",
                message:
                  error instanceof Error
                    ? error.message
                    : "Enter a valid date and time in PKT.",
              });
              return;
            }
            if (
              await save("create", {
                ...p,
                station_id: stationId,
                kind,
                due_at: dueAt,
              })
            )
              setCreate(false);
          }}
        >
          <label>
            Title
            <input
              name="title"
              required
              minLength={3}
              maxLength={140}
              placeholder={
                kind === "maintenance"
                  ? "Calibrate MS dispenser 02"
                  : "A clear, specific title"
              }
            />
          </label>
          <label>
            {kind === "handover"
              ? "Briefing and outstanding actions"
              : "Details"}
            <textarea
              name="description"
              rows={3}
              maxLength={4000}
              required={kind === "handover"}
              placeholder="Include what happened, the next action, and any relevant evidence references."
            />
          </label>
          <div className="form-grid">
            <label>
              {kind === "handover" ? "Recipient" : "Assigned to"}
              <select name="assigned_to" required={kind === "handover"}>
                <option value="">Choose a person</option>
                {recipients.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select name="priority">
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label>
              Due at (PKT)
              <input type="datetime-local" name="due_at" />
            </label>
          </div>
          {kind === "indent" && (
            <div className="form-grid">
              <label>
                Supplier / OMC
                <input name="supplier" required minLength={2} maxLength={140} />
              </label>
              <label>
                Fuel grade
                <select name="grade">
                  {FUEL_GRADE_OPTIONS.map((grade) => (
                    <option key={grade.value} value={grade.value}>
                      {grade.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Requested litres
                <input
                  name="liters"
                  type="number"
                  required
                  min="1"
                  max="1000000"
                  step=".01"
                />
              </label>
            </div>
          )}
          {kind === "maintenance" && (
            <label>
              Equipment reference
              <input
                name="equipment"
                maxLength={140}
                required
                placeholder="Tank, nozzle, dispenser, or safety equipment"
              />
            </label>
          )}
          {(kind === "exception" || kind === "handover") && (
            <label>
              Related closed shift (optional)
              <select name="shift_id">
                <option value="">No linked shift</option>
                {data.shifts
                  .filter(
                    (s) => s.station_id === stationId && s.status !== "open",
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {date(s.closed_at)}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {kind === "exception" && (
            <label>
              Related delivery (optional)
              <select name="delivery_id">
                <option value="">No linked delivery</option>
                {deliveryLinks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.reference}
                  </option>
                ))}
              </select>
            </label>
          )}
          {missingRecipient && (
            <p role="status" className="ops-form-message">
              Add another active team member to send a handover.
            </p>
          )}
          {saveError?.action === "create" && (
            <p role="alert" className="form-error">
              {saveError.message}
            </p>
          )}
          <Button type="submit" disabled={busy || missingRecipient}>
            {busy ? "Saving…" : `Create ${config.singular}`}
            <ArrowRight size={16} />
          </Button>
        </form>
      </Dialog>
      <Dialog
        open={!!item}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
        title={item?.title || "Station work"}
        description={
          item
            ? `${config.name} · ${label(item.status)} · ${person(item.assigned_to)}`
            : ""
        }
      >
        {item && (
          <div className="ops-record-content">
            {waitingMessage && (
              <div className="ops-work-blocked" role="status">
                <Clock3 size={18} aria-hidden="true" />
                <div>
                  <p>{waitingMessage}</p>
                  {linkedDelivery &&
                    linkedDelivery.status !== "decanted" &&
                    onOpenDelivery &&
                    data.deliveries.some((d) => d.id === linkedDelivery.id) && (
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => {
                          setSelected(null);
                          onOpenDelivery(linkedDelivery.id);
                        }}
                      >
                        Open linked delivery{" "}
                        <ArrowRight size={14} aria-hidden="true" />
                      </button>
                    )}
                </div>
              </div>
            )}
            {availableAction && (
              <WorkTransition
                key={`${item.id}-${item.status}-${availableAction}`}
                item={item}
                action={availableAction}
                dispatchChoices={dispatchChoices}
                busy={busy}
                error={
                  saveError?.action === availableAction
                    ? saveError.message
                    : undefined
                }
                onSave={(values) => save("transition", values)}
              />
            )}
            <div className="ops-detail">
              {item.description && <p>{item.description}</p>}
              <dl>
                <div>
                  <dt>Created by</dt>
                  <dd>{person(item.created_by)}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{date(item.created_at)}</dd>
                </div>
                {item.liters && (
                  <div>
                    <dt>Requested</dt>
                    <dd>
                      {number(item.liters)} L · {fuelGradeLabel(item.grade)} ·{" "}
                      {item.supplier}
                    </dd>
                  </div>
                )}
                {item.equipment && (
                  <div>
                    <dt>Equipment</dt>
                    <dd>{item.equipment}</dd>
                  </div>
                )}
                {item.shift_id && (
                  <div>
                    <dt>Linked shift</dt>
                    <dd>
                      {data.shifts.find((s) => s.id === item.shift_id)?.name ||
                        item.shift_id.slice(0, 8)}
                    </dd>
                  </div>
                )}
                {item.delivery_id && (
                  <div>
                    <dt>Linked delivery</dt>
                    <dd>
                      {linkedDelivery
                        ? `${linkedDelivery.reference} · ${deliveryStageLabel(linkedDelivery.status)}`
                        : item.delivery_id.slice(0, 8)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <h3 className="ops-history-title">Record history</h3>
            <WorkHistory
              key={`${item.id}-${item.updated_at}`}
              item={item}
              people={snapshot.people}
            />
            <form
              className="ops-comment"
              method="post"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                if (
                  await save("comment", {
                    id: item.id,
                    note: new FormData(form).get("note"),
                  })
                )
                  form.reset();
              }}
            >
              <label>
                Add to the record
                <textarea
                  name="note"
                  required
                  minLength={2}
                  maxLength={4000}
                  rows={2}
                />
              </label>
              {saveError?.action === "comment" && (
                <p role="alert" className="form-error">
                  {saveError.message}
                </p>
              )}
              <Button disabled={busy} variant="secondary">
                <MessageSquare size={14} />
                Add note
              </Button>
            </form>
            {canAdvance && owner && (
              <details
                className="ops-cancel"
                key={`${item.id}-${item.status}-cancel`}
              >
                <summary>Cancel record</summary>
                <WorkTransition
                  item={item}
                  action="cancelled"
                  dispatchChoices={[]}
                  busy={busy}
                  error={
                    saveError?.action === "cancelled"
                      ? saveError.message
                      : undefined
                  }
                  onSave={(values) => save("transition", values)}
                />
              </details>
            )}
          </div>
        )}
      </Dialog>
    </section>
  );
}

function WorkTransition({
  item,
  action,
  dispatchChoices,
  busy,
  error,
  onSave,
}: {
  item: Item;
  action: string;
  dispatchChoices: DeliveryLink[];
  busy: boolean;
  error?: string;
  onSave: (values: Record<string, unknown>) => Promise<boolean>;
}) {
  const requiresNote = ["resolved", "completed", "cancelled"].includes(action);
  return (
    <form
      className="ops-transition"
      method="post"
      onSubmit={async (event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        await onSave({
          id: item.id,
          expected_status: item.status,
          status: action,
          note: values.get("note"),
          delivery_id:
            action === "received"
              ? item.delivery_id
              : values.get("delivery_id"),
        });
      }}
    >
      {item.kind === "indent" && action === "dispatched" && (
        <label>
          Delivery · {fuelGradeLabel(item.grade)}
          <select
            name="delivery_id"
            required
            defaultValue={item.delivery_id || ""}
          >
            <option value="" disabled>
              Select delivery
            </option>
            {dispatchChoices.map((delivery) => (
              <option key={delivery.id} value={delivery.id}>
                {delivery.reference} · {deliveryStageLabel(delivery.status)}
              </option>
            ))}
          </select>
        </label>
      )}
      {action === "received" && (
        <p className="fine-print">
          Tank stock was updated by the linked delivery. This closes the indent.
        </p>
      )}
      {requiresNote ? (
        <label>
          {action === "cancelled" ? "Cancellation reason" : "Completion note"}
          <textarea
            name="note"
            rows={2}
            required
            minLength={5}
            maxLength={4000}
          />
        </label>
      ) : (
        <details className="ops-action-note">
          <summary>Add a note</summary>
          <textarea
            aria-label="Optional note"
            name="note"
            rows={2}
            maxLength={4000}
          />
        </details>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={busy}
        variant={action === "cancelled" ? "destructive" : "default"}
      >
        {busy ? "Saving…" : actionLabels[action]}
        <ArrowRight size={15} />
      </Button>
    </form>
  );
}

function WorkHistory({
  item,
  people,
}: {
  item: Item;
  people: Snapshot["people"];
}) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const load = useCallback(
    async (before?: number, signal?: AbortSignal) => {
      try {
        const r = await fetch(
          `/api/operations?station=${item.station_id}&item=${item.id}${before ? `&before=${before}` : ""}`,
          { signal, cache: "no-store" },
        );
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (!signal?.aborted) {
          setEvents((previous) =>
            before ? [...data.events, ...previous] : data.events,
          );
          setNext(data.next);
          setError("");
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") setError(e.message);
      } finally {
        if (!signal?.aborted) setBusy(false);
      }
    },
    [item.id, item.station_id],
  );
  useEffect(() => {
    const c = new AbortController();
    const t = setTimeout(() => void load(undefined, c.signal), 0);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [load]);
  return (
    <>
      {error && (
        <p role="alert" className="form-error">
          {error}
          <button onClick={() => void load()}>Retry</button>
        </p>
      )}
      {busy && <p role="status">Loading record history…</p>}
      {next && (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void load(next);
          }}
        >
          Load older entries
        </Button>
      )}
      <ol className="ops-history">
        {events.map((e) => (
          <li key={e.id}>
            <span className="ops-history-dot" />
            <div>
              <strong>{label(e.action)}</strong>
              <span>
                {people.find((p) => p.id === e.actor_id)?.name ||
                  "Former team member"}{" "}
                · {date(e.created_at)}
              </span>
              {e.note && <p>{e.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
