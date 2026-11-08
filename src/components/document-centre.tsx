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
          <span className="ops-kicker">STATION RECORDS</span>
          <h2>Documents, in one place.</h2>
          <p>
            Verified delivery claims, fuel parchis, and current account
            statements.
          </p>
        </div>
        <span className="document-count">
          {rows.length}
          <small>available documents</small>
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
              {search
                ? "No matching documents"
                : "Your documents will appear here"}
            </h3>
            <p>
              Approved deliveries and issued credit fuel create their documents
              automatically.
            </p>
          </div>
        )}
      </div>
      <p className="ops-footnote">
        Based on the records loaded in this workspace (up to 200 recent
        deliveries and parchis). Statements are generated from the current
        account ledger when opened. PDFs require an authenticated session.
      </p>
    </section>
  );
}
