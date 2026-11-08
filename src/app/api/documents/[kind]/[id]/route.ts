import { createReport, type ReportData } from "@/lib/report-pdf";
import { serverDb } from "@/lib/supabase/server";
import { z } from "zod";
import { date, number } from "@/lib/utils";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  if (
    !["claim", "parchi", "statement"].includes(kind) ||
    !z.uuid().safeParse(id).success
  )
    return new Response("Not found", { status: 404 });
  const db = await serverDb();
  const { data: record, error } = await db
    .from(
      kind === "claim"
        ? "deliveries"
        : kind === "statement"
          ? "accounts"
          : "parchis",
    )
    .select("*")
    .eq("id", id)
    .single();
  if (error || !record) return new Response("Not found", { status: 404 });
  if (kind === "claim" && !["approved", "decanted"].includes(record.status))
    return new Response("Owner approval required", { status: 409 });
  const { data: station } = await db
    .from("stations")
    .select("name,omc,city")
    .eq("id", record.station_id)
    .single();
  const report: ReportData = {
    title:
      kind === "claim"
        ? "Delivery shortage claim"
        : kind === "statement"
          ? "Account statement"
          : "Digital parchi receipt",
    subtitle: "Independent station records. Clear commercial documentation.",
    reference: record.reference || id.slice(0, 8).toUpperCase(),
    recordId: id,
    station: station?.name || "Station",
    location: `${station?.city || ""} / ${station?.omc || ""}`,
    issued: record.created_at
      ? date(record.created_at)
      : date(new Date().toISOString()),
    sample: (station?.name || "").includes("Sample"),
    rows: [],
    total: { label: "Amount", value: "" },
    notes: [
      "This document records saved station measurements and transactions. It is not a tax invoice.",
    ],
  };
  if (kind === "claim") {
    report.rows = [
      {
        label: "Vehicle / loading depot",
        value: `${record.vehicle} / ${record.depot}`,
      },
      { label: "Invoice volume", value: `${number(record.invoice, 3)} L` },
      {
        label: "Measured arrival volume",
        value: `${number(record.measured, 3)} L`,
      },
      {
        label: "Gantry / arrival temperature",
        value: `${record.loading_temp} C / ${record.measurement?.arrival_temp} C`,
      },
      { label: "Thermal coefficient", value: `${record.beta} per C` },
      {
        label: "Calculated thermal allowance",
        value: `${number(record.allowance, 3)} L`,
      },
      {
        label: "Unexplained shortage",
        value: `${number(record.shortage, 3)} L`,
      },
      {
        label: "Locked retail rate",
        value: `PKR ${number(record.price, 2)} / L`,
      },
      {
        label: "Owner approval (PKT)",
        value: record.approved_at
          ? date(record.approved_at)
          : "Approval timestamp unavailable",
      },
      {
        label: "Evidence record",
        value:
          record.measurement?.evidence_id ||
          "No evidence attached to this sample record",
      },
    ];
    report.total = {
      label: "Calculated claim for settlement review",
      value: `PKR ${number(record.claim, 2)}`,
    };
    report.notes.push(
      "Subject to measurement review and agreed commercial terms. A discrepancy does not establish theft or legal liability.",
    );
  } else if (kind === "parchi") {
    const [{ data: vehicle }, { data: account }] = await Promise.all([
      db
        .from("vehicles")
        .select("registration")
        .eq("id", record.vehicle_id)
        .single(),
      db.from("accounts").select("name").eq("id", record.account_id).single(),
    ]);
    report.rows = [
      { label: "Corporate account", value: account?.name || "-" },
      { label: "Vehicle", value: vehicle?.registration || "-" },
      { label: "Litres dispensed", value: `${number(record.liters, 2)} L` },
      {
        label: "Locked fuel price",
        value: `PKR ${number(record.price, 2)} / L`,
      },
      { label: "Shift record", value: record.shift_id },
      { label: "Evidence record", value: record.evidence_id },
    ];
    report.total = {
      label: "Credit amount recorded",
      value: `PKR ${number(record.amount, 2)}`,
    };
  } else {
    report.rows = [
      { label: "Corporate account", value: record.name },
      {
        label: "Approved credit limit",
        value: `PKR ${number(record.credit_limit, 2)}`,
      },
      {
        label: "Statement generated (PKT)",
        value: date(new Date().toISOString()),
      },
    ];
    // Paginate the ledger instead of silently truncating at the Data API row limit.
    const entries: { at: string; label: string; value: string }[] = [];
    for (const table of ["parchis", "payments"]) {
      for (let offset = 0; ; offset += 1000) {
        const { data: rows, error: ledgerError } = await db
          .from(table)
          .select("*")
          .eq("account_id", id)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + 999);
        if (ledgerError)
          return new Response("Unable to load account ledger", { status: 503 });
        for (const r of rows || [])
          entries.push({
            at: r.created_at,
            label:
              table === "parchis"
                ? `Fuel credit / ${number(r.liters, 2)} L / ${r.id.slice(0, 8)}`
                : `Payment / ${r.reference}`,
            value: `${table === "parchis" ? "+" : "-"} PKR ${number(r.amount, 2)}`,
          });
        if (!rows || rows.length < 1000) break;
        if (offset >= 19000)
          return new Response(
            "This ledger requires a date-bounded export. Contact the station administrator.",
            { status: 413 },
          );
      }
    }
    entries.sort((a, b) => a.at.localeCompare(b.at));
    report.rows.push(
      ...entries.map((r) => ({
        label: `${date(r.at)} / ${r.label}`,
        value: r.value,
      })),
    );
    if (!entries.length)
      report.rows.push({
        label: "Ledger activity",
        value: "No recorded transactions",
      });
    report.total = {
      label: "Current recorded outstanding balance",
      value: `PKR ${number(record.balance, 2)}`,
    };
    report.notes.push(
      "The balance is the account balance at generation time. Synthetic opening balances in Design Lab are not represented as payment transactions.",
    );
  }
  const bytes = await createReport(report);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pumpshield-${kind}-${id.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
