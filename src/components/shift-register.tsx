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
  const action = (s: Shift) => (
    <Button
      variant="secondary"
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
  const badge = (s: Shift) => (
    <span className={`status status-${s.status}`}>
      {s.status === "open" && Date.parse(s.due_at) <= now
        ? "Overdue · close required"
        : statusLabel[s.status]}
    </span>
  );
  return (
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
            {shifts.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                </td>
                <td>{date(s.opened_at)}</td>
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
        {shifts.map((s) => (
          <article key={s.id}>
            <header>
              <strong>{s.name}</strong>
              {badge(s)}
            </header>
            <p>Opened {date(s.opened_at)}</p>
            {s.status === "open" && <p>Cutoff {date(s.due_at)}</p>}
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
  );
}
