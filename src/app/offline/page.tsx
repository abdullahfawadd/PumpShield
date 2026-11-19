import type { Metadata } from "next";
import { OfflineWorkspace } from "@/components/offline-workspace";
export const metadata: Metadata = { title: "Station workspace" };
export default function OfflinePage() {
  return <OfflineWorkspace />;
}
