import { redirect } from "next/navigation";
import { serverDb } from "@/lib/supabase/server";
import { Workspace } from "@/components/workspace";
import { WorkspaceOfflineProvider } from "@/components/workspace-offline";
import {
  WorkspaceOnboarding,
  type OnboardingData,
} from "@/components/workspace-onboarding";
export const dynamic = "force-dynamic";
export default async function App() {
  const db = await serverDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await db.rpc("dashboard");
  if (error) throw new Error("Unable to load workspace");
  if (!data.member) {
    // Rendering a GET must never accept an invitation or create membership.
    const result = await db.rpc("onboarding");
    return (
      <WorkspaceOnboarding
        email={user.email || ""}
        data={
          (result.data || { revoked: false, invitations: [] }) as OnboardingData
        }
        unavailable={!!result.error}
      />
    );
  }
  return (
    <WorkspaceOfflineProvider
      key={`${user.id}:${data.member.workspace_id}`}
      userId={user.id}
      workspaceId={data.member.workspace_id}
    >
      <Workspace initial={data} email={user.email || ""} />
    </WorkspaceOfflineProvider>
  );
}
