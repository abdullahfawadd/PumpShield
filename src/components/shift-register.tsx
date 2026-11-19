"use client";

import { useState } from "react";
import { useClock } from "@/lib/use-clock";
import type { Shift } from "@/lib/types";
import { date, money, number } from "@/lib/utils";
import { ArrowUpRight } from "./icons";
import { Button } from "./ui/button";
const statusLabel = {
  open: "Open",
  review: "Needs review",
  verified: "Verified",
};
export function ShiftRegister({
  shifts,
  owner,
  privateMode,
  onOpen,
}: {
  shifts: Shift[];
  owner: boolean;
  privateMode: boolean;
  onOpen: (type: string, id: string) => void;
}) {
  const now = useClock();
  const [filter, setFilter] = useState<Shift["status"] | "all">("all");
  const visible =
    filter === "all"
      ? shifts
      : shifts.filter((shift) => shift.status === filter);
  const action = (s: Shift) => (
    <Button
      variant={
        s.status === "open" || (owner && s.status === "review")
          ? "default"
          : "secondary"
      }
      size="sm"
      onClick={() =>
        onOpen(s.status === "open" ? "close_shift" : "shift_detail", s.id)
      }
    >
      {s.status === "open"
        ? "Close shift"
        : owner && s.status === "review"
          ? "Review"
          : "View record"}
      <ArrowUpRight size={14} />
    </Button>
  );
  const variance = (s: Shift) =>
    s.result
      ? privateMode
        ? "PKR ••••••"
        : money(s.result.cash_variance)
      : "—";
  const badge = (s: Shift) => {
    const overdue = s.status === "open" && Date.parse(s.due_at) <= now;
    return (
      <span className={`status status-${overdue ? "overdue" : s.status}`}>
        {overdue ? "Overdue" : statusLabel[s.status]}
      </span>
    );
  };
  return (
    <section className="shift-register" aria-label="Shift records">
      {shifts.length > 1 && (
        <div className="shift-register-toolbar">
          <select
            aria-label="Filter shifts by status"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as Shift["status"] | "all")
            }
          >
            <option value="all">All shifts</option>
            <option value="open">Open</option>
            <option value="review">Needs review</option>
            <option value="verified">Verified</option>
          </select>
          <span className="workflow-result-count" role="status">
            {visible.length} {visible.length === 1 ? "shift" : "shifts"}
          </span>
        </div>
      )}
      {visible.length === 0 ? (
        <div className="shift-register-empty">
          <p>No shifts match this status.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setFilter("all")}
          >
            Show all shifts
          </Button>
        </div>
      ) : (
        <>
          <div
            className="table-scroll ledger-shift-desktop"
            role="region"
            aria-label="Shift reconciliation register"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Shift</th>
                  <th>Opened · PKT</th>
                  <th>Status</th>
                  {owner && (
                    <>
                      <th>Dispensed · L</th>
                      <th>Cash variance · PKR</th>
                    </>
                  )}
                  <th>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                    </td>
                    <td>
                      <time dateTime={s.opened_at}>{date(s.opened_at)}</time>
                    </td>
                    <td>{badge(s)}</td>
                    {owner && (
                      <>
                        <td>{s.result ? number(s.result.liters, 1) : "—"}</td>
                        <td
                          className={
                            s.result && Math.abs(s.result.cash_variance) > 0.01
                              ? "text-danger"
                              : ""
                          }
                        >
                          {variance(s)}
                        </td>
                      </>
                    )}
                    <td>{action(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ledger-shift-mobile">
            {visible.map((s) => (
              <article key={s.id}>
                <header>
                  <strong>{s.name}</strong>
                  {badge(s)}
                </header>
                <p>
                  {s.status === "open" ? "Cutoff" : "Closed"}{" "}
                  <time dateTime={s.status === "open" ? s.due_at : s.closed_at}>
                    {date(s.status === "open" ? s.due_at : s.closed_at)}
                  </time>
                </p>
                {owner && s.result && (
                  <dl>
                    <div>
                      <dt>Dispensed</dt>
                      <dd>{number(s.result.liters, 1)} L</dd>
                    </div>
                    <div>
                      <dt>Cash variance</dt>
                      <dd
                        className={
                          Math.abs(s.result.cash_variance) > 0.01
                            ? "text-danger"
                            : ""
                        }
                      >
                        {variance(s)}
                      </dd>
                    </div>
                  </dl>
                )}
                {action(s)}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
