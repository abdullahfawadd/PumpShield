import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { serverDb } from "@/lib/supabase/server";
import { z } from "zod";
import { date, number } from "@/lib/utils";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  if (!["claim", "parchi"].includes(kind) || !z.uuid().safeParse(id).success)
    return new Response("Not found", { status: 404 });
  const db = await serverDb();
  const { data: record, error } = await db
    .from(kind === "claim" ? "deliveries" : "parchis")
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
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 780;
  const clean = (s: string) => s.replace(/[^\x20-\x7E]/g, "-");
  function line(label: string, value = "", size = 11) {
    page.drawText(clean(label).slice(0, 85), {
      x: 48,
      y,
      size,
      font: label === "PUMPSHIELD PK" ? bold : font,
      color: rgb(0.12, 0.14, 0.12),
    });
    if (value)
      page.drawText(clean(value).slice(0, 65), { x: 310, y, size, font });
    y -= 28;
  }
  line("PUMPSHIELD PK", "", 21);
  line(
    kind === "claim" ? "DELIVERY SHORTAGE CLAIM" : "DIGITAL PARCHI RECEIPT",
    "",
    15,
  );
  y -= 12;
  line(station?.name || "Station", station?.omc || "");
  line("Reference", record.reference || id.slice(0, 8));
  line("Record ID", id);
  line("Recorded (PKT)", date(record.created_at));
  y -= 15;
  if (kind === "claim") {
    line("Vehicle", record.vehicle);
    line("Depot", record.depot);
    line("Invoice volume", `${number(record.invoice, 3)} L`);
    line("Measured volume", `${number(record.measured, 3)} L`);
    line(
      "Gantry / arrival temperature",
      `${record.loading_temp} / ${record.measurement?.arrival_temp} C`,
    );
    line("Thermal coefficient", String(record.beta));
    line("Calculated thermal allowance", `${number(record.allowance, 3)} L`);
    line("Unexplained shortage", `${number(record.shortage, 3)} L`);
    line("Locked retail rate", `PKR ${number(record.price, 2)} / L`);
    y -= 10;
    line("Claim amount for settlement", `PKR ${number(record.claim, 2)}`, 14);
    y -= 20;
    line("Approved by owner (PKT)", date(record.approved_at));
    line("Evidence reference", record.measurement?.evidence_id || "");
    y -= 20;
    line("Subject to measurement review and agreed commercial terms.", "", 10);
    line("A discrepancy does not establish theft or legal liability.", "", 10);
  } else {
    const { data: vehicle } = await db
      .from("vehicles")
      .select("registration")
      .eq("id", record.vehicle_id)
      .single();
    const { data: account } = await db
      .from("accounts")
      .select("name")
      .eq("id", record.account_id)
      .single();
    line("Corporate account", account?.name || "");
    line("Vehicle", vehicle?.registration || "");
    line("Litres dispensed", `${number(record.liters, 2)} L`);
    line("Locked fuel rate", `PKR ${number(record.price, 2)} / L`);
    line("Credit amount", `PKR ${number(record.amount, 2)}`, 14);
    line("Shift reference", record.shift_id);
    line("Evidence reference", record.evidence_id);
  }
  page.drawText(
    "Generated from saved PumpShield records. This is not a tax invoice.",
    { x: 48, y: 55, size: 9, font, color: rgb(0.4, 0.4, 0.4) },
  );
  const bytes = await doc.save();
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pumpshield-${kind}-${id.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
