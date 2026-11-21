import { calibrationDocument } from "@/lib/command-contract";
import { serverDb } from "@/lib/supabase/server";
import { z } from "zod";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return new Response("Not found", { status: 404 });
  const db = await serverDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  const { data: member } = await db
    .from("memberships")
    .select("workspace_id,role,active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member?.active || member.role !== "owner")
    return new Response("Not found", { status: 404 });
  const { data: tank } = await db
    .from("tanks")
    .select("calibration_document")
    .eq("id", id)
    .eq("workspace_id", member.workspace_id)
    .maybeSingle();
  const document = calibrationDocument.safeParse(tank?.calibration_document);
  if (!document.success) return new Response("Not found", { status: 404 });
  const { data: file } = await db.storage
    .from("tank-calibrations")
    .download(document.data.path);
  if (!file)
    return new Response("Calibration file unavailable", { status: 503 });

  const extension = document.data.path.split(".").at(-1);
  const encoded = encodeURIComponent(document.data.name.toWellFormed()).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16)}`,
  );
  return new Response(file, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="tank-calibration.${extension}"; filename*=UTF-8''${encoded}`,
    },
  });
}
