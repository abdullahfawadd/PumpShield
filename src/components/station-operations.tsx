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
import type { Dashboard } from "@/lib/types";
import { date, number } from "@/lib/utils";
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
  grade: string | null;
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
};
const kinds: {
  id: Kind;
  name: string;
  caption: string;
  icon: typeof Fuel;
  stages: string[];
}[] = [
  {
    id: "exception",
    name: "Discrepancy cases",
    caption:
      "Investigate shortages and cash differences. Keep the decision with the evidence.",
    icon: AlertCircle,
    stages: ["open", "investigating", "resolved"],
  },
  {
    id: "indent",
    name: "Fuel indents",
    caption:
      "Request supply, authorise the order, and connect it to a verified delivery.",
    icon: Fuel,
    stages: ["requested", "approved", "dispatched", "received"],
  },
  {
    id: "maintenance",
    name: "Maintenance",
    caption: "Plan equipment work and record what was done, by whom, and when.",
    icon: Wrench,
    stages: ["scheduled", "in_progress", "completed"],
  },
  {
    id: "handover",
    name: "Shift handovers",
    caption:
      "Leave a clear briefing. The named recipient acknowledges it personally.",
    icon: MessageSquare,
    stages: ["pending", "accepted"],
  },
];
const label = (v: string) => v.replaceAll("_", " ");
const terminal = ["resolved", "received", "completed", "accepted", "cancelled"];
export function StationOperations({
  stationId,
  data,
}: {
  stationId: string;
  data: Dashboard;
}) {
  const owner = data.member?.role === "owner";
  const [kind, setKind] = useState<Kind>(owner ? "exception" : "handover");
  const [snapshot, setSnapshot] = useState<Snapshot>({
    items: [],
    people: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [archive, setArchive] = useState(false);
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
      (!archive ? i.status !== "cancelled" : true) &&
      `${i.title} ${i.supplier || ""} ${i.equipment || ""} ${i.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const canCreate = owner || kind === "maintenance" || kind === "handover";
  const linkedDeliveries = data.deliveries.filter(
    (d) => d.station_id === stationId,
  );
  if (!stationId)
    return <div className="ops-empty">Add a station to organise its work.</div>;
  return (
    <section className="station-operations">
      <div className="ops-tabs" role="group" aria-label="Station workflows">
        {kinds
          .filter((k) => owner || k.id !== "exception")
          .map((k) => (
            <button
              key={k.id}
              aria-pressed={kind === k.id}
              onClick={() => {
                setKind(k.id);
                setQuery("");
              }}
            >
              <k.icon size={16} />
              {k.name}
              <span>
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
          <span className="ops-kicker">STATION WORKSPACE</span>
          <h2>{config.name}</h2>
          <p>{config.caption}</p>
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
        <label className="ops-check">
          <input
            type="checkbox"
            checked={archive}
            onChange={(e) => setArchive(e.target.checked)}
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
      ) : (
        <div className="ops-board">
          {[...config.stages, ...(archive ? ["cancelled"] : [])].map(
            (stage) => (
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
                              ? `${i.grade} · ${number(i.liters || 0)} L`
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
            ),
          )}
        </div>
      )}
      <p className="ops-footnote">
        Saved records · refreshed every 20 seconds · up to 500 most recently
        updated items per station. Open a card to view its history and advance
        its workflow.
      </p>
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
                  <option value="MS">MS · Petrol</option>
                  <option value="HSD">HSD · Diesel</option>
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
                {linkedDeliveries.map((d) => (
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
              <p>{item.description || "No additional details recorded."}</p>
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
                      {number(item.liters)} L · {item.grade} · {item.supplier}
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
                      {linkedDeliveries.find((d) => d.id === item.delivery_id)
                        ?.reference || item.delivery_id.slice(0, 8)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            {!terminal.includes(item.status) && (
              <form
                key={`${item.id}-${item.status}`}
                className="ops-transition"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await save("transition", {
                    id: item.id,
                    expected_status: item.status,
                    status: f.get("status"),
                    note: f.get("note"),
                    delivery_id: f.get("delivery_id"),
                  });
                }}
              >
                <h3>Next action</h3>
                <label>
                  Action
                  <select name="status" required defaultValue="">
                    <option value="" disabled>
                      Choose an action
                    </option>
                    {(owner || item.assigned_to === data.member?.user_id) &&
                      config.stages
                        .slice(
                          config.stages.indexOf(item.status) + 1,
                          config.stages.indexOf(item.status) + 2,
                        )
                        .filter(
                          (s) =>
                            !(
                              kind === "handover" &&
                              item.assigned_to !== data.member?.user_id
                            ) &&
                            !(kind === "indent" && s === "approved" && !owner),
                        )
                        .map((s) => (
                          <option key={s} value={s}>
                            {label(s)}
                          </option>
                        ))}
                    {owner && (
                      <option value="cancelled">Cancel with a reason</option>
                    )}
                  </select>
                </label>
                {kind === "indent" &&
                  ["approved", "dispatched"].includes(item.status) && (
                    <label>
                      Linked delivery
                      <select
                        name="delivery_id"
                        defaultValue={item.delivery_id || ""}
                      >
                        <option value="">Choose a delivery</option>
                        {linkedDeliveries.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.reference} · {d.status}
                          </option>
                        ))}
                      </select>
                      <small>
                        Receipt is available only after this delivery has a
                        posted decant. Stock is posted once, through the
                        delivery workflow.
                      </small>
                    </label>
                  )}
                <label>
                  Decision / completion note
                  <textarea
                    name="note"
                    rows={2}
                    maxLength={4000}
                    placeholder="Record the decision or completed work (required to resolve, complete, or cancel)."
                  />
                </label>
                <Button
                  disabled={
                    busy ||
                    (!owner && item.assigned_to !== data.member?.user_id)
                  }
                >
                  {busy ? "Saving…" : "Confirm action"}
                  <ArrowRight size={15} />
                </Button>
              </form>
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
      {busy && <p role="status">Loading record history�</p>}
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
                � {date(e.created_at)}
              </span>
              {e.note && <p>{e.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
