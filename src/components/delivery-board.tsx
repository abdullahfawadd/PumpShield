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
} from "@/components/icons";
import { toast } from "sonner";
import type { Delivery } from "@/lib/types";
import { date, number } from "@/lib/utils";
import { useMobileLayout } from "@/lib/use-mobile-layout";
const stages = [
  {
    id: "dispatched",
    name: "In transit",
    description: "Dispatch registered",
    icon: Truck,
  },
  {
    id: "submitted",
    name: "Ready for review",
    description: "Pre-decant audit submitted",
    icon: ClipboardCheck,
  },
  {
    id: "approved",
    name: "Cleared to decant",
    description: "Owner approval recorded",
    icon: LockKeyhole,
  },
  {
    id: "decanted",
    name: "Completed",
    description: "Stock received and posted",
    icon: CheckCircle2,
  },
] as const;
export function DeliveryBoard({
  deliveries,
  owner,
  onOpen,
}: {
  deliveries: Delivery[];
  owner: boolean;
  onOpen: (id: string) => void;
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
      aria-label="Delivery movement board"
    >
      <div className="movement-summary">
        <div>
          <h2>Delivery pipeline</h2>
          <p>
            {visible.length} {visible.length === 1 ? "delivery" : "deliveries"}{" "}
            · open a record for its next verified step
          </p>
        </div>
        <div className="delivery-view-controls">
          <select
            aria-label="Filter delivery stage"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All stages</option>
            {stages.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
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
          {(filter !== "all" || view !== "auto") && (
            <button
              className="text-link"
              onClick={() => {
                setFilter("all");
                setView("auto");
              }}
            >
              Reset view
            </button>
          )}
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
                  aria-label={s.name}
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
                      {s.name}
                    </span>
                    <b>{cards.length}</b>
                  </header>
                  <p className="column-caption">{s.description}</p>
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
                          <GripVertical size={15} />
                        </div>
                        <button
                          className="movement-card-title"
                          onClick={() => onOpen(d.id)}
                        >
                          {d.vehicle}
                          <ArrowUpRight size={17} />
                        </button>
                        <div className="board-route">
                          <span>{d.depot}</span>
                          <i />
                          <span>Receiving station</span>
                        </div>
                        {owner && (
                          <div className="board-volume">
                            <strong>{number(d.invoice)}</strong>
                            <span>litres / invoice</span>
                          </div>
                        )}
                        <div className="board-timestamp">
                          <Clock3 size={12} />
                          {date(d.created_at)}
                        </div>
                        <div className="board-card-actions">
                          <button onClick={() => onOpen(d.id)}>
                            {d.status === "dispatched"
                              ? "Start arrival audit"
                              : d.status === "submitted"
                                ? owner
                                  ? "Review audit"
                                  : "Awaiting owner"
                                : d.status === "approved"
                                  ? "Confirm decant"
                                  : "View record"}
                            <ArrowUpRight size={13} />
                          </button>
                          {owner &&
                            ["approved", "decanted"].includes(d.status) && (
                              <a
                                href={`/api/documents/claim/${d.id}`}
                                target="_blank"
                                rel="noreferrer"
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
                        <span>No deliveries in this stage</span>
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
                  <span className={`status delivery-status-${d.status}`}>
                    <stage.icon size={14} />
                    {stage.name}
                  </span>
                  <h3>{d.vehicle}</h3>
                  <p>
                    {d.reference} · {d.depot}
                  </p>
                </div>
                {owner && (
                  <div className="delivery-list-quantity">
                    <strong>{number(d.invoice)}</strong>
                    <span>L invoice</span>
                  </div>
                )}
                <time dateTime={d.created_at}>{date(d.created_at)}</time>
                <button
                  className="button button-secondary"
                  onClick={() => onOpen(d.id)}
                >
                  {d.status === "dispatched"
                    ? "Start arrival audit"
                    : d.status === "submitted"
                      ? owner
                        ? "Review audit"
                        : "View submitted audit"
                      : d.status === "approved"
                        ? "Confirm decant"
                        : "View record"}
                  <ArrowUpRight size={15} />
                </button>
              </article>
            );
          })}
          {!visible.length && (
            <div className="board-empty">
              <Truck size={24} />
              <span>
                No deliveries{filter === "all" ? " yet" : " in this stage"}.
              </span>
              {filter !== "all" && (
                <button className="text-link" onClick={() => setFilter("all")}>
                  Clear stage filter
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <p className="movement-help">
        Moving a card opens its checklist. Stock changes only after approved
        decant confirmation.
      </p>
    </section>
  );
}
