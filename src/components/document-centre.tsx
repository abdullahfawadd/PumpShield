"use client";
import { useMemo, useState } from "react";
import { ArrowUpRight, FileText, Search } from "@/components/icons";
import type { Dashboard } from "@/lib/types";
import { date } from "@/lib/utils";
export function DocumentCentre({
  data,
  stationId,
}: {
  data: Dashboard;
  stationId: string;
}) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const rows = useMemo(
    () =>
      [
        ...data.deliveries
          .filter(
            (d) =>
              d.station_id === stationId &&
              ["approved", "decanted"].includes(d.status),
          )
          .map((d) => ({
            id: d.id,
            kind: "claim",
            type: "Delivery claim",
            title: d.reference,
            subtitle: `${d.vehicle} · ${d.depot}`,
            at: d.approved_at,
            href: `/api/documents/claim/${d.id}`,
          })),
        ...data.parchis
          .filter((p) => p.station_id === stationId)
          .map((p) => ({
            id: p.id,
            kind: "parchi",
            type: "Fuel parchi",
            title: p.id.slice(0, 8).toUpperCase(),
            subtitle:
              data.accounts.find((a) => a.id === p.account_id)?.name ||
              "Account",
            at: p.created_at,
            href: `/api/documents/parchi/${p.id}`,
          })),
        ...data.accounts
          .filter((a) => a.station_id === stationId)
          .map((a) => ({
            id: a.id,
            kind: "statement",
            type: "Account statement",
            title: a.name,
            subtitle: "Current ledger statement",
            at: "",
            href: `/api/documents/statement/${a.id}`,
          })),
      ].sort((a, b) => (b.at || "").localeCompare(a.at || "")),
    [data, stationId],
  );
  const visible = rows.filter(
    (r) =>
      (kind === "all" || r.kind === kind) &&
      `${r.title} ${r.subtitle}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="document-centre">
      <div className="ops-heading">
        <div>
          <h2>Recent documents</h2>
          <p>Approved claims, issued parchis and current account statements.</p>
        </div>
        <span className="document-count">
          {visible.length}
          <small>
            {visible.length === rows.length
              ? "loaded documents"
              : `of ${rows.length} loaded`}
          </small>
        </span>
      </div>
      <div className="ops-toolbar">
        <label>
          <Search size={16} />
          <input
            aria-label="Search documents"
            placeholder="Search reference, vehicle, or account…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Document type"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="all">All documents</option>
          <option value="claim">Delivery claims</option>
          <option value="parchi">Fuel parchis</option>
          <option value="statement">Account statements</option>
        </select>
      </div>
      <div className="document-list">
        {visible.map((r) => (
          <a
            key={`${r.kind}-${r.id}`}
            href={r.href}
            target="_blank"
            rel="noreferrer"
          >
            <span className={`document-icon document-${r.kind}`}>
              <FileText size={22} />
            </span>
            <div>
              <span>{r.type}</span>
              <h3>{r.title}</h3>
              <p>{r.subtitle}</p>
            </div>
            <time>{r.at ? date(r.at) : "Current"}</time>
            <span className="document-open">
              Open PDF
              <ArrowUpRight size={15} />
            </span>
          </a>
        ))}
        {!visible.length && (
          <div className="ops-empty">
            <FileText size={24} />
            <h3>
              {search || kind !== "all"
                ? "No matching documents"
                : "No documents yet"}
            </h3>
            {search || kind !== "all" ? (
              <button
                className="text-link"
                onClick={() => {
                  setSearch("");
                  setKind("all");
                }}
              >
                Clear filters
              </button>
            ) : (
              <p>
                Documents appear after approved deliveries and recorded fills.
              </p>
            )}
          </div>
        )}
      </div>
      <p className="ops-footnote">
        Recent records only: up to 200 deliveries and 200 parchis loaded for the
        workspace. Statements use the current account ledger when opened. PDFs
        require sign-in.
      </p>
    </section>
  );
}
