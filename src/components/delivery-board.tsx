"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  GripVertical,
  LockKeyhole,
  Truck,
  Clock3,
  CheckCircle2,
  ClipboardCheck,
  Search,
  Columns3,
  Menu,
} from "@/components/icons";
import { toast } from "sonner";
import type { Delivery } from "@/lib/types";
import { deliveryStageLabel } from "@/lib/delivery-stages";
import { date, number } from "@/lib/utils";
import { useMobileLayout } from "@/lib/use-mobile-layout";
const stages = [
  {
    id: "dispatched",
    icon: Truck,
  },
  {
    id: "submitted",
    icon: ClipboardCheck,
  },
  {
    id: "approved",
    icon: LockKeyhole,
  },
  {
    id: "decanted",
    icon: CheckCircle2,
  },
] as const;
function deliveryAction(status: Delivery["status"], owner: boolean) {
  switch (status) {
    case "dispatched":
      return "Start arrival audit";
    case "submitted":
      return owner ? "Review audit" : "View submitted audit";
    case "approved":
      return "Confirm receipt";
    case "decanted":
      return "View receipt";
  }
}
export function DeliveryBoard({
  deliveries,
  owner,
  onOpen,
  search,
  onSearchChange,
}: {
  deliveries: Delivery[];
  owner: boolean;
  onOpen: (id: string) => void;
  search: string;
  onSearchChange: (query: string) => void;
}) {
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"auto" | "board" | "list">("auto");
  const mobile = useMobileLayout();
  const layout = view === "auto" ? (mobile ? "list" : "board") : view;
  const visible = deliveries.filter(
    (d) => filter === "all" || d.status === filter,
  );
  function move(id: string, target: string) {
    setDrag(null);
    setOver(null);
    const d = deliveries.find((d) => d.id === id);
    if (!d || d.status === target) return;
    const current = stages.findIndex((s) => s.id === d.status),
      next = stages.findIndex((s) => s.id === target);
    if (next !== current + 1) {
      toast.info(
        "Deliveries move forward one stage at a time. Open the card to review its history.",
      );
      return;
    }
    if (target === "approved" && !owner) {
      toast.error("Only the owner can approve a delivery audit.");
      return;
    }
    toast.info(
      target === "submitted"
        ? "Complete the measurements and camera evidence to move this delivery."
        : target === "approved"
          ? "Review the audit and confirm owner approval."
          : "Confirm unloading before stock is posted.",
    );
    onOpen(id);
  }
  return (
    <section
      className={`movement-workspace delivery-view-${layout}`}
      aria-label="Deliveries"
    >
      <div className="movement-summary">
        <div className="delivery-view-controls">
          <label className="delivery-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search vehicle or reference"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              aria-label="Search deliveries"
            />
          </label>
          <select
            aria-label="Filter delivery stage"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All stages</option>
            {stages.map((s) => (
              <option value={s.id} key={s.id}>
                {deliveryStageLabel(s.id)}
              </option>
            ))}
          </select>
          <div
            className="view-toggle"
            role="group"
            aria-label="Delivery layout"
          >
            <button
              type="button"
              aria-pressed={layout === "board"}
              onClick={() => setView("board")}
            >
              <Columns3 size={15} aria-hidden="true" />
              Board
            </button>
            <button
              type="button"
              aria-pressed={layout === "list"}
              onClick={() => setView("list")}
            >
              <Menu size={15} aria-hidden="true" />
              List
            </button>
          </div>
          {(filter !== "all" || search) && (
            <button
              type="button"
              className="text-link delivery-reset-view"
              onClick={() => {
                setFilter("all");
                onSearchChange("");
              }}
            >
              Clear filters
            </button>
          )}
          <span className="workflow-result-count" role="status">
            {visible.length} {visible.length === 1 ? "delivery" : "deliveries"}
          </span>
        </div>
      </div>
      {layout === "board" && (
        <div
          className={`movement-board ${filter !== "all" ? "board-filtered" : ""}`}
          role="region"
          aria-label="Delivery stages"
          tabIndex={0}
        >
          {stages
            .filter((s) => filter === "all" || s.id === filter)
            .map((s) => {
              const cards = deliveries.filter((d) => d.status === s.id);
              return (
                <section
                  key={s.id}
                  className={`movement-column column-${s.id} ${over === s.id ? "drop-active" : ""}`}
                  aria-label={deliveryStageLabel(s.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (drag) setOver(s.id);
                  }}
                  onDragLeave={() => setOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain") || drag;
                    if (id) move(id, s.id);
                  }}
                >
                  <header>
                    <span>
                      <s.icon size={17} />
                      {deliveryStageLabel(s.id)}
                    </span>
                    <b>{cards.length}</b>
                  </header>
                  <div className="movement-cards">
                    {cards.map((d) => (
                      <article
                        key={d.id}
                        draggable={d.status !== "decanted"}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", d.id);
                          setDrag(d.id);
                        }}
                        onDragEnd={() => {
                          setDrag(null);
                          setOver(null);
                        }}
                        className="movement-card"
                      >
                        <div className="movement-card-top">
                          <span>{d.reference}</span>
                          {d.status !== "decanted" && (
                            <GripVertical size={15} aria-hidden="true" />
                          )}
                        </div>
                        <h3 className="movement-card-title">{d.vehicle}</h3>
                        <p className="board-route">{d.depot}</p>
                        <div className="board-metadata">
                          {owner && (
                            <span className="board-invoice">
                              <strong>{number(d.invoice)} L</strong> invoice
                            </span>
                          )}
                          <time
                            className="board-timestamp"
                            dateTime={d.created_at}
                          >
                            <Clock3 size={13} aria-hidden="true" />
                            {date(d.created_at)}
                          </time>
                        </div>
                        <div className="board-card-actions">
                          <button type="button" onClick={() => onOpen(d.id)}>
                            {deliveryAction(d.status, owner)}
                            <ArrowUpRight size={13} />
                          </button>
                          {owner &&
                            ["approved", "decanted"].includes(d.status) && (
                              <a
                                href={`/api/documents/claim/${d.id}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open claim PDF ${d.reference} in a new tab`}
                              >
                                PDF
                              </a>
                            )}
                        </div>
                      </article>
                    ))}
                    {!cards.length && (
                      <div className="board-empty">
                        <s.icon size={25} strokeWidth={1} />
                        <span>{search ? "No matches" : "No deliveries"}</span>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
        </div>
      )}
      {layout === "list" && (
        <div className="delivery-list" aria-label="Delivery list">
          {visible.map((d) => {
            const stage = stages.find((s) => s.id === d.status)!;
            return (
              <article key={d.id} className="delivery-list-card">
                <div className="delivery-list-identity">
                  <h3>{d.vehicle}</h3>
                  <p>
                    {d.reference} · {d.depot}
                  </p>
                </div>
                <div className="delivery-list-meta">
                  <span className={`status delivery-status-${d.status}`}>
                    <stage.icon size={14} />
                    {deliveryStageLabel(stage.id)}
                  </span>
                  <time dateTime={d.created_at}>{date(d.created_at)}</time>
                </div>
                {owner && (
                  <div className="delivery-list-quantity">
                    <strong>{number(d.invoice)}</strong>
                    <span>L invoice</span>
                  </div>
                )}
                <button
                  type="button"
                  className={`button ${d.status === "decanted" ? "button-secondary" : "button-primary"}`}
                  onClick={() => onOpen(d.id)}
                >
                  {deliveryAction(d.status, owner)}
                  <ArrowUpRight size={15} />
                </button>
              </article>
            );
          })}
          {!visible.length && (
            <div className="board-empty">
              <Truck size={24} />
              <span>
                {search
                  ? "No matching deliveries."
                  : filter === "all"
                    ? "No deliveries yet."
                    : "No deliveries in this stage."}
              </span>
              {(filter !== "all" || search) && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setFilter("all");
                    onSearchChange("");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {layout === "board" &&
        !mobile &&
        visible.some((delivery) => delivery.status !== "decanted") && (
          <p className="movement-help">
            Drag to the next stage to open its checklist.
          </p>
        )}
    </section>
  );
}
