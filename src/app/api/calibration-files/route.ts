import { calibrationDocument, commandInput } from "@/lib/command-contract";
import {
  CALIBRATION_CHART_FILE_BYTES,
  readCalibrationChartFile,
} from "@/lib/calibration-chart-file";
import { serverDb } from "@/lib/supabase/server";

const extensions: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "text/csv": "csv",
  "text/tab-separated-values": "tsv",
  "text/plain": "txt",
};
const maxSetupBytes = 200_000;
const maxRequestBytes = CALIBRATION_CHART_FILE_BYTES + maxSetupBytes + 8192;

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return errorResponse("Origin not allowed", 403);
  const contentType = request.headers.get("content-type");
  if (
    !contentType?.toLowerCase().startsWith("multipart/form-data;") ||
    !request.body
  )
    return errorResponse("Choose a calibration file and try again.", 415);

  const db = await serverDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return errorResponse("Sign in required", 401);
  const { data: member } = await db
    .from("memberships")
    .select("workspace_id,role,active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member?.active || member.role !== "owner")
    return errorResponse("Only a workspace owner can configure a tank.", 403);

  // Bound the stream before parsing multipart, including when a browser omits Content-Length.
  let size = 0;
  let tooLarge = false;
  const limiter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      size += chunk.byteLength;
      if (size > maxRequestBytes) {
        tooLarge = true;
        controller.error(new Error("Request too large"));
      } else controller.enqueue(chunk);
    },
  });
  let source: File;
  let payload: unknown;
  try {
    const form = await new Response(request.body.pipeThrough(limiter), {
      headers: { "content-type": contentType },
    }).formData();
    const file = form.get("source");
    const setup = form.get("setup");
    if (
      !(file instanceof File) ||
      form.getAll("source").length !== 1 ||
      typeof setup !== "string"
    )
      return errorResponse("Choose one calibration source file.", 400);
    if (new TextEncoder().encode(setup).byteLength > maxSetupBytes)
      return errorResponse(
        "The calibration rows exceed the setup size limit.",
        413,
      );
    payload = JSON.parse(setup);
    source = file;
  } catch {
    return tooLarge
      ? errorResponse("Choose a chart file that is 4 MB or smaller.", 413)
      : errorResponse("The calibration upload could not be read.", 400);
  }

  const parsed = commandInput.safeParse({ op: "tank", p: payload });
  if (!parsed.success || parsed.data.op !== "tank")
    return errorResponse("Check the tank details and calibration rows.", 400);
  const { station_id: stationId } = parsed.data.p;
  const { data: station } = await db
    .from("stations")
    .select("id")
    .eq("id", stationId)
    .eq("workspace_id", member.workspace_id)
    .maybeSingle();
  if (!station) return errorResponse("Station not found", 404);

  let documentType: string;
  try {
    ({ contentType: documentType } = await readCalibrationChartFile(source));
  } catch (cause) {
    return errorResponse(
      cause instanceof Error
        ? cause.message
        : "Unable to read the calibration file.",
      400,
    );
  }
  const extension = extensions[documentType];
  const path = `${member.workspace_id}/${user.id}/${stationId}/${crypto.randomUUID()}.${extension}`;
  const document = calibrationDocument.parse({
    path,
    name:
      source.name
        .replace(/[\\/\p{Cc}]/gu, "_")
        .trim()
        .slice(0, 180) || `Calibration.${extension}`,
  });
  const bucket = db.storage.from("tank-calibrations");
  const { error: uploadError } = await bucket.upload(path, source, {
    contentType: documentType,
    upsert: false,
  });
  if (uploadError)
    return errorResponse(
      "Could not upload the calibration file. Try again.",
      503,
    );

  const { data, error } = await db.rpc("command", {
    op: "tank",
    p: { ...parsed.data.p, calibration_document: document },
  });
  if (error) {
    // Storage policy allows this cleanup only while the file is unlinked.
    await bucket.remove([path]);
    return errorResponse(
      error.code === "P0001"
        ? error.message
        : "Could not save the tank. Check its capacity and chart.",
      400,
    );
  }
  return Response.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
