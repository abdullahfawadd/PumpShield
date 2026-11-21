import { NextResponse } from "next/server";
import { serverDb } from "@/lib/supabase/server";
import { z } from "zod";
export async function GET(
  request: Request,
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
  if (new URL(request.url).searchParams.get("format") === "preview") {
    const { data: photo } = await db.storage
      .from("evidence")
      .download(data.path);
    if (
      !photo ||
      !["image/jpeg", "image/png", "image/webp"].includes(photo.type)
    ) {
      return new NextResponse("Unable to open evidence", { status: 503 });
    }
    return new NextResponse(photo, {
      headers: {
        "Content-Type": photo.type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  const { data: link, error: signError } = await db.storage
    .from("evidence")
    .createSignedUrl(data.path, 60);
  if (signError || !link)
    return new NextResponse("Unable to open evidence", { status: 503 });
  return NextResponse.redirect(link.signedUrl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
