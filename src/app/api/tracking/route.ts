import { NextResponse } from "next/server";
import { serverDb } from "@/lib/supabase/server";
import { z } from "zod";
import { readSameOriginJson } from "../read-json-request";
const schema = z.object({
  op: z.enum(["create", "read", "revoke", "status", "ping"]),
  p: z.record(z.string(), z.unknown()),
});
export async function POST(request: Request) {
  const json = await readSameOriginJson(request, 4_000);
  if (!json.ok) return json.response;
  const parsed = schema.safeParse(json.body);
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
