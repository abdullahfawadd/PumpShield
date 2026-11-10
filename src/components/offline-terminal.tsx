"use client";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { OfflineDraftForm } from "./offline-draft-form";
import {
  LockKeyhole,
  ArrowUpRight,
  RefreshCw,
  Check,
  Download,
  Clock3,
  AlertCircle,
} from "./icons";
import { date } from "@/lib/utils";
import { useOfflineTerminal } from "./use-offline-terminal";
export function OfflineTerminal() {
  const {
    meta,
    unlocked,
    context,
    drafts,
    stations,
    stationId,
    setStationId,
    online,
    ready,
    busy,
    syncing,
    error,
    note,
    canInstall,
    swReady,
    installApp,
    unlockDevice,
    save,
    refreshData,
    retryDraft,
    removeWorkspace,
    remove,
    syncNow,
    lock,
  } = useOfflineTerminal();
  return (
    <main id="main" className="offline-page">
      <header className="offline-topbar">
        <Brand />
        <a href="/app">
          Back to station <ArrowUpRight size={15} />
        </a>
      </header>
      <div className="offline-content">
        <div className="offline-page-heading">
          <div>
            <span className="eyebrow">PUMPSHIELD � DEVICE & SYNC</span>
            <h1>
              {unlocked
                ? "Station workspace"
                : meta
                  ? "Unlock field terminal"
                  : "Prepare field terminal"}
            </h1>
            {!unlocked && (
              <p>
                Encrypted drafts on this device. Verification happens online.
              </p>
            )}
          </div>
          <span
            className={`connectivity-pill ${online ? "online" : "offline"}`}
          >
            <i />
            {online ? "Connection available" : "Offline · drafts only"}
          </span>
        </div>
        {!meta && (
          <div className="offline-install">
            <div>
              <Download size={22} />
              <span>
                <strong>Add PumpShield to your home screen</strong>
                <small>
                  {swReady
                    ? "The offline terminal is prepared on this browser."
                    : "Open this page online once to prepare the offline terminal."}
                </small>
              </span>
            </div>
            {canInstall ? (
              <Button variant="secondary" onClick={() => void installApp()}>
                Install app
              </Button>
            ) : (
              <p>
                iPhone: Share → Add to Home Screen.
                <br />
                Android: browser menu → Install app.
              </p>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {note && (
          <p role="status" className="offline-status">
            {note}
          </p>
        )}
        {!ready ? (
          <p role="status">Checking this device…</p>
        ) : !unlocked ? (
          <section className="vault-card">
            <span className="vault-symbol">
              <LockKeyhole size={28} />
            </span>
            <h2>
              {meta
                ? "Unlock your offline workspace."
                : "Prepare a trusted device."}
            </h2>
            <p>
              {meta
                ? "Use the offline passphrase you chose on this device. Your account password is separate."
                : "Sign in online and choose a station, then create an offline passphrase. Saved station data and photos will be encrypted on this device."}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void unlockDevice(e.currentTarget);
              }}
            >
              {!meta && (
                <label>
                  Station
                  <select
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                    required
                  >
                    <option value="">Choose a station</option>
                    {stations.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Offline passphrase
                <input
                  name="passphrase"
                  type="password"
                  autoComplete={meta ? "current-password" : "new-password"}
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
              {!meta && (
                <label>
                  Confirm offline passphrase
                  <input
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </label>
              )}
              <label className="trusted-device-choice">
                <input name="remember" type="checkbox" /> Remember this trusted
                device for 24 hours
              </label>
              <p className="fine-print">
                Only on a personal or station-controlled phone. Anyone with
                access to this browser can open drafts during this period. Lock
                or sign out to revoke access. Your account password is never
                saved.
              </p>
              <Button
                disabled={
                  busy || (!meta && (!online || !stationId || !swReady))
                }
              >
                {busy
                  ? "Securing device…"
                  : meta
                    ? "Unlock workspace"
                    : "Prepare offline workspace"}
              </Button>
            </form>
            <p className="fine-print">
              Use a personal or station-controlled device. Without the offline
              passphrase, unsynced drafts cannot be recovered.
            </p>
            {meta && (
              <button
                className="text-link text-danger"
                disabled={busy}
                onClick={() => void removeWorkspace()}
              >
                Remove this device’s offline workspace
              </button>
            )}
            <a className="text-link" href="/login">
              Sign in online
            </a>
          </section>
        ) : (
          context && (
            <>
              <section className="offline-workspace-strip">
                <div>
                  <strong>{context.station.name}</strong>
                  <span>
                    {context.person} · Prepared {date(context.prepared_at)} PKT
                  </span>
                </div>
                <div>
                  <Button
                    variant="secondary"
                    disabled={busy || syncing || !online}
                    onClick={() => void refreshData()}
                  >
                    <RefreshCw size={15} />
                    Refresh data
                  </Button>
                  <Button variant="ghost" onClick={() => lock()}>
                    <LockKeyhole size={15} />
                    Lock
                  </Button>
                </div>
              </section>
              <div className="offline-work-grid">
                <OfflineDraftForm
                  key={context.prepared_at}
                  context={context}
                  onSave={save}
                />
                <section className="offline-queue">
                  <div className="offline-card-heading">
                    <div>
                      <span className="eyebrow">THIS DEVICE</span>
                      <h2>Submission queue</h2>
                    </div>
                    <span>
                      {drafts.filter((d) => d.state !== "posted").length}{" "}
                      pending
                    </span>
                  </div>
                  <Button
                    className="full-width"
                    disabled={
                      !online ||
                      syncing ||
                      !drafts.some((d) => d.state === "pending")
                    }
                    onClick={syncNow}
                  >
                    <RefreshCw size={16} className={syncing ? "spin" : ""} />
                    {syncing ? "Verifying & posting…" : "Sync pending records"}
                  </Button>
                  {!drafts.length ? (
                    <div className="offline-queue-empty">
                      <Check size={27} />
                      <h3>Nothing waiting.</h3>
                      <p>
                        Saved field drafts appear here. No private server pages
                        are cached.
                      </p>
                    </div>
                  ) : (
                    <ol>
                      {drafts.map((d) => (
                        <li key={d.id} className={`queue-${d.state}`}>
                          <div className="queue-record-top">
                            <span>
                              {d.state === "posted" ? (
                                <Check size={17} />
                              ) : d.state === "review" ? (
                                <AlertCircle size={17} />
                              ) : (
                                <Clock3 size={17} />
                              )}
                            </span>
                            <span>
                              {d.state === "posted"
                                ? "Posted"
                                : d.state === "review"
                                  ? "Needs review"
                                  : "Pending verification"}
                            </span>
                          </div>
                          <h3>{d.title}</h3>
                          <p>{date(d.captured_at)} PKT</p>
                          {d.shift_id && (
                            <p className="fine-print">
                              Original shift:{" "}
                              {d.shift_id === context.shift?.id
                                ? context.shift.name
                                : d.shift_id.slice(0, 8)}
                            </p>
                          )}
                          {d.error && <p className="queue-error">{d.error}</p>}
                          {d.result && (
                            <code>Record {d.result.id.slice(0, 8)}</code>
                          )}
                          <div className="queue-record-actions">
                            {d.state === "review" && (
                              <button
                                type="button"
                                disabled={!online || syncing}
                                onClick={() => void retryDraft(d)}
                              >
                                Recheck online
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={syncing}
                              onClick={() => void remove(d)}
                            >
                              {d.state === "posted"
                                ? "Remove local receipt"
                                : "Delete unposted draft"}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                  <p className="fine-print">
                    Sync runs while this terminal is open and unlocked. A
                    changed shift, revoked pass, insufficient credit or old
                    evidence can require owner review. Closed-browser background
                    sync is not promised.
                  </p>
                </section>
              </div>
            </>
          )
        )}
        <footer className="offline-footer">
          <LockKeyhole size={15} />
          <span>
            Encrypted local drafts · current authorisation checked on every
            submission · locks after inactivity
          </span>
        </footer>
      </div>
    </main>
  );
}
