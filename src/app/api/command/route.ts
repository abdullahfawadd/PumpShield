import { NextResponse } from "next/server";
import { serverDb } from "@/lib/supabase/server";
import { commandInput } from "@/lib/command-contract";
import { readSameOriginJson } from "../read-json-request";
export async function POST(request: Request) {
  const input = await readSameOriginJson(request, 200_000);
  if (!input.ok) return input.response;
  const parsed = commandInput.safeParse(input.body);
  if (!parsed.success) {
    const fields = parsed.error.issues
      .map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }))
      .slice(0, 12);
    return NextResponse.json(
      { error: "Check the required fields and numeric values.", fields },
      { status: 400 },
    );
  }
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
            ? parsed.data.op === "decant" &&
              error.message.includes('"tanks_check"')
              ? "The assigned tank has insufficient recorded capacity. Ask the owner to verify its stock and the arrival audit before retrying."
              : "A value is outside its allowed range. Check your measurements."
            : "Unable to save. Check all required values and try again.";
    return NextResponse.json({ error: safe }, { status: 400 });
  }
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
