import { redirect } from "next/navigation";
import { serverDb } from "@/lib/supabase/server";
import { Workspace } from "@/components/workspace";
export const dynamic = "force-dynamic";
export default async function App() {
  const db = await serverDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  let { data, error } = await db.rpc("dashboard");
  if (error) throw new Error("Unable to load workspace");
  if (!data.member) {
    await db.rpc("command", { op: "join", p: {} });
    const result = await db.rpc("dashboard");
    data = result.data;
    error = result.error;
    if (error) throw new Error("Unable to load access");
  }
  return <Workspace initial={data} email={user.email || ""} />;
}
