"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { command } from "@/lib/api";
import { browserDb } from "@/lib/supabase/client";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { ArrowRight, Building2, Check, Droplets, Fuel } from "./icons";
import { ActionForm, Field, Select } from "./forms";

const setupSteps = [
  { label: "Business workspace", icon: Building2 },
  { label: "First station", icon: Fuel },
  { label: "Tanks, nozzles and prices", icon: Droplets },
];

function SetupFrame({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  return (
    <main id="main" className="station-onboarding">
      <header>
        <Brand />
      </header>
      <div className="station-onboarding-grid">
        <aside aria-label="Setup progress">
          <h2>Station setup</h2>
          <ol>
            {setupSteps.map(({ label, icon: Icon }, index) => (
              <li
                key={label}
                aria-current={index === step ? "step" : undefined}
              >
                <span>
                  {index < step ? <Check size={18} /> : <Icon size={18} />}
                </span>
                {label}
                {index < step && <small className="sr-only">Complete</small>}
              </li>
            ))}
          </ol>
        </aside>
        <section className="station-onboarding-card">{children}</section>
      </div>
    </main>
  );
}

export function StationFields() {
  return (
    <>
      <Field
        label="Station name"
        name="name"
        minLength={2}
        maxLength={100}
        placeholder="e.g. Clifton Petroleum"
      />
      <div className="form-grid">
        <Select
          label="Oil marketing company"
          name="omc"
          options={[
            "PSO",
            "PARCO Gunvor",
            "Wafi / Shell",
            "APL",
            "GO",
            "Other",
          ].map((label) => ({ value: label, label }))}
        />
        <Field
          label="City"
          name="city"
          maxLength={80}
          placeholder="e.g. Karachi"
        />
      </div>
    </>
  );
}

export function FirstStationSetup({
  onDone,
  onSignOut,
}: {
  onDone: () => void;
  onSignOut: () => Promise<void>;
}) {
  return (
    <SetupFrame step={1}>
      <span className="setup-stage">Step 2 of 3</span>
      <h1>Add your first station</h1>
      <p>
        Start with the name, company and city. You can configure equipment and
        rates next.
      </p>
      <ActionForm op="station" onDone={onDone} submit="Create station">
        <StationFields />
      </ActionForm>
      <Button variant="ghost" onClick={() => void onSignOut()}>
        Sign out
      </Button>
    </SetupFrame>
  );
}

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
  const [stage, setStage] = useState<"person" | "business">("person");
  const [person, setPerson] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
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
    <SetupFrame step={0}>
      <span className="setup-stage">Step 1 of 3</span>
      <h1 ref={heading} tabIndex={-1}>
        {data.revoked
          ? "Workspace access revoked"
          : data.invitations.length
            ? "Review your invitations"
            : "Create your workspace"}
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
                Review the business and assigned station before accepting access
                as a Munshi.
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
            <p>
              {stage === "person"
                ? "What should your team call you?"
                : "What is your business called?"}
            </p>
            <form
              key={stage}
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const value = String(f.get("value") ?? "").trim();
                if (value.length < 2) {
                  setError("Enter at least two characters.");
                  return;
                }
                if (stage === "person") {
                  setError("");
                  setPerson(value);
                  setStage("business");
                  heading.current?.focus();
                  return;
                }
                void submit("join", {
                  intent: "create_workspace",
                  person,
                  name: value,
                });
              }}
            >
              <label>
                {stage === "person" ? "Your name" : "Business name"}
                <input
                  name="value"
                  autoComplete={stage === "person" ? "name" : "organization"}
                  defaultValue={stage === "person" ? person : undefined}
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
              <div className="account-actions">
                {stage === "business" && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setStage("person");
                      setError("");
                      heading.current?.focus();
                    }}
                  >
                    Back
                  </Button>
                )}
                <Button disabled={busy} type="submit">
                  {stage === "person" ? "Continue" : "Create my workspace"}{" "}
                  <ArrowRight size={16} />
                </Button>
              </div>
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
    </SetupFrame>
  );
}
