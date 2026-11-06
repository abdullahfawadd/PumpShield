import { NextResponse } from "next/server";
import { serverDb } from "@/lib/supabase/server";
export async function GET() {
  const db = await serverDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await db.rpc("dashboard");
  if (error)
    return NextResponse.json(
      { error: "Unable to load station records" },
      { status: 503 },
    );
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
