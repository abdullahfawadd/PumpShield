"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserDb } from "@/lib/supabase/client";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { PASSWORD_MIN_LENGTH, newPasswordError } from "@/lib/password-policy";
export default function Password() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    const passwordError = newPasswordError(password);
    if (passwordError) {
      setMessage(passwordError);
      return;
    }
    setBusy(true);
    try {
      const { error } = await browserDb().auth.updateUser({ password });
      if (error) throw error;
      router.replace("/app");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update your password. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="standalone">
      <Brand />
      <h1>A fresh start.</h1>
      <p>Choose a new password with at least 15 characters.</p>
      <form className="form-stack" onSubmit={submit}>
        <label>
          New password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={256}
            required
          />
        </label>
        <p role="alert">{message}</p>
        <Button disabled={busy}>Update password</Button>
      </form>
    </main>
  );
}
