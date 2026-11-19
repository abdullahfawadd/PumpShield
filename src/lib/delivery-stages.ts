import type { Delivery } from "./types";

export const DELIVERY_STAGES = [
  { status: "dispatched", label: "In transit" },
  { status: "submitted", label: "Awaiting approval" },
  { status: "approved", label: "Ready to receive" },
  { status: "decanted", label: "Received" },
] as const satisfies readonly { status: Delivery["status"]; label: string }[];

export function deliveryStageLabel(status: Delivery["status"]) {
  return (
    DELIVERY_STAGES.find((stage) => stage.status === status)?.label ?? status
  );
}
