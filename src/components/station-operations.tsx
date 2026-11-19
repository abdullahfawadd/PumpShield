"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock3,
  Fuel,
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
import { date, number } from "@/lib/utils";
import { deliveryStageLabel } from "@/lib/delivery-stages";
import { FUEL_GRADE_OPTIONS, fuelGradeLabel, type FuelGrade } from "@/lib/fuel-grades";
import { useMobileLayout } from "@/lib/use-mobile-layout";
type Kind = "exception" | "indent" | "maintenance" | "handover";
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
  caption: string;
  icon: typeof Fuel;
  stages: string[];
}[] = [
  {
    id: "exception",
    name: "Discrepancy cases",
    mobileName: "Cases",
    caption: "Record a shortage or discrepancy for follow-up.",
    icon: AlertCircle,
    stages: ["open", "investigating", "resolved"],
  },
  {
    id: "indent",
    name: "Fuel indents",
    mobileName: "Indents",
    caption: "Request fuel from a supplier.",
    icon: Fuel,
    stages: ["requested", "approved", "dispatched", "received"],
  },
  {
    id: "maintenance",
    name: "Maintenance",
    mobileName: "Maintenance",
    caption: "Schedule work on station equipment.",
    icon: Wrench,
    stages: ["scheduled", "in_progress", "completed"],
  },
  {
    id: "handover",
    name: "Shift handovers",
    mobileName: "Handovers",
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
  cancelled: "Cancel with a reason",
};
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
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [archive, setArchive] = useState(false);
  const [stageFilter, setStageFilter] = useState("all");
  const [view, setView] = useState<"auto" | "board" | "list">("auto");
  const mobile = useMobileLayout();
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
    setBusy(true);
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
      toast.error(e instanceof Error ? e.message : "Unable to save");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const config = kinds.find((k) => k.id === kind)!;
  const item = snapshot.items.find((i) => i.id === selected);
  const person = (id: string | null) =>
    snapshot.people.find((p) => p.id === id)?.name ||
    (id ? "Former team member" : "Unassigned");
  const items = snapshot.items.filter(
    (i) =>
      i.kind === kind &&
      (stageFilter === "all" || i.status === stageFilter) &&
      (!archive ? i.status !== "cancelled" : true) &&
      `${i.title} ${i.supplier || ""} ${i.equipment || ""} ${i.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const canCreate = owner || kind === "maintenance" || kind === "handover";
  const deliveryLinks = snapshot.delivery_links ?? data.deliveries.flatMap((delivery) => {
    if (delivery.station_id !== stationId) return [];
    const tank = data.tanks.find((t) => t.id === delivery.tank_id);
    if (!tank) return [];
    return [{
      id: delivery.id,
      reference: delivery.reference,
      status: delivery.status,
      grade: tank.grade,
      linked_work_id: snapshot.items.find((work) =>
        work.kind === "indent" && work.status !== "cancelled" && work.delivery_id === delivery.id,
      )?.id ?? null,
    }];
  });
  const linkedDelivery = deliveryLinks.find((d) => d.id === item?.delivery_id);
  const canAdvance = item && !terminal.includes(item.status);
  const assignedToMe = item?.assigned_to === data.member?.user_id;
  const nextStatus = canAdvance
    ? config.stages[config.stages.indexOf(item.status) + 1]
    : undefined;
  const dispatchChoices =
    item?.kind === "indent" && item.status === "approved"
      ? deliveryLinks.filter((d) =>
          d.grade === item.grade && (!d.linked_work_id || d.linked_work_id === item.id),
        )
      : [];
  const waitingMessage = !item || !canAdvance ? "" :
    nextStatus === "approved" && !owner
      ? "Awaiting owner approval."
      : (!owner || item.kind === "handover") && !assignedToMe
        ? item.assigned_to
          ? `Waiting for ${person(item.assigned_to)}.`
          : "An owner needs to advance this record."
        : item.kind === "indent" && nextStatus === "dispatched" && !dispatchChoices.length
          ? `Create a ${fuelGradeLabel(item.grade)} delivery at this station to record dispatch.`
          : item.kind === "indent" && nextStatus === "received" && linkedDelivery?.status !== "decanted"
            ? linkedDelivery
              ? "Finish receiving the linked delivery to complete this indent."
              : "Ask the owner to check the linked delivery."
            : "";
  const actions = [
    ...(nextStatus && !waitingMessage ? [nextStatus] : []),
    ...(canAdvance && owner ? ["cancelled"] : []),
  ];
  if (!stationId)
    return <div className="ops-empty">Add a station to organise its work.</div>;
  return (
    <section className={`station-operations ops-view-${layout}`}>
      <div className="ops-tabs" role="group" aria-label="Station workflows">
        {kinds
          .filter((k) => owner || k.id !== "exception")
          .map((k) => (
            <button
              key={k.id}
              aria-pressed={kind === k.id}
              onClick={() => {
                setKind(k.id);
                onWorkKindChange?.(k.id);
                setQuery("");
                setStageFilter("all");
              }}
            >
              <k.icon size={16} />
              <span className="ops-tab-name">{mobile ? k.mobileName : k.name}</span>
              <span className="ops-tab-count">
                {
                  snapshot.items.filter(
                    (i) => i.kind === k.id && !terminal.includes(i.status),
                  ).length
                }
              </span>
            </button>
          ))}
      </div>
      <div className="ops-heading">
        <div>
          <h2>{config.name}</h2>
          <p>
            {items.length} {items.length === 1 ? "record" : "records"}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreate(true)}>
            <Plus size={16} />
            New {kind === "exception" ? "case" : kind}
          </Button>
        )}
      </div>
      <div className="ops-toolbar">
        <label>
          <Search size={16} />
          <input
            aria-label="Search station work"
            placeholder="Search this workflow…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter work status"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {[...config.stages, ...(archive ? ["cancelled"] : [])].map(
            (stage) => (
              <option key={stage} value={stage}>
                {label(stage)}
              </option>
            ),
          )}
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
            Board
          </button>
          <button
            type="button"
            aria-pressed={layout === "list"}
            onClick={() => setView("list")}
          >
            List
          </button>
        </div>
        <label className="ops-check">
          <input
            type="checkbox"
            checked={archive}
            onChange={(e) => {
              setArchive(e.target.checked);
              if (!e.target.checked && stageFilter === "cancelled")
                setStageFilter("all");
            }}
          />
          Include cancelled
        </label>
        <Button
          variant="ghost"
          aria-label="Refresh station work"
          onClick={() => void load()}
        >
          <RefreshCw size={16} />
        </Button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error} <button onClick={() => void load()}>Retry</button>
        </p>
      )}
      {loading ? (
        <p role="status">Loading saved station work…</p>
      ) : layout === "board" ? (
        <div
          className="ops-board"
          role="region"
          aria-label={`${config.name} stages`}
          tabIndex={0}
        >
          {[...config.stages, ...(archive ? ["cancelled"] : [])]
            .filter((stage) => stageFilter === "all" || stage === stageFilter)
            .map((stage) => (
              <section className="ops-lane" key={stage}>
                <header>
                  <span className={`ops-stage-dot stage-${stage}`} />
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
                        onClick={() => setSelected(i.id)}
                      >
                        <div className="ops-card-top">
                          <span>
                            {i.kind === "indent"
                              ? `${fuelGradeLabel(i.grade)} · ${number(i.liters || 0)} L`
                              : i.equipment || `#${i.id.slice(0, 6)}`}
                          </span>
                          <span>{i.priority}</span>
                        </div>
                        <h4>{i.title}</h4>
                        {i.description && <p>{i.description}</p>}
                        <footer>
                          <span className="ops-avatar">
                            {person(i.assigned_to).slice(0, 1)}
                          </span>
                          <span>{person(i.assigned_to)}</span>
                          <ArrowRight size={14} />
                        </footer>
                        {i.due_at && (
                          <span
                            className={`ops-due ${new Date(i.due_at) < new Date() && !terminal.includes(i.status) ? "overdue" : ""}`}
                          >
                            <Clock3 size={12} />
                            {date(i.due_at)}
                          </span>
                        )}
                      </button>
                    ))}
                  {!items.some((i) => i.status === stage) && (
                    <div className="ops-lane-empty">
                      <Check size={18} />
                      <span>
                        {stage === config.stages[0]
                          ? "Nothing waiting here"
                          : "No items at this stage"}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            ))}
        </div>
      ) : null}
      {!loading && layout === "list" && (
        <div className="ops-list" aria-label={`${config.name} list`}>
          {items.map((record) => (
            <button
              key={record.id}
              className="ops-list-row"
              onClick={() => setSelected(record.id)}
            >
              <div>
                <span className={`status work-status-${record.status}`}>
                  {label(record.status)}
                </span>
                <h3>{record.title}</h3>
                <p>
                  {record.kind === "indent"
                    ? `${fuelGradeLabel(record.grade)} · ${number(record.liters || 0)} L`
                    : record.equipment || config.name}
                </p>
              </div>
              <span className="ops-list-assignee">
                {person(record.assigned_to)}
              </span>
              <span
                className={`ops-list-due ${record.due_at && new Date(record.due_at) < new Date() && !terminal.includes(record.status) ? "overdue" : ""}`}
              >
                {record.due_at ? date(record.due_at) : "No due date"}
              </span>
              <ArrowRight size={18} />
            </button>
          ))}
          {!items.length && (
            <div className="ops-empty">
              <p>
                {query || stageFilter !== "all"
                  ? "No matching records."
                  : "No records yet."}
              </p>
              {(query || stageFilter !== "all") && (
                <button
                  className="text-link"
                  onClick={() => {
                    setQuery("");
                    setStageFilter("all");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {snapshot.items.length === 500 && (
        <p className="ops-footnote">Showing the 500 most recent station records.</p>
      )}
      <Dialog
        open={create}
        onOpenChange={setCreate}
        title={`New ${kind === "exception" ? "discrepancy case" : kind}`}
        description={config.caption}
      >
        <form
          className="action-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const p = Object.fromEntries(f.entries());
            if (
              await save("create", {
                ...p,
                station_id: stationId,
                kind,
                due_at: p.due_at
                  ? new Date(String(p.due_at)).toISOString()
                  : null,
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
                {snapshot.people
                  .filter(
                    (p) => kind !== "handover" || p.id !== data.member?.user_id,
                  )
                  .map((p) => (
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
              Due at (local time)
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
                  {FUEL_GRADE_OPTIONS.map(grade => <option key={grade.value} value={grade.value}>{grade.label}</option>)}
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
          <Button disabled={busy}>
            {busy ? "Saving…" : "Create record"}
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
          <>
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
                      {number(item.liters)} L · {fuelGradeLabel(item.grade)} · {item.supplier}
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
            {waitingMessage && (
              <div className="ops-work-blocked" role="status">
                <Clock3 size={18} aria-hidden="true" />
                <div>
                  <p>{waitingMessage}</p>
                  {linkedDelivery && linkedDelivery.status !== "decanted" &&
                    onOpenDelivery && data.deliveries.some((d) => d.id === linkedDelivery.id) && (
                    <button type="button" className="text-link" onClick={() => {
                      setSelected(null);
                      onOpenDelivery(linkedDelivery.id);
                    }}>
                      Open linked delivery <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
            {!!actions.length && (
              <WorkTransition
                key={`${item.id}-${item.status}-${actions.join(",")}`}
                item={item}
                actions={actions}
                dispatchChoices={dispatchChoices}
                busy={busy}
                onSave={(values) => save("transition", values)}
              />
            )}
            <h3 className="ops-history-title">Record history</h3>
            <WorkHistory
              key={`${item.id}-${item.updated_at}`}
              item={item}
              people={snapshot.people}
            />
            <form
              className="ops-comment"
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
              <Button disabled={busy} variant="secondary">
                <MessageSquare size={14} />
                Add note
              </Button>
            </form>
          </>
        )}
      </Dialog>
    </section>
  );
}

function WorkTransition({
  item,
  actions,
  dispatchChoices,
  busy,
  onSave,
}: {
  item: Item;
  actions: string[];
  dispatchChoices: DeliveryLink[];
  busy: boolean;
  onSave: (values: Record<string, unknown>) => Promise<boolean>;
}) {
  const [action, setAction] = useState(actions[0]);
  const requiresNote = ["resolved", "completed", "cancelled"].includes(action);
  return (
    <form
      className="ops-transition"
      onSubmit={async (event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        await onSave({
          id: item.id,
          expected_status: item.status,
          status: action,
          note: values.get("note"),
          delivery_id: action === "received" ? item.delivery_id : values.get("delivery_id"),
        });
      }}
    >
      {actions.length > 1 && (
        <label>
          Action
          <select value={action} onChange={(event) => setAction(event.target.value)}>
            {actions.map((status) => (
              <option key={status} value={status}>{actionLabels[status]}</option>
            ))}
          </select>
        </label>
      )}
      {item.kind === "indent" && action === "dispatched" && (
        <label>
          Delivery · {fuelGradeLabel(item.grade)}
          <select name="delivery_id" required defaultValue={item.delivery_id || ""}>
            <option value="" disabled>Select delivery</option>
            {dispatchChoices.map((delivery) => (
              <option key={delivery.id} value={delivery.id}>
                {delivery.reference} · {deliveryStageLabel(delivery.status)}
              </option>
            ))}
          </select>
        </label>
      )}
      {action === "received" && (
        <p className="fine-print">Tank stock was updated by the linked delivery. This closes the indent.</p>
      )}
      <label>
        {action === "cancelled" ? "Cancellation reason" : requiresNote ? "Completion note" : "Note (optional)"}
        <textarea name="note" rows={2} required={requiresNote} minLength={requiresNote ? 5 : undefined} maxLength={4000} />
      </label>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : action === "cancelled" ? "Cancel record" : actionLabels[action]}
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
