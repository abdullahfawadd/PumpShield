import { NextResponse } from "next/server";
import { serverDb } from "@/lib/supabase/server";
import { z } from "zod";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return new NextResponse("Not found", { status: 404 });
  const db = await serverDb();
  const { data, error } = await db
    .from("evidence")
    .select("path")
    .eq("id", id)
    .single();
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  const { data: link, error: signError } = await db.storage
    .from("evidence")
    .createSignedUrl(data.path, 60);
  if (signError || !link)
    return new NextResponse("Unable to open evidence", { status: 503 });
  return NextResponse.redirect(link.signedUrl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
