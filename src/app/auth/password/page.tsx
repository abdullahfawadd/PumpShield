"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserDb } from "@/lib/supabase/client";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
export default function Password() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const { error } = await browserDb().auth.updateUser({
      password: String(f.get("password")),
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else router.replace("/app");
    router.refresh();
  }
  return (
    <main id="main" className="standalone">
      <Brand />
      <h1>A fresh start.</h1>
      <p>Choose a new password for your workspace.</p>
      <form className="form-stack" onSubmit={submit}>
        <label>
          New password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <p role="alert">{message}</p>
        <Button disabled={busy}>Update password</Button>
      </form>
    </main>
  );
}
