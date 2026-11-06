import { NextResponse } from "next/server";
import { z } from "zod";
import { serverDb } from "@/lib/supabase/server";
const input = z.object({
  op: z.enum([
    "join",
    "station",
    "tank",
    "nozzle",
    "price",
    "invite",
    "revoke",
    "cancel_invite",
    "evidence",
    "delivery",
    "submit_delivery",
    "approve_delivery",
    "decant",
    "open_shift",
    "close_shift",
    "review_shift",
    "account",
    "vehicle",
    "disable_vehicle",
    "payment",
    "parchi",
  ]),
  p: z.record(z.string(), z.unknown()),
});
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  const text = await request.text();
  if (text.length > 200000)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  let parsed;
  try {
    parsed = input.safeParse(JSON.parse(text));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const db = await serverDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await db.rpc("command", parsed.data);
  if (error) {
    const safe =
      error.code === "P0001"
        ? error.message
        : error.code === "23505"
          ? "This record already exists. Refresh before retrying."
          : error.code === "23514"
            ? "A value is outside its allowed range. Check your measurements."
            : "Unable to save. Check all required values and try again.";
    return NextResponse.json({ error: safe }, { status: 400 });
  }
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
