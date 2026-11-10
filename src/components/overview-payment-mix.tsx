"use client";
import { useState } from "react";
import { number } from "@/lib/utils";
type MixKey = "cash" | "pos" | "credit";
const descriptions: Record<MixKey, string> = {
  cash: "Declared cash from submitted shifts.",
  pos: "POS collections from submitted shifts.",
  credit: "Credit sales from submitted shifts.",
};
export function OverviewPaymentMix({
  totals,
  privateMode,
}: {
  totals: Record<MixKey, number>;
  privateMode: boolean;
}) {
  const [selected, setSelected] = useState<MixKey>("cash");
  const mix = [
    { key: "cash" as const, label: "Cash", value: totals.cash },
    { key: "pos" as const, label: "POS", value: totals.pos },
    { key: "credit" as const, label: "Credit", value: totals.credit },
  ];
  const total = mix.reduce((sum, m) => sum + m.value, 0),
    circumference = 2 * Math.PI * 42;
  let offset = 0;
  return (
    <div className="overview-payment-mix">
      <div className="overview-section-title">
        <h3>Payment mix</h3>
        <span>{privateMode ? "••••••" : `${number(total)} PKR`} recorded</span>
      </div>
      <div className="overview-settlement">
        <div className="overview-payment-ring" aria-hidden="true">
          <svg viewBox="0 0 110 110">
            <circle
              className="ring-track"
              cx="55"
              cy="55"
              r="42"
              fill="none"
              strokeWidth="11"
            />
            {!privateMode &&
              total > 0 &&
              mix.map((m) => {
                const length = Math.max(0, (m.value / total) * circumference),
                  start = offset;
                offset += length;
                return (
                  <circle
                    key={m.key}
                    className={`ring-${m.key} ${selected === m.key ? "is-current" : ""}`}
                    cx="55"
                    cy="55"
                    r="42"
                    fill="none"
                    strokeWidth={selected === m.key ? 13 : 10}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-start}
                    transform="rotate(-90 55 55)"
                  />
                );
              })}
          </svg>
          <div>
            <strong>
              {privateMode
                ? "••"
                : total > 0
                  ? `${Math.round((totals[selected] / total) * 100)}%`
                  : "—"}
            </strong>
            <span>{mix.find((m) => m.key === selected)?.label}</span>
          </div>
        </div>
        <div
          className="overview-mix-options"
          role="group"
          aria-label="Inspect payment category"
        >
          {mix.map((m) => (
            <button
              key={m.key}
              aria-pressed={selected === m.key}
              onClick={() => setSelected(m.key)}
            >
              <i className={m.key} />
              <span>{m.label}</span>
              <strong>{privateMode ? "••••" : `${number(m.value)} PKR`}</strong>
            </button>
          ))}
        </div>
      </div>
      <p className="overview-mix-description" role="status">
        {descriptions[selected]}
      </p>
    </div>
  );
}
