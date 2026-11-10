"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DesignCanvas } from "./design-canvas";
import { ArrowUpRight, ArrowRight, Eye, EyeOff, Loader2 } from "@/components/icons";
import { browserDb } from "@/lib/supabase/client";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { PASSWORD_MIN_LENGTH, newPasswordError } from "@/lib/password-policy";
export function Login() {
  const router = useRouter();
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      if (!viewport || !root.current) return;
      root.current.style.setProperty("--auth-height", `${viewport.height}px`);
      root.current.toggleAttribute(
        "data-keyboard",
        viewport.height < window.innerHeight * 0.74,
      );
    };
    update();
    viewport?.addEventListener("resize", update);
    return () => viewport?.removeEventListener("resize", update);
  }, []);
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    try {
      const db = browserDb();
      if (mode === "login") {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/app");
        router.refresh();
      } else if (mode === "signup") {
        const passwordError = newPasswordError(password);
        if (passwordError) throw new Error(passwordError);
        const { error } = await db.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage("Check your inbox to confirm your email, then sign in.");
      } else {
        const { error } = await db.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/password`,
        });
        if (error) throw error;
        setMessage(
          "If this account exists, a password reset link has been sent.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to sign in. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main ref={root} id="main" className="login-page">
      <div className="login-frame">
        <section className="login-left">
          <header>
            <Brand compact />
          </header>
          <div className="login-content">
            <h1>
              Every detail.
              <br />
              Every litre.
              <br />
              <span>Under control.</span>
            </h1>
            <p className="login-description">
              A clearer picture of your forecourt.{" "}
              <br />
              One workspace for everything that matters.
            </p>
            <h2 className="login-mode-label">
              {mode === "signup"
                ? "Create your account"
                : mode === "reset"
                  ? "Reset your password"
                  : "Sign in to your workspace"}
            </h2>
            <form onSubmit={submit} className="login-form">
              <label>
                <span className="sr-only">Email address</span>
                <input
                  autoComplete="email"
                  name="email"
                  type="email"
                  placeholder="Email address"
                  required
                  maxLength={254}
                />
              </label>
              {mode !== "reset" && (
                <label>
                  <span className="sr-only">Password</span>
                  <span className="password-input">
                    <input
                      name="password"
                      aria-label="Password"
                      type={visible ? "text" : "password"}
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      placeholder="Password"
                      minLength={mode === "signup" ? PASSWORD_MIN_LENGTH : 1}
                      maxLength={mode === "signup" ? 256 : undefined}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVisible(!visible)}
                      aria-label={visible ? "Hide password" : "Show password"}
                    >
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
              )}
              {mode === "signup" && (
                <p className="muted">
                  Use 15 or more characters. Confirm your email to finish setup.
                </p>
              )}
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className="form-success">
                  {message}
                </p>
              )}
              <Button disabled={busy} className="login-submit">
                {busy ? (
                  <Loader2 className="spin" size={18} />
                ) : mode === "login" ? (
                  "Sign in"
                ) : mode === "signup" ? (
                  "Create account"
                ) : (
                  "Send reset link"
                )}
                <ArrowRight size={18} />
              </Button>
            </form>
            <div className="login-switch">
              {mode === "login" && (
                <button
                  onClick={() => {
                    setMode("reset");
                    setMessage("");
                    setError("");
                  }}
                >
                  Forgot password?
                </button>
              )}
              <span>
                {mode === "login" ? (
                  <>
                    New to PumpShield?{" "}
                    <button
                      onClick={() => {
                        setMode("signup");
                        setError("");
                        setMessage("");
                      }}
                    >
                      Create an account <ArrowUpRight size={13} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setMode("login");
                      setError("");
                      setMessage("");
                    }}
                  >
                    Back to sign in <ArrowRight size={13} />
                  </button>
                )}
              </span>
            </div>
          </div>
        </section>
        <aside
          className="login-art"
          aria-label="PumpShield product illustration"
        >
          <DesignCanvas />
        </aside>
      </div>
    </main>
  );
}
