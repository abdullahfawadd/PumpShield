"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Fingerprint,
  Layers3,
  Loader2,
} from "lucide-react";
import { browserDb } from "@/lib/supabase/client";
import { Brand } from "./brand";
import { Button } from "./ui/button";
export function Login() {
  const router = useRouter();
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
        const { error } = await db.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage(
          "Check your inbox to confirm your email, then sign in. Invited Munshi accounts receive access to their assigned station.",
        );
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
    <main id="main" className="login-page">
      <div className="login-frame">
        <section className="login-left">
          <header>
            <Brand />
            <span className="login-header-label">
              <span className="status-dot" /> STATION OPERATIONS
            </span>
          </header>
          <div className="login-content">
            <span className="eyebrow">
              <span className="small-line" /> YOUR STATION. YOUR CONTROL.
            </span>
            <h1>
              Every litre.
              <br />
              Every shift.
              <br />
              <span>Accounted for.</span>
            </h1>
            <p className="login-description">
              A clearer picture of your forecourt.
              <br />
              One secure workspace for everything that matters.
            </p>
            <div className="login-form-heading">
              <h2>
                {mode === "login"
                  ? "Welcome back."
                  : mode === "signup"
                    ? "Make it official."
                    : "Let’s get you back in."}
              </h2>
              <span>
                {mode === "login"
                  ? "Sign in to your workspace"
                  : mode === "signup"
                    ? "Create your secure account"
                    : "Reset your password"}
              </span>
            </div>
            <form onSubmit={submit} className="login-form">
              <label>
                Email address
                <input
                  autoComplete="email"
                  name="email"
                  type="email"
                  placeholder="you@yourstation.pk"
                  required
                  maxLength={254}
                />
              </label>
              {mode !== "reset" && (
                <label>
                  Password
                  <span className="password-input">
                    <input
                      name="password"
                      type={visible ? "text" : "password"}
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      placeholder="Enter your password"
                      minLength={mode === "signup" ? 12 : 1}
                      maxLength={128}
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
              {mode === "login" && (
                <div className="login-form-note">
                  <span>
                    <ShieldCheck size={14} /> Owner & Munshi access
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset");
                      setMessage("");
                      setError("");
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
              {mode === "signup" && (
                <p className="muted">
                  Use 12 or more characters. Your role is assigned securely
                  after email confirmation.
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
                  "Sign in to PumpShield"
                ) : mode === "signup" ? (
                  "Create account"
                ) : (
                  "Send reset link"
                )}
                <ArrowRight size={18} />
              </Button>
            </form>
            <div className="login-switch">
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
            </div>
          </div>
          <footer>
            <span>© {new Date().getFullYear()} PumpShield PK</span>
            <span>
              <Fingerprint size={15} /> Built around your trust.
            </span>
          </footer>
        </section>
        <aside
          className="login-art"
          aria-label="PumpShield product illustration"
        >
          <Image
            src="/liquid-metal.png"
            alt="Sculptural silver ribbon with soft lime reflections"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 52vw"
            className="metal-art"
          />
          <div className="art-top">
            <span className="art-chip">
              <span className="status-dot" /> PRECISION, WITHOUT THE NOISE.
            </span>
            <ArrowUpRight size={22} />
          </div>
          <div className="canvas-grid">
            <div className="canvas-card canvas-main">
              <div className="canvas-card-head">
                <span>
                  <ShieldCheck size={17} /> THE VERIFICATION LAYER
                </span>
                <span className="tiny-pill">PumpShield</span>
              </div>
              <h3>
                Confidence.
                <br />
                Built into every shift.
              </h3>
              <div className="decorative-chart" aria-hidden="true">
                {[
                  25, 38, 31, 54, 40, 62, 48, 78, 55, 66, 82, 74, 90, 80, 95,
                  85, 100, 91, 110, 102, 117, 108, 126, 118,
                ].map((h, i) => (
                  <i key={i} style={{ height: h }} />
                ))}
              </div>
              <div className="canvas-caption">
                <span>Capture</span>
                <span>Reconcile</span>
                <span>
                  Verify <Check size={12} />
                </span>
              </div>
            </div>
            <div className="canvas-card canvas-mini">
              <span className="canvas-icon">
                <Layers3 size={22} />
              </span>
              <div>
                <strong>One source of truth.</strong>
                <p>From delivery to daily close.</p>
              </div>
              <span className="mini-check">
                <Check size={15} />
              </span>
            </div>
          </div>
          <div className="art-bottom">
            <p>
              Less guesswork.
              <br />
              <span>More peace of mind.</span>
            </p>
            <span>01 — 03</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
