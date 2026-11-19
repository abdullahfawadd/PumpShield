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
            subtitle: "",
            at: "",
            href: `/api/documents/statement/${a.id}`,
          })),
      ].sort((a, b) => (b.at || "").localeCompare(a.at || "")),
    [data, stationId],
  );
  const visible = rows.filter(
    (r) =>
      (kind === "all" || r.kind === kind) &&
      `${r.title} ${r.subtitle} ${r.type}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <section className="document-centre" aria-label="Document library">
      <div className="document-toolbar">
        <label className="delivery-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
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
          <option value="all">All types</option>
          <option value="claim">Delivery claims</option>
          <option value="parchi">Fuel parchis</option>
          <option value="statement">Account statements</option>
        </select>
        <span className="workflow-result-count" role="status">
          {visible.length} {visible.length === 1 ? "document" : "documents"}
        </span>
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
              <FileText size={20} aria-hidden="true" />
            </span>
            <div className="document-identity">
              <span>{r.type}</span>
              <h3>{r.title}</h3>
              {r.subtitle && <p>{r.subtitle}</p>}
              {r.at && <time dateTime={r.at}>{date(r.at)}</time>}
            </div>
            <span className="document-open">
              <span>
                Open PDF<span className="sr-only"> in a new tab</span>
              </span>
              <ArrowUpRight size={16} aria-hidden="true" />
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
                Approved delivery claims and recorded fills will appear here.
              </p>
            )}
          </div>
        )}
      </div>
      {rows.length > 0 && (
        <p className="ops-footnote">
          Showing recent claims and parchis. Statements use the current ledger.
        </p>
      )}
    </section>
  );
}
