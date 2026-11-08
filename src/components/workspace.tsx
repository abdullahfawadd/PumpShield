"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Download,
  Droplets,
  Eye,
  EyeOff,
  Fuel,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Truck,
  WalletCards,
  X,
  Check,
  Activity,
  Clock3,
  LockKeyhole,
  Building2,
  Columns3,
  Files,
} from "lucide-react";
import { toast } from "sonner";
import { browserDb } from "@/lib/supabase/client";
import { command } from "@/lib/api";
import { date, money, number } from "@/lib/utils";
import type { Dashboard } from "@/lib/types";
import { StationOperations } from "./station-operations";
import { DocumentCentre } from "./document-centre";
import { DeliveryBoard } from "./delivery-board";
import { OperationsHero } from "./operations-hero";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { ActionForm, Field } from "./forms";
import { WorkflowDialog, type Modal } from "./workflows";
import {
  Button as GlassButton,
  SegmentedControl,
  Switch,
  TabBar,
} from "glisse";

type Tab =
  | "overview"
  | "deliveries"
  | "shifts"
  | "credit"
  | "stock"
  | "settings"
  | "operations"
  | "documents";
const navigation = [
  { id: "overview" as Tab, label: "Overview", icon: LayoutDashboard },
  { id: "deliveries" as Tab, label: "Deliveries", icon: Truck },
  { id: "shifts" as Tab, label: "Shift reconciliation", icon: ClipboardCheck },
  { id: "credit" as Tab, label: "Digital parchi", icon: WalletCards },
  { id: "operations" as Tab, label: "Station operations", icon: Columns3 },
  { id: "documents" as Tab, label: "Documents", icon: Files },
  { id: "stock" as Tab, label: "Stock & prices", icon: Droplets },
];
const title: Record<Tab, string> = {
  overview: "A clearer view of your station.",
  deliveries: "Every delivery, verified.",
  shifts: "Close the shift. Open the facts.",
  credit: "Credit, without the paper trail.",
  stock: "Know what’s in the ground.",
  settings: "Make this workspace yours.",
  operations: "Keep the station moving.",
  documents: "A record you can return to.",
};
const subtitles: Record<Tab, string> = {
  overview: "The details that matter. All in one place.",
  deliveries: "From dispatch to decant, with evidence at every step.",
  shifts: "Meter readings, physical stock, and cash. Reconciled together.",
  credit:
    "Vehicle-authorized fuel, controlled limits, and an accountable ledger.",
  stock: "Calibrated tank readings and a clear record of fuel prices.",
  settings: "Station equipment, people, and access. Set up with care.",
  operations: "Clear actions. Named people. A history behind every decision.",
  documents: "Station documents, ready to review and share.",
};
const normalize = (d: Dashboard): Dashboard => ({
  ...d,
  stations: d.stations || [],
  tanks: d.tanks || [],
  nozzles: d.nozzles || [],
  prices: d.prices || [],
  deliveries: d.deliveries || [],
  shifts: d.shifts || [],
  accounts: d.accounts || [],
  vehicles: d.vehicles || [],
  parchis: d.parchis || [],
  members: d.members || [],
  invitations: d.invitations || [],
  events: d.events || [],
});
export function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value}`}>
      <span />
      {value === "submitted"
        ? "Awaiting approval"
        : value === "review"
          ? "Needs review"
          : value === "dispatched"
            ? "In progress"
            : value.replace("_", " ")}
    </span>
  );
}
export function Empty({
  icon: Icon = ClipboardCheck,
  title,
  description,
  action,
  onAction,
}: {
  icon?: typeof ClipboardCheck;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={24} strokeWidth={1.5} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <Button variant="secondary" onClick={onAction}>
          {action}
          <ArrowRight size={15} />
        </Button>
      )}
    </div>
  );
}
function Stat({
  label,
  value,
  unit,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  detail: string;
  icon: typeof Fuel;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">
        {label}
        <Icon size={17} />
      </div>
      <div className="stat-value">
        {value}
        <span>{unit}</span>
      </div>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}
export function Workspace({
  initial,
  email,
}: {
  initial: Dashboard;
  email: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(() => normalize(initial));
  const [stationId, setStationId] = useState(initial.stations?.[0]?.id || "");
  const [tab, setTab] = useState<Tab>("overview");
  const [modal, setModal] = useState<Modal | null>(null);
  const [mobile, setMobile] = useState(false);
  const [privateMode, setPrivateMode] = useState(false);
  const [search, setSearch] = useState("");
  const [days, setDays] = useState(7);
  const [now, setNow] = useState(() => Date.now());
  const [syncError, setSyncError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [help, setHelp] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      const r = await fetch("/api/dashboard", { cache: "no-store" });
      if (r.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }
      if (!r.ok) throw new Error();
      const next = normalize(await r.json());
      setData(next);
      setNow(Date.now());
      setStationId((current) =>
        next.stations.some((s) => s.id === current)
          ? current
          : next.stations[0]?.id || "",
      );
      setSyncError(false);
    } catch {
      setSyncError(true);
    } finally {
      setSyncing(false);
    }
  }, [router]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [refresh]);
  const owner = data.member?.role === "owner";
  const station = data.stations.find((s) => s.id === stationId);
  const tanks = data.tanks.filter((t) => t.station_id === stationId);
  const nozzles = data.nozzles.filter((t) => t.station_id === stationId);
  const deliveries = data.deliveries.filter((d) => d.station_id === stationId);
  const shifts = data.shifts.filter((s) => s.station_id === stationId);
  const accounts = data.accounts.filter((a) => a.station_id === stationId);
  const parchis = data.parchis.filter((p) => p.station_id === stationId);
  const currentShift = shifts.find((s) => s.status === "open");
  const pending =
    deliveries.filter((d) => d.status === "submitted").length +
    shifts.filter((s) => s.status === "review").length;
  const recent = shifts.filter(
    (s) => s.result && new Date(s.closed_at).getTime() > now - days * 86400000,
  );
  const moneyLabel = (value: number) =>
    privateMode ? "Rs ••••••" : money(value);
  const open = (type: string, id?: string) => {
    if (!stationId && !["station", "help"].includes(type)) {
      setTab("settings");
      toast.info("Add your first station to get started.");
      return;
    }
    setModal({ type, id });
  };
  async function run(op: string, p: Record<string, unknown>) {
    try {
      await command(op, { station_id: stationId, ...p });
      toast.success("Saved successfully");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save.");
    }
  }
  function exportData() {
    const rows: unknown[][] =
      tab === "credit"
        ? [
            ["ID", "Date", "Account", "Liters", "Amount PKR"],
            ...parchis.map((p) => [
              p.id,
              p.created_at,
              accounts.find((a) => a.id === p.account_id)?.name,
              p.liters,
              p.amount,
            ]),
          ]
        : [
            [
              "Shift",
              "Closed at",
              "Liters",
              "Revenue PKR",
              "Cash variance PKR",
            ],
            ...shifts
              .filter((s) => s.result)
              .map((s) => [
                s.name,
                s.closed_at,
                s.result!.liters,
                s.result!.revenue,
                s.result!.cash_variance,
              ]),
          ];
    const csv = rows
      .map((row) =>
        row
          .map((v) => {
            let text = String(v ?? "");
            if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
            return '"' + text.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `pumpshield-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function logout() {
    await browserDb().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  if (!data.member)
    return (
      <main id="main" className="onboarding">
        <Brand />
        <div className="onboarding-card">
          <span className="eyebrow">LET’S MAKE IT YOURS</span>
          <h1>
            Your station.
            <br />A fresh perspective.
          </h1>
          <p className="muted">
            Create your owner workspace to get started. Invited Munshi accounts
            are connected to their assigned station automatically.
          </p>
          <ActionForm
            op="join"
            onDone={() => void refresh()}
            submit="Create my workspace"
          >
            <Field label="Your name" name="person" placeholder="Full name" />
            <Field
              label="Business name"
              name="name"
              placeholder="Your petroleum business"
            />
          </ActionForm>
          <p className="fine-print">
            Signed in as {email}. If you’re a Munshi, ask your owner to
            authorize this email before continuing.
          </p>
          <Button variant="ghost" onClick={logout}>
            Sign out
          </Button>
        </div>
      </main>
    );
  return (
    <div
      data-theme="light"
      className={`app-shell ${privateMode ? "privacy-on" : ""}`}
    >
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="mobile-only icon-button"
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-badge">
          <span className="workspace-avatar">{data.workspace.slice(0, 1)}</span>
          <div>
            <strong>{data.workspace}</strong>
            <small>{owner ? "Owner workspace" : "Munshi terminal"}</small>
          </div>
          <LockKeyhole size={14} />
        </div>
        <span className="nav-caption">WORKSPACE</span>
        <nav>
          {navigation
            .filter(
              (n) =>
                owner ||
                ["deliveries", "shifts", "credit", "operations"].includes(n.id),
            )
            .map((n) => (
              <button
                key={n.id}
                className={tab === n.id ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setTab(n.id);
                  setSearch("");
                  setMobile(false);
                }}
              >
                <n.icon size={19} />
                <span>{n.label}</span>
                {n.id === "shifts" && pending > 0 && (
                  <span className="nav-count">{pending}</span>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <ShieldCheck size={20} />
            <strong>Built on evidence.</strong>
            <p>
              A little more clarity.
              <br />A lot more confidence.
            </p>
          </div>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={18} /> Help & getting started
            <ArrowUpRight size={14} />
          </button>
          {owner && (
            <button
              className={`nav-item ${tab === "settings" ? "active" : ""}`}
              onClick={() => {
                setTab("settings");
                setMobile(false);
              }}
            >
              <Settings2 size={18} /> Settings
            </button>
          )}
          <button className="profile" onClick={logout} title="Sign out">
            <span className="profile-avatar">
              {data.member.name.slice(0, 2).toUpperCase()}
            </span>
            <span>
              <strong>{data.member.name}</strong>
              <small>{owner ? "Station owner" : "Munshi / Supervisor"}</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-start">
            <button
              className="mobile-only icon-button"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span>{" "}
              <strong>
                {owner || tab !== "overview"
                  ? navigation.find((n) => n.id === tab)?.label || "Settings"
                  : "Field terminal"}
              </strong>
            </span>
          </div>
          <div className="topbar-actions">
            <button
              className={`sync-indicator ${syncError ? "sync-failed" : ""}`}
              onClick={() => void refresh()}
              title="Refresh saved records"
            >
              <span className="status-dot" />
              {syncError
                ? "Connection lost"
                : syncing
                  ? "Syncing…"
                  : "Connected"}
              <RefreshCw size={12} className={syncing ? "spin" : ""} />
            </button>
            {owner && (
              <span className="privacy-control" title="Hide financial amounts">
                {privateMode ? <EyeOff size={17} /> : <Eye size={17} />}
                <Switch
                  aria-label="Hide financial amounts"
                  checked={privateMode}
                  onCheckedChange={setPrivateMode}
                />
              </span>
            )}
            {owner && (
              <GlassButton
                className="notification-button"
                icon={<Bell size={19} />}
                onClick={() => setAlerts(true)}
                aria-label={`${pending} pending reviews`}
              >
                {pending > 0 && <i />}
              </GlassButton>
            )}
            <span className="topbar-avatar">
              {data.member.name.slice(0, 1)}
            </span>
          </div>
        </header>
        <main id="main" className="workspace-content">
          {data.workspace.includes("Design Lab") && (
            <div className="demo-banner">
              DESIGN LAB / Synthetic records for evaluation. No real deliveries,
              funds, or location signals.
            </div>
          )}
          <div className="station-row">
            <div className="station-select">
              <Building2 size={16} />
              <select
                aria-label="Active station"
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
              >
                {!stationId && <option value="">Your first station</option>}
                {data.stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
              {station && <span className="omc-label">{station.omc}</span>}
            </div>
            <span className="today-label">
              {new Intl.DateTimeFormat("en-PK", {
                timeZone: "Asia/Karachi",
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date())}
            </span>
          </div>
          <section className="page-heading">
            <div>
              <span className="eyebrow">
                {owner
                  ? tab === "overview"
                    ? `YOUR OPERATIONS, AT A GLANCE`
                    : `PUMPSHIELD / ${tab.toUpperCase()}`
                  : "MUNSHI / FIELD TERMINAL"}
              </span>
              <h1>
                {owner || tab === "operations"
                  ? title[tab]
                  : `Ready when you are, ${data.member.name.split(" ")[0]}.`}
              </h1>
              <p>
                {owner || tab === "operations"
                  ? subtitles[tab]
                  : "Capture the reading. Submit the evidence. We’ll take it from there."}
              </p>
            </div>
            <div className="heading-actions">
              {owner && ["overview", "credit", "shifts"].includes(tab) && (
                <Button variant="secondary" onClick={exportData}>
                  <Download size={15} />
                  Export
                </Button>
              )}
              {!["operations", "documents"].includes(tab) && (
                <Button
                  onClick={() =>
                    open(
                      tab === "deliveries"
                        ? "delivery"
                        : tab === "credit"
                          ? owner
                            ? "account"
                            : "parchi"
                          : tab === "stock"
                            ? "price"
                            : tab === "settings"
                              ? "station"
                              : currentShift
                                ? "close_shift"
                                : "open_shift",
                      currentShift?.id,
                    )
                  }
                >
                  <Plus size={17} />
                  {tab === "deliveries"
                    ? "New delivery"
                    : tab === "credit"
                      ? owner
                        ? "Add account"
                        : "New parchi"
                      : tab === "stock"
                        ? "Update price"
                        : tab === "settings"
                          ? "Add station"
                          : currentShift
                            ? "Close shift"
                            : "Open shift"}
                </Button>
              )}
            </div>
          </section>
          {syncError && (
            <div className="notice warning">
              <Activity size={18} /> Connection interrupted. Displaying the last
              loaded records. Submissions require a connection.
            </div>
          )}
          {!owner &&
            ["overview", "deliveries", "shifts", "credit"].includes(tab) && (
              <div className="kiosk-actions">
                <button
                  onClick={() =>
                    open(
                      currentShift ? "close_shift" : "open_shift",
                      currentShift?.id,
                    )
                  }
                >
                  <ClipboardCheck size={26} />
                  <strong>
                    {currentShift ? "Close current shift" : "Open a shift"}
                  </strong>
                  <span>
                    Capture meters, tank dips & cash
                    <ArrowUpRight size={17} />
                  </span>
                </button>
                <button
                  onClick={() => {
                    setTab("deliveries");
                  }}
                >
                  <Truck size={26} />
                  <strong>Delivery audit</strong>
                  <span>
                    Record temperature & chamber dips
                    <ArrowUpRight size={17} />
                  </span>
                </button>
                <button onClick={() => open("parchi")}>
                  <WalletCards size={26} />
                  <strong>Digital parchi</strong>
                  <span>
                    Record an authorized credit fill
                    <ArrowUpRight size={17} />
                  </span>
                </button>
              </div>
            )}
          {tab === "operations" && (
            <StationOperations
              key={stationId}
              stationId={stationId}
              data={data}
            />
          )}
          {owner && tab === "documents" && (
            <DocumentCentre data={data} stationId={stationId} />
          )}
          {owner && tab === "overview" && (
            <>
              <OperationsHero
                deliveries={deliveries}
                tanks={tanks}
                pending={pending}
                onDelivery={(id) => open("delivery_detail", id)}
                onReview={() => setAlerts(true)}
                demo={data.workspace.includes("Design Lab")}
              />
              <div className="section-bar">
                <h2>
                  Station snapshot <span>Last {days} days</span>
                </h2>
                <SegmentedControl
                  aria-label="Reporting period"
                  className="reporting-range"
                  value={String(days)}
                  onValueChange={(value) => setDays(Number(value))}
                  items={[
                    { value: "7", label: "7 days" },
                    { value: "30", label: "30 days" },
                  ]}
                />
              </div>
              <div className="stats-grid">
                <Stat
                  label="Recorded revenue"
                  value={
                    privateMode
                      ? "••••••"
                      : number(
                          recent.reduce(
                            (s, r) => s + (r.result?.revenue || 0),
                            0,
                          ),
                        )
                  }
                  unit="PKR"
                  detail={`${recent.length} closed shifts in this period`}
                  icon={WalletCards}
                />
                <Stat
                  label="Fuel dispensed"
                  value={number(
                    recent.reduce((s, r) => s + (r.result?.liters || 0), 0),
                    1,
                  )}
                  unit="L"
                  detail="From submitted nozzle readings"
                  icon={Fuel}
                />
                <Stat
                  label="Recorded stock"
                  value={number(
                    tanks.reduce((s, t) => s + t.stock, 0),
                    1,
                  )}
                  unit="L"
                  detail={`${tanks.length} calibrated underground tanks`}
                  icon={Droplets}
                />
                <Stat
                  label="Needs your review"
                  value={String(pending)}
                  detail="Submitted shifts and delivery audits"
                  icon={ClipboardCheck}
                />
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Fuel movement</h2>
                      <p>Dispensed litres, by closed shift</p>
                    </div>
                    <span className="legend-dot">Recorded volume</span>
                  </div>
                  {recent.length ? (
                    <div className="chart">
                      <div className="chart-bars">
                        {recent
                          .slice(0, 14)
                          .reverse()
                          .map((s) => (
                            <div className="chart-bar-column" key={s.id}>
                              <span>{number(s.result!.liters)}</span>
                              <button
                                style={{
                                  height: `${Math.max(2, (s.result!.liters / Math.max(...recent.map((r) => r.result!.liters), 1)) * 160)}px`,
                                }}
                                onClick={() => open("shift_detail", s.id)}
                                aria-label={`${s.name}, ${s.result!.liters} litres`}
                              />
                              <small>
                                {new Date(s.closed_at).toLocaleDateString(
                                  "en-PK",
                                  {
                                    timeZone: "Asia/Karachi",
                                    day: "numeric",
                                    month: "short",
                                  },
                                )}
                              </small>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <Empty
                      title="Your first shift tells the story."
                      description="Close a shift to see real fuel movement here. Every bar will come from your station’s records."
                      action="Start a shift"
                      onAction={() => open("open_shift")}
                    />
                  )}
                </section>
                <section className="panel tank-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>In the ground</h2>
                      <p>Last recorded tank stock</p>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => setTab("stock")}
                      aria-label="View stock"
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                  {tanks.length ? (
                    <div className="tank-mini-list">
                      {tanks.slice(0, 3).map((t) => (
                        <div key={t.id} className="tank-mini">
                          <div className="mini-cylinder">
                            <div
                              style={{
                                height: `${(t.stock / t.capacity) * 100}%`,
                              }}
                            />
                          </div>
                          <div>
                            <strong>{t.name}</strong>
                            <span>
                              {t.grade === "MS" ? "Petrol" : "Diesel"} ·{" "}
                              {number(t.stock)} L
                            </span>
                            <div className="progress-track">
                              <i
                                style={{
                                  width: `${(t.stock / t.capacity) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                          <b>
                            {Math.round((t.stock / t.capacity) * 100)}
                            <small>%</small>
                          </b>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={Droplets}
                      title="A place for every litre."
                      description="Add your tanks and their certified calibration charts."
                      action="Add a tank"
                      onAction={() => open("tank")}
                    />
                  )}
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent activity</h2>
                    <p>An accountable trail of workspace changes</p>
                  </div>
                  <span className="subtle-pill">
                    <LockKeyhole size={12} /> Recorded securely
                  </span>
                </div>
                {data.events.length ? (
                  <div className="activity-list">
                    {data.events.slice(0, 5).map((e) => (
                      <div key={e.id}>
                        <span className="activity-icon">
                          <Check size={15} />
                        </span>
                        <div>
                          <strong>{e.action.replaceAll("_", " ")}</strong>
                          <span>{e.subject_id?.slice(0, 8)}</span>
                        </div>
                        <time>{date(e.created_at)}</time>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon={Activity}
                    title="Your activity starts here."
                    description="Every saved operation leaves a dated record for the owner."
                  />
                )}
              </section>
            </>
          )}
          {(tab === "deliveries" || (!owner && tab === "overview")) && (
            <>
              <div className="list-toolbar">
                <div className="tab-pills">
                  <span className="selected">
                    All deliveries <b>{deliveries.length}</b>
                  </span>
                  <span>
                    {deliveries.filter((d) => d.status === "submitted").length}{" "}
                    awaiting approval
                  </span>
                </div>
                <div className="search-input">
                  <Search size={16} />
                  <input
                    placeholder="Search vehicle or reference…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search deliveries"
                  />
                </div>
              </div>
              <DeliveryBoard
                deliveries={deliveries.filter((d) =>
                  `${d.vehicle} ${d.reference}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )}
                owner={owner}
                onOpen={(id) => open("delivery_detail", id)}
              />
            </>
          )}
          {tab === "shifts" && (
            <>
              <div className="stats-grid three">
                <Stat
                  label="Current shift"
                  value={currentShift ? "Open" : "—"}
                  detail={
                    currentShift
                      ? `Cutoff ${date(currentShift.due_at)}`
                      : "No shift currently open"
                  }
                  icon={Clock3}
                />
                <Stat
                  label="Nozzles configured"
                  value={String(nozzles.length)}
                  detail="Mapped to their source tanks"
                  icon={Fuel}
                />
                <Stat
                  label={owner ? "Awaiting review" : "Submission policy"}
                  value={
                    owner
                      ? String(
                          shifts.filter((s) => s.status === "review").length,
                        )
                      : "Locked"
                  }
                  detail={
                    owner
                      ? "Owner verification required"
                      : "Readings cannot change after submission"
                  }
                  icon={LockKeyhole}
                />
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Shift register</h2>
                    <p>
                      {owner
                        ? "Select a shift to inspect its evidence and reconciliation."
                        : "Capture fresh evidence before your shift cutoff."}
                    </p>
                  </div>
                </div>
                {shifts.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Shift</th>
                          <th>Opened</th>
                          <th>Status</th>
                          {owner && (
                            <>
                              <th>Volume</th>
                              <th>Cash variance</th>
                            </>
                          )}
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {shifts.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <strong>{s.name}</strong>
                              <small>{s.id.slice(0, 8)}</small>
                            </td>
                            <td>{date(s.opened_at)}</td>
                            <td>
                              <Status value={s.status} />
                            </td>
                            {owner && (
                              <>
                                <td>
                                  {s.result
                                    ? `${number(s.result.liters, 1)} L`
                                    : "—"}
                                </td>
                                <td
                                  className={
                                    s.result &&
                                    Math.abs(s.result.cash_variance) > 0.01
                                      ? "text-danger"
                                      : ""
                                  }
                                >
                                  {s.result
                                    ? moneyLabel(s.result.cash_variance)
                                    : "—"}
                                </td>
                              </>
                            )}
                            <td>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  open(
                                    s.status === "open"
                                      ? "close_shift"
                                      : "shift_detail",
                                    s.id,
                                  )
                                }
                              >
                                {s.status === "open" ? "Close shift" : "Review"}
                                <ArrowUpRight size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="Make the first close a confident one."
                    description="Open a shift to lock current stock, fuel prices, and nozzle readings. Closing readings will be compared against this baseline."
                    action="Open a shift"
                    onAction={() => open("open_shift")}
                  />
                )}
              </section>
            </>
          )}
          {tab === "credit" && (
            <>
              {owner && (
                <div className="stats-grid three">
                  <Stat
                    label="Outstanding credit"
                    value={
                      privateMode
                        ? "••••••"
                        : number(accounts.reduce((s, a) => s + a.balance, 0))
                    }
                    unit="PKR"
                    detail="Across this station’s corporate accounts"
                    icon={WalletCards}
                  />
                  <Stat
                    label="Corporate accounts"
                    value={String(accounts.length)}
                    detail="Individually controlled credit limits"
                    icon={Building2}
                  />
                  <Stat
                    label="Recorded parchis"
                    value={String(parchis.length)}
                    detail="Most recent 200 workspace records"
                    icon={ClipboardCheck}
                  />
                </div>
              )}
              <div className="section-bar">
                <h2>
                  {owner ? "Corporate accounts" : "Authorized refuelling"}
                </h2>
                <Button variant="secondary" onClick={() => open("parchi")}>
                  <Plus size={16} />
                  New digital parchi
                </Button>
              </div>
              {owner &&
                (accounts.length ? (
                  <div className="account-grid">
                    {accounts.map((a) => (
                      <section key={a.id} className="panel account-card">
                        <span className="account-avatar">
                          {a.name.slice(0, 2).toUpperCase()}
                        </span>
                        <h3>{a.name}</h3>
                        <span className="muted">Outstanding balance</span>
                        <strong className="account-balance">
                          {moneyLabel(a.balance)}
                        </strong>
                        <div className="progress-track">
                          <i
                            className={
                              a.balance / a.credit_limit > 0.85
                                ? "warning-fill"
                                : ""
                            }
                            style={{
                              width: `${Math.min(100, (a.balance / a.credit_limit) * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="account-limit">
                          <span>
                            {Math.round((a.balance / a.credit_limit) * 100)}%
                            used
                          </span>
                          <span>Limit {moneyLabel(a.credit_limit)}</span>
                        </div>
                        <div className="account-actions">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => open("account_detail", a.id)}
                          >
                            Manage vehicles
                            <ArrowUpRight size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => open("payment", a.id)}
                          >
                            <ArrowDownLeft size={14} />
                            Payment
                          </Button>
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <section className="panel">
                    <Empty
                      icon={WalletCards}
                      title="Better credit begins with a clear limit."
                      description="Add a corporate account, authorize its vehicles, and issue unique QR credentials."
                      action="Add corporate account"
                      onAction={() => open("account")}
                    />
                  </section>
                ))}
              {owner && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Digital parchi ledger</h2>
                      <p>
                        Amounts are calculated using the open shift’s locked
                        price.
                      </p>
                    </div>
                  </div>
                  {parchis.length ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Receipt</th>
                            <th>Account</th>
                            <th>Fuel</th>
                            <th>Amount</th>
                            <th>Recorded</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parchis.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <a
                                  className="text-link"
                                  href={`/api/documents/parchi/${p.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {p.id.slice(0, 8)}
                                  <ArrowUpRight size={13} />
                                </a>
                              </td>
                              <td>
                                {
                                  accounts.find((a) => a.id === p.account_id)
                                    ?.name
                                }
                              </td>
                              <td>{number(p.liters, 1)} L</td>
                              <td>{moneyLabel(p.amount)}</td>
                              <td>{date(p.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty
                      title="No paper. No guesswork."
                      description="Recorded credit fills appear here once your first parchi is submitted."
                    />
                  )}
                </section>
              )}
            </>
          )}
          {owner && tab === "stock" && (
            <>
              <div className="section-bar">
                <h2>
                  Underground tanks <span>{tanks.length} configured</span>
                </h2>
                <Button variant="secondary" onClick={() => open("tank")}>
                  <Plus size={15} />
                  Add tank
                </Button>
              </div>
              {tanks.length ? (
                <div className="stock-grid">
                  {tanks.map((t) => (
                    <section key={t.id} className="panel stock-card">
                      <div className="panel-heading">
                        <div>
                          <h2>{t.name}</h2>
                          <p>
                            {t.grade === "MS"
                              ? "Motor Spirit · Petrol"
                              : "High-Speed Diesel"}
                          </p>
                        </div>
                        <span className="subtle-pill">{t.grade}</span>
                      </div>
                      <div className="stock-visual">
                        <div className="large-cylinder">
                          <div
                            className="tank-fluid"
                            style={{
                              height: `${Math.max(0, (t.stock / t.capacity) * 100)}%`,
                            }}
                          />
                          <span>
                            {Math.round((t.stock / t.capacity) * 100)}
                            <small>%</small>
                          </span>
                        </div>
                        <div className="stock-readout">
                          <span>Recorded stock</span>
                          <strong>
                            {number(t.stock, 1)}
                            <small> L</small>
                          </strong>
                          <span>of {number(t.capacity)} L capacity</span>
                          <hr />
                          <b>{number(t.capacity - t.stock, 1)} L available</b>
                          <small>Ullage capacity</small>
                        </div>
                      </div>
                      <div className="stock-card-footer">
                        <Clock3 size={13} />
                        Last updated {date(t.updated_at)}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <section className="panel">
                  <Empty
                    icon={Droplets}
                    title="Give your stock a source of truth."
                    description="Use certified dip charts to turn millimetres into accurate recorded litres."
                    action="Configure first tank"
                    onAction={() => open("tank")}
                  />
                </section>
              )}
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Fuel price register</h2>
                    <p>
                      Owner-entered prices with source and effective time. No
                      unverified automatic rate feed.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => open("price")}>
                    <Plus size={15} />
                    Record price
                  </Button>
                </div>
                {data.prices.filter((p) => p.station_id === stationId)
                  .length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Fuel</th>
                          <th>Retail / litre</th>
                          <th>Dealer margin</th>
                          <th>Effective (PKT)</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.prices
                          .filter((p) => p.station_id === stationId)
                          .map((p) => (
                            <tr key={p.id}>
                              <td>
                                <span className="fuel-grade">{p.grade}</span>
                              </td>
                              <td>{moneyLabel(p.price)}</td>
                              <td>{moneyLabel(p.margin)}</td>
                              <td>{date(p.effective_at)}</td>
                              <td>{p.source}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    icon={Fuel}
                    title="Start with the right price."
                    description="Enter verified rates before opening a shift or recording a delivery."
                  />
                )}
              </section>
              <div className="notice">
                <Clock3 size={18} />
                <div>
                  <strong>A clean boundary for every price.</strong>
                  <p>
                    Shifts have a cutoff at the next scheduled price change or
                    midnight PKT. Late submissions are flagged for owner review;
                    the app never invents a midnight meter reading.
                  </p>
                </div>
              </div>
            </>
          )}
          {owner && tab === "settings" && (
            <>
              <div className="settings-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Station setup</h2>
                      <p>A solid foundation for accurate records.</p>
                    </div>
                    <Settings2 size={20} />
                  </div>
                  <div className="setup-list">
                    {[
                      {
                        label: "Add your station",
                        desc: "Station name, OMC, and city",
                        done: !!station,
                        action: "station",
                      },
                      {
                        label: "Configure underground tanks",
                        desc: "Capacity, opening dip, and certified chart",
                        done: !!tanks.length,
                        action: "tank",
                      },
                      {
                        label: "Map your nozzles",
                        desc: "Source tank and opening totalizer",
                        done: !!nozzles.length,
                        action: "nozzle",
                      },
                      {
                        label: "Record current fuel prices",
                        desc: "Verified rates and thermal coefficients",
                        done: data.prices.some(
                          (p) => p.station_id === stationId,
                        ),
                        action: "price",
                      },
                      {
                        label: "Authorize your Munshi",
                        desc: "Email-based access to this station",
                        done: data.members.some(
                          (m) =>
                            m.role === "munshi" && m.station_id === stationId,
                        ),
                        action: "invite",
                      },
                    ].map((step, i) => (
                      <button
                        key={step.action}
                        onClick={() => open(step.action)}
                      >
                        <span
                          className={`setup-number ${step.done ? "done" : ""}`}
                        >
                          {step.done ? (
                            <Check size={16} />
                          ) : (
                            String(i + 1).padStart(2, "0")
                          )}
                        </span>
                        <span>
                          <strong>{step.label}</strong>
                          <small>{step.desc}</small>
                        </span>
                        <ArrowUpRight size={17} />
                      </button>
                    ))}
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Nozzle mapping</h2>
                      <p>Readings flow into the correct tank.</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => open("nozzle")}
                    >
                      <Plus size={14} />
                      Add
                    </Button>
                  </div>
                  {nozzles.length ? (
                    <div className="mapping-list">
                      {nozzles.map((n) => (
                        <div key={n.id}>
                          <Fuel size={20} />
                          <span>
                            <strong>{n.name}</strong>
                            <small>
                              {tanks.find((t) => t.id === n.tank_id)?.name}
                            </small>
                          </span>
                          <b>{number(n.totalizer, 1)} L</b>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={Fuel}
                      title="Connect the dots."
                      description="Map each nozzle to a calibrated tank before opening a shift."
                    />
                  )}
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>People & access</h2>
                    <p>Owner controls. Focused Munshi access.</p>
                  </div>
                  <Button variant="secondary" onClick={() => open("invite")}>
                    <Plus size={15} />
                    Authorize Munshi
                  </Button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Person</th>
                        <th>Role</th>
                        <th>Station</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.members.map((m) => (
                        <tr key={m.user_id}>
                          <td>
                            <strong>{m.name}</strong>
                          </td>
                          <td className="capitalize">{m.role}</td>
                          <td>
                            {data.stations.find((s) => s.id === m.station_id)
                              ?.name || "All stations"}
                          </td>
                          <td>
                            <Status value={m.active ? "active" : "disabled"} />
                          </td>
                          <td>
                            {m.role === "munshi" && m.active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => open("revoke", m.user_id)}
                              >
                                Revoke access
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {data.invitations.map((i) => (
                        <tr key={i.id}>
                          <td>
                            <strong>{i.name}</strong>
                            <small>{i.email}</small>
                          </td>
                          <td>Munshi</td>
                          <td>
                            {
                              data.stations.find((s) => s.id === i.station_id)
                                ?.name
                            }
                          </td>
                          <td>
                            <Status value="pending" />
                          </td>
                          <td>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                void run("cancel_invite", { id: i.id })
                              }
                            >
                              Cancel
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <div className="notice">
                <LockKeyhole size={19} />
                <div>
                  <strong>Your workspace, clearly separated.</strong>
                  <p>
                    Database policies isolate your records. Munshi accounts
                    receive operational fields only. Camera capture provides
                    reviewable evidence, not an automatic guarantee of
                    authenticity.
                  </p>
                </div>
              </div>
            </>
          )}
          <footer className="workspace-footer">
            <span>
              <ShieldCheck size={14} /> PumpShield PK · Every litre, accounted
              for.
            </span>
            <span>Times shown in Pakistan Standard Time</span>
          </footer>
        </main>
        <nav className="glass-mobile-dock" aria-label="Station navigation">
          <TabBar
            aria-label="Station sections"
            value={tab}
            items={navigation
              .filter((n) => !["documents", "stock"].includes(n.id))
              .filter(
                (n) =>
                  owner ||
                  ["deliveries", "shifts", "credit", "operations"].includes(
                    n.id,
                  ),
              )
              .map((n) => ({
                value: n.id,
                label:
                  n.id === "shifts"
                    ? "Shifts"
                    : n.id === "credit"
                      ? "Parchi"
                      : n.id === "overview"
                        ? "Home"
                        : n.id === "stock"
                          ? "Stock"
                          : n.id === "operations"
                            ? "Operations"
                            : n.label,
                icon: <n.icon size={22} />,
              }))}
            onValueChange={(value) => {
              if (navigation.some((n) => n.id === value)) {
                setTab(value as Tab);
                setSearch("");
                setMobile(false);
                window.scrollTo({ top: 0, behavior: "instant" });
              }
            }}
          />
        </nav>
      </div>
      {modal && (
        <WorkflowDialog
          modal={modal}
          data={data}
          stationId={stationId}
          privateMode={privateMode}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            void refresh();
          }}
          onNavigate={setModal}
        />
      )}
      <Dialog
        open={help}
        onOpenChange={setHelp}
        title="A good start makes every shift easier."
        description="Your PumpShield setup guide"
      >
        <ol className="help-list">
          <li>Add a station in Settings.</li>
          <li>
            Add tanks with certified calibration charts, then map nozzles.
          </li>
          <li>Enter current prices from your verified source.</li>
          <li>
            Authorize a Munshi’s email. They create and confirm their account to
            join.
          </li>
          <li>
            Open a shift. Capture real evidence when closing or auditing a
            delivery.
          </li>
          <li>
            Review discrepancies before approving. A variance is a reason to
            investigate.
          </li>
        </ol>
        <div className="notice">
          Owned-truck hardware integrations, automated WhatsApp, and automated
          OCR are not active. Contractor phone tracking is available through an
          expiring driver link. Evidence is captured directly and measurements
          are entered by your team.
        </div>
      </Dialog>
      <Dialog
        open={alerts}
        onOpenChange={setAlerts}
        title="Your review queue"
        description="Decisions that need an owner’s attention."
      >
        {pending ? (
          <div className="review-queue">
            {deliveries
              .filter((d) => d.status === "submitted")
              .map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setAlerts(false);
                    open("delivery_detail", d.id);
                  }}
                >
                  <Truck size={21} />
                  <span>
                    <strong>{d.vehicle}</strong>
                    <small>Delivery audit · {d.reference}</small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            {shifts
              .filter((s) => s.status === "review")
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setAlerts(false);
                    open("shift_detail", s.id);
                  }}
                >
                  <ClipboardCheck size={21} />
                  <span>
                    <strong>{s.name}</strong>
                    <small>Shift reconciliation</small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
          </div>
        ) : (
          <Empty
            icon={ShieldCheck}
            title="Nothing waiting on you."
            description="Submitted delivery audits and shift closures will appear here."
          />
        )}
      </Dialog>
    </div>
  );
}
