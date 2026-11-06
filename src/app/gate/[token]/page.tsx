import { notFound } from "next/navigation";
import { DriverGate } from "@/components/tracking";
export default async function Gate({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  return <DriverGate token={token} />;
}
