import type { Metadata } from "next";
import { OfflineTerminal } from "@/components/offline-terminal";
export const metadata: Metadata = { title: "Offline field terminal" };
export default function OfflinePage() {
  return <OfflineTerminal />;
}
