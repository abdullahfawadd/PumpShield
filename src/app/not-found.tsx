import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="standalone">
      <span className="eyebrow">404 / PUMPSHIELD</span>
      <h1>This page has moved.</h1>
      <p>Return to your workspace to continue.</p>
      <Link className="button button-primary" href="/app">
        Open workspace
      </Link>
    </main>
  );
}
