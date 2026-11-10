"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { command } from "@/lib/api";
import { browserDb } from "@/lib/supabase/client";
import { Brand } from "./brand";
import { Button } from "./ui/button";

export type OnboardingData = {
  revoked: boolean;
  invitations: {
    id: string;
    workspace: string;
    station: string;
    name: string;
    expires_at: string;
  }[];
};

export function WorkspaceOnboarding({
  email,
  data,
  unavailable = false,
}: {
  email: string;
  data: OnboardingData;
  unavailable?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(op: string, p: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await command(op, p);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to complete this action.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="onboarding">
      <Brand />
      <section className="onboarding-card">
        <h1>
          {data.revoked ? "Workspace access revoked" : "Choose your workspace"}
        </h1>
        <p className="muted">Signed in as {email}</p>
        {unavailable ? (
          <p role="alert" className="form-error">
            Workspace setup is temporarily unavailable. Try again after the
            service update.
          </p>
        ) : data.revoked ? (
          <p>
            Contact the workspace owner to restore access. Your saved records
            remain in the audit history.
          </p>
        ) : (
          <>
            {data.invitations.length > 0 && (
              <section aria-label="Your invitations">
                <h2>Station invitations</h2>
                <p>
                  Review the business and assigned station before accepting
                  access as a Munshi.
                </p>
                {data.invitations.map((invite) => (
                  <article key={invite.id} className="invitation-choice">
                    <h3>{invite.workspace}</h3>
                    <p>{invite.station} · Munshi</p>
                    <p className="fine-print">
                      Invitation for {invite.name} · expires{" "}
                      {new Date(invite.expires_at).toLocaleDateString("en-PK", {
                        timeZone: "Asia/Karachi",
                      })}
                    </p>
                    <div className="account-actions">
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void submit("accept_invite", {
                            invitation_id: invite.id,
                          })
                        }
                      >
                        Accept this invitation
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          void submit("decline_invite", {
                            invitation_id: invite.id,
                          })
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  </article>
                ))}
              </section>
            )}
            <details open={!data.invitations.length}>
              <summary>Create a business workspace</summary>
              <p className="muted">
                Create a workspace you own. Pending invitations are not accepted
                automatically.
              </p>
              <form
                className="form-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void submit("join", {
                    intent: "create_workspace",
                    person: f.get("person"),
                    name: f.get("name"),
                  });
                }}
              >
                <label>
                  Your name
                  <input
                    name="person"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </label>
                <label>
                  Business name
                  <input
                    name="name"
                    autoComplete="organization"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </label>
                <Button disabled={busy} type="submit">
                  Create my workspace
                </Button>
              </form>
            </details>
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {busy && <p role="status">Saving your choice…</p>}
        <Button
          variant="ghost"
          disabled={busy}
          onClick={async () => {
            await browserDb().auth.signOut();
            router.replace("/login");
            router.refresh();
          }}
        >
          Sign out
        </Button>
      </section>
    </main>
  );
}
