import { NextResponse } from "next/server";
import { serverDb } from "@/lib/supabase/server";
import { z } from "zod";
const schema = z.object({
  op: z.enum(["create", "read", "revoke", "status", "ping"]),
  p: z.record(z.string(), z.unknown()),
});
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  const body = await request.text();
  if (body.length > 4000)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  let parsed;
  try {
    parsed = schema.safeParse(JSON.parse(body));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const db = await serverDb();
  const { data, error } = await db.rpc("tracking", parsed.data);
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === "P0001" ? error.message : "Invalid tracking request",
      },
      { status: 400 },
    );
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
