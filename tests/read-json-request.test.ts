import { describe, expect, it, vi } from "vitest";
import { readSameOriginJson } from "../src/app/api/read-json-request";

const origin = "https://station.example";

function post(body: BodyInit, requestOrigin = origin) {
  const init: RequestInit & { duplex: "half" } = {
    method: "POST",
    body,
    headers: { origin: requestOrigin },
    duplex: "half",
  };
  return new Request(`${origin}/api/command`, init);
}

describe("same-origin JSON request boundary", () => {
  it("accepts an exact byte limit with a Unicode character split across chunks", async () => {
    const bytes = new TextEncoder().encode('"€"');
    const request = post(
      new ReadableStream({
        start(controller) {
          controller.enqueue(bytes.slice(0, 2));
          controller.enqueue(bytes.slice(2));
          controller.close();
        },
      }),
    );

    await expect(readSameOriginJson(request, 5)).resolves.toEqual({
      ok: true,
      body: "€",
    });
  });

  it("cancels a stream that exceeds the byte limit without Content-Length", async () => {
    const cancel = vi.fn();
    const bytes = new TextEncoder().encode('"€"');
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.slice(0, 2));
        controller.enqueue(bytes.slice(2));
      },
      cancel,
    });

    const result = await readSameOriginJson(post(stream), 4);
    if (result.ok) throw new Error("Expected body size rejection");
    expect(result.response.status).toBe(413);
    await expect(result.response.json()).resolves.toEqual({
      error: "Request too large",
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });

  it("rejects cross-origin requests before consuming the body", async () => {
    const request = post("{}", "https://other.example");

    const result = await readSameOriginJson(request, 8);
    if (result.ok) throw new Error("Expected origin rejection");
    expect(result.response.status).toBe(403);
    expect(request.bodyUsed).toBe(false);
  });

  it("returns the same client error for malformed JSON and a failed body read", async () => {
    const brokenBody = new ReadableStream({
      start(controller) {
        controller.error(new Error("Request ended"));
      },
    });

    for (const request of [post("{"), post(brokenBody)]) {
      const result = await readSameOriginJson(request, 8);
      if (result.ok) throw new Error("Expected invalid request");
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toEqual({
        error: "Invalid request",
      });
    }
  });
});
