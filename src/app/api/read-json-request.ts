type JsonRequestResult =
  | { ok: true; body: unknown }
  | { ok: false; response: Response };

/** Rejects cross-origin, oversized, or unreadable bodies before domain validation. */
export async function readSameOriginJson(
  request: Request,
  maxBytes: number,
): Promise<JsonRequestResult> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return {
      ok: false,
      response: Response.json({ error: "Origin not allowed" }, { status: 403 }),
    };
  }

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    reader = request.body?.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    let text = "";

    // Counting each chunk bounds buffering even when Content-Length is absent.
    while (reader) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => {});
        return {
          ok: false,
          response: Response.json(
            { error: "Request too large" },
            { status: 413 },
          ),
        };
      }
      text += decoder.decode(chunk.value, { stream: true });
    }

    const body: unknown = JSON.parse(text + decoder.decode());
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Invalid request" }, { status: 400 }),
    };
  } finally {
    reader?.releaseLock();
  }
}
