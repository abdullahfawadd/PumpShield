export class FieldError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "FieldError";
  }
}
export async function field<T = Record<string, unknown>>(
  op: string,
  p: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/field", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, p }),
    cache: "no-store",
    signal,
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "The connection did not return a complete response. The draft was kept.",
    );
  }
  if (!response.ok)
    throw new FieldError(
      result.error || "Unable to update station work",
      response.status,
    );
  return result as T;
}
