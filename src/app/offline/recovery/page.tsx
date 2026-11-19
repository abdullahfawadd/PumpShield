import type { Metadata } from "next";
import { OfflineTerminal } from "@/components/offline-terminal";

export const metadata: Metadata = { title: "Recover saved records" };

export default function RecoveryPage() {
  return <OfflineTerminal recoveryOnly />;
}
