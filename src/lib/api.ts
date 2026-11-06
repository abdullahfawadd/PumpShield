export async function command(op: string, p: Record<string, unknown>) {
  const response = await fetch("/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, p }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Unable to save. Try again.");
  return result as { id: string };
}
