import { NextResponse } from "next/server";
import { z } from "zod";
import { serverDb } from "@/lib/supabase/server";
const schema = z.object({
  op: z.enum([
    "context",
    "station_position",
    "vehicle_lookup",
    "offline_evidence",
    "sync",
  ]),
  p: z.record(z.string(), z.unknown()),
});
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  const body = await request.text();
  if (body.length > 180000)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  let input;
  try {
    input = schema.safeParse(JSON.parse(body));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!input.success)
    return NextResponse.json(
      { error: "Invalid field request" },
      { status: 400 },
    );
  const db = await serverDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await db.rpc("field", input.data);
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === "P0001"
            ? error.message
            : "Check the required values and try again",
      },
      { status: 400 },
    );
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function GET() {
  const db = await serverDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data: member } = await db
    .from("memberships")
    .select("active,role,station_id")
    .eq("user_id", user.id)
    .single();
  if (!member?.active)
    return NextResponse.json(
      { error: "Active workspace access required" },
      { status: 403 },
    );
  // Munshi cannot SELECT owner-only station tables. Use the restricted projection
  // rather than weakening table RLS just to populate a device-setup dropdown.
  if (member.role === "munshi") {
    const { data: context, error } = await db.rpc("field", {
      op: "context",
      p: { station_id: member.station_id },
    });
    if (error || !context?.station)
      return NextResponse.json(
        { error: "Unable to load assigned station" },
        { status: 503 },
      );
    return NextResponse.json(
      {
        user_id: user.id,
        stations: [{ id: context.station.id, name: context.station.name }],
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const { data, error } = await db
    .from("stations")
    .select("id,name")
    .order("name");
  if (error)
    return NextResponse.json(
      { error: "Unable to load stations" },
      { status: 503 },
    );
  return NextResponse.json(
    { user_id: user.id, stations: data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
