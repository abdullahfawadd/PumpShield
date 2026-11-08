import { NextResponse } from "next/server";
import { z } from "zod";
import { serverDb } from "@/lib/supabase/server";
const input = z.object({
  op: z.enum(["create", "comment", "transition"]),
  p: z.record(z.string(), z.unknown()),
});
export async function GET(request: Request) {
  const sid = new URL(request.url).searchParams.get("station");
  if (!z.uuid().safeParse(sid).success)
    return NextResponse.json({ error: "Choose a station" }, { status: 400 });
  const db = await serverDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const url = new URL(request.url);
  const item = url.searchParams.get("item");
  if (item) {
    if (!z.uuid().safeParse(item).success)
      return NextResponse.json({ error: "Invalid record" }, { status: 400 });
    const { data: record } = await db
      .from("station_work_items")
      .select("id")
      .eq("id", item)
      .eq("station_id", sid)
      .single();
    if (!record)
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    const before = url.searchParams.get("before");
    if (before && !/^[1-9][0-9]{0,14}$/.test(before))
      return NextResponse.json(
        { error: "Invalid history cursor" },
        { status: 400 },
      );
    let query = db
      .from("work_item_events")
      .select("id,actor_id,action,note,created_at")
      .eq("item_id", item)
      .order("id", { ascending: false })
      .limit(100);
    if (before) query = query.lt("id", before);
    const { data: events, error } = await query;
    if (error)
      return NextResponse.json(
        { error: "Unable to load record history" },
        { status: 400 },
      );
    return NextResponse.json(
      {
        events: events.toReversed(),
        next: events.length === 100 ? events.at(-1)?.id : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const { data, error } = await db.rpc("ops_snapshot", { sid });
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === "P0001"
            ? error.message
            : "Unable to load station work",
      },
      { status: 400 },
    );
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  const body = await request.text();
  if (body.length > 16000)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  let parsed;
  try {
    parsed = input.safeParse(JSON.parse(body));
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
  const { data, error } = await db.rpc("ops_command", parsed.data);
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
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
