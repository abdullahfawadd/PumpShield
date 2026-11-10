import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { z } from "zod";
import { serverDb } from "@/lib/supabase/server";
import { vehicleCredential } from "@/lib/vehicle-credential";
import { fuelGradeLabel } from "@/lib/fuel-grades";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return new NextResponse("Not found", { status: 404 });
  const db = await serverDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new NextResponse("Sign in required", { status: 401 });
  const { data: member } = await db
    .from("memberships")
    .select("role,active")
    .eq("user_id", user.id)
    .single();
  if (!member?.active || member.role !== "owner")
    return new NextResponse("Not found", { status: 404 });
  const { data: v } = await db
    .from("vehicles")
    .select("id,registration,token,grade,max_liters,active,account_id")
    .eq("id", id)
    .single();
  if (!v) return new NextResponse("Not found", { status: 404 });
  const { data: a } = await db
    .from("accounts")
    .select("name,station_id")
    .eq("id", v.account_id)
    .single();
  if (!a) return new NextResponse("Not found", { status: 404 });
  const { data: station } = await db
    .from("stations")
    .select("name")
    .eq("id", a.station_id)
    .single();
  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 595]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.12, 0.16, 0.2);
  const safe = (s: string) => s.normalize("NFKD").replace(/[^\x20-\x7e]/g, "-");
  const text = (
    s: string,
    x: number,
    y: number,
    size: number,
    strong = false,
  ) => {
    let value = safe(s);
    const face = strong ? bold : font;
    while (size > 9 && face.widthOfTextAtSize(value, size) > 352) size -= 0.5;
    if (face.widthOfTextAtSize(value, size) > 352) {
      while (value.length && face.widthOfTextAtSize(value + "...", size) > 352)
        value = value.slice(0, -1);
      value += "...";
    }
    page.drawText(value, {
      x,
      y,
      size,
      font: strong ? bold : font,
      color: ink,
    });
  };
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 420,
    height: 595,
    color: rgb(0.97, 0.98, 0.98),
  });
  text("PUMPSHIELD", 34, 549, 13, true);
  text(v.active ? "VEHICLE FUEL PASS" : "DISABLED VEHICLE PASS", 34, 524, 9);
  text(v.registration, 34, 478, 30, true);
  text(a.name, 34, 453, 12);
  text(station?.name || "Authorised station", 34, 433, 10);
  const qr = await QRCode.toBuffer(vehicleCredential(v.token), {
    width: 540,
    margin: 4,
    errorCorrectionLevel: "M",
  });
  const image = await doc.embedPng(qr);
  page.drawImage(image, { x: 100, y: 193, width: 220, height: 220 });
  text(`${fuelGradeLabel(v.grade)}  |  Maximum ${v.max_liters} L per fill`, 34, 161, 12, true);
  text("Scan this pass inside PumpShield Digital parchi.", 34, 131, 10);
  text("Every fill still requires staff sign-in, camera evidence", 34, 112, 10);
  text("and a live check of vehicle and account authorisation.", 34, 97, 10);
  text("Not a payment QR. Not a receipt or a guarantee of credit.", 34, 65, 8);
  text(`Vehicle record ${v.id}`, 34, 43, 7);
  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="pumpshield-vehicle-pass-${id.slice(0, 8)}.pdf"`,
    },
  });
}
