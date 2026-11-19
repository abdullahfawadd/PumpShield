"use client";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
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
  Settings2,
  ShieldCheck,
  Sidebar,
  Truck,
  WalletCards,
  Check,
  Activity,
  Clock3,
  Building2,
  Columns3,
  Files,
} from "@/components/icons";
import { toast } from "sonner";
import { browserDb } from "@/lib/supabase/client";
import { command } from "@/lib/api";
import { date, money, number } from "@/lib/utils";
import type { Dashboard } from "@/lib/types";
import { StationLocation } from "./station-location";
import { StationOperations } from "./station-operations";
import { DocumentCentre } from "./document-centre";
import { DeliveryBoard } from "./delivery-board";
import { OwnerOverview } from "./owner-overview";
import {
  getLatestTankReconciliation,
  overviewSnapshotTime,
} from "@/lib/overview-model";
import { useClock } from "@/lib/use-clock";
import { fuelGradeLabel } from "@/lib/fuel-grades";
import { ShiftRegister } from "./shift-register";
import { FirstStationSetup } from "./workspace-onboarding";
import {
  lockWorkspaceDevice,
  useWorkspaceOffline,
  WorkspaceOfflineStation,
  WorkspaceSyncStatus,
} from "./workspace-offline";
import {
  readWorkspaceLocation,
  subscribeWorkspaceLocation,
  workspaceLocationSnapshot,
  workspaceServerSnapshot,
  updateWorkspaceLocation,
  sidebarSnapshot,
  sidebarServerSnapshot,
  subscribeSidebar,
  toggleSidebar,
} from "@/lib/workspace-navigation";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { ActionForm, Field } from "./forms";
import { WorkflowDialog, type Modal } from "./workflows";

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
  overview: "Station overview",
  deliveries: "Deliveries",
  shifts: "Shifts & reconciliation",
  credit: "Corporate credit",
  stock: "Recorded stock & prices",
  settings: "Station settings",
  operations: "Station work",
  documents: "Documents",
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
  const device = useWorkspaceOffline();
  const connectionLost = device?.online === false;
  const [data, setData] = useState(() => normalize(initial));
  const locationSearch = useSyncExternalStore(
    subscribeWorkspaceLocation,
    workspaceLocationSnapshot,
    workspaceServerSnapshot,
  );
  const location = readWorkspaceLocation(locationSearch, data);
  const stationId = location.station;
  const tab = location.view;
  const [draftModal, setDraftModal] = useState<Modal | null>(null);
  const modal = draftModal || location.modal;
  const setModal = (value: Modal | null) => {
    const record =
      value &&
      (
        {
          delivery_detail: "delivery",
          shift_detail: "shift",
          account_detail: "account",
        } as Record<string, string>
      )[value.type];
    setDraftModal(record ? null : value);
    updateWorkspaceLocation(
      { record: record || null, id: record ? value?.id || null : null },
      !value,
    );
  };
  const setTab = (view: Tab) => {
    setDraftModal(null);
    updateWorkspaceLocation({
      view,
      q: null,
      record: null,
      id: null,
      work: null,
    });
  };
  const setStationId = (id: string) => {
    setDraftModal(null);
    updateWorkspaceLocation({ station: id, record: null, id: null, q: null });
  };
  const [mobile, setMobile] = useState(false);
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    sidebarSnapshot,
    sidebarServerSnapshot,
  );
  const [focusedTank, setFocusedTank] = useState<string>();
  useEffect(() => {
    if (tab !== "stock" || !focusedTank) return;
    const tank = document.getElementById(`tank-${focusedTank}`);
    tank?.focus({ preventScroll: true });
    tank?.scrollIntoView({ block: "nearest" });
  }, [tab, focusedTank]);
  const [privateMode, setPrivateMode] = useState(false);
  const search = location.query;
  const setSearch = (q: string) =>
    updateWorkspaceLocation({ q: q || null }, true);
  const [now, setNow] = useState(() => Date.now());
  const [syncError, setSyncError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [help, setHelp] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const refreshController = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!navigator.onLine) return;
    refreshController.current?.abort();
    const controller = new AbortController();
    refreshController.current = controller;
    setSyncing(true);
    try {
      const r = await fetch("/api/dashboard", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (r.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }
      if (!r.ok) throw new Error();
      const next = normalize(await r.json());
      setData(next);
      setNow(Date.now());
      setSyncError(false);
    } catch {
      if (!controller.signal.aborted && navigator.onLine) setSyncError(true);
    } finally {
      if (refreshController.current === controller) setSyncing(false);
    }
  }, [router]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    return () => {
      clearInterval(timer);
      refreshController.current?.abort();
    };
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
  const clock = useClock();
  const shiftOverdue = currentShift && Date.parse(currentShift.due_at) <= clock;
  const pending =
    deliveries.filter((d) => d.status === "submitted").length +
    shifts.filter((s) => s.status === "review").length;
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
    const channel =
      "BroadcastChannel" in window
        ? new BroadcastChannel("pumpshield-session")
        : null;
    channel?.postMessage("lock");
    channel?.close();
    await lockWorkspaceDevice();
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
            Create an owner workspace, or review a specific invitation before
            joining a station.
          </p>
          <ActionForm
            op="join"
            base={{ intent: "create_workspace" }}
            onDone={() => void refresh()}
            submit="Create my workspace"
          >
            <Field
              label="Your name"
              name="person"
              minLength={2}
              maxLength={100}
              placeholder="Full name"
            />
            <Field
              label="Business name"
              name="name"
              minLength={2}
              maxLength={100}
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
  const workspaceNavigation = (
    <>
      <div className="sidebar-brand">
        <Brand />
      </div>
      <nav aria-label="Workspace modules">
        {navigation
          .filter(
            (n) =>
              owner ||
              [
                "overview",
                "deliveries",
                "shifts",
                "credit",
                "operations",
              ].includes(n.id),
          )
          .map((n) => (
            <button
              key={n.id}
              type="button"
              className={tab === n.id ? "nav-item active" : "nav-item"}
              title={!owner && n.id === "overview" ? "Home" : n.label}
              aria-label={!owner && n.id === "overview" ? "Home" : n.label}
              aria-current={tab === n.id ? "page" : undefined}
              onClick={() => {
                setTab(n.id);
                setSearch("");
                setMobile(false);
              }}
            >
              <n.icon size={19} />
              <span className="nav-label">
                {!owner && n.id === "overview" ? "Home" : n.label}
              </span>
            </button>
          ))}
      </nav>
      <div className="sidebar-bottom">
        <button
          className="nav-item"
          title="Help"
          aria-label="Help"
          onClick={() => {
            setMobile(false);
            setHelp(true);
          }}
        >
          <CircleHelp size={18} /> <span className="nav-label">Help</span>
        </button>
        {owner && (
          <button
            className={`nav-item ${tab === "settings" ? "active" : ""}`}
            title="Settings"
            aria-label="Settings"
            aria-current={tab === "settings" ? "page" : undefined}
            onClick={() => {
              setTab("settings");
              setMobile(false);
            }}
          >
            <Settings2 size={18} /> <span className="nav-label">Settings</span>
          </button>
        )}
        <div className="profile">
          <span className="profile-avatar" aria-hidden="true">
            {data.member.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="profile-label">
            <strong title={data.member.name}>{data.member.name}</strong>
            <small>{owner ? "Owner" : "Munshi"}</small>
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void logout()}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={17} />
          </Button>
        </div>
      </div>
    </>
  );
  if (owner && !station)
    return (
      <FirstStationSetup
        onSignOut={logout}
        onDone={() => {
          setTab("settings");
          void refresh();
        }}
      />
    );
  return (
    <div
      data-theme="light"
      data-nav-collapsed={collapsed}
      className={`app-shell ${privateMode ? "privacy-on" : ""}`}
    >
      <WorkspaceOfflineStation
        stationId={stationId}
        onSynced={() => void refresh()}
      />
      <aside className="sidebar" id="desktop-navigation">
        {workspaceNavigation}
      </aside>
      <Dialog
        open={mobile}
        onOpenChange={setMobile}
        title="Workspace navigation"
        variant="navigation"
      >
        {workspaceNavigation}
      </Dialog>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-start">
            <button
              className="mobile-only icon-button"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
              aria-expanded={mobile}
              aria-haspopup="dialog"
            >
              <Menu size={22} />
            </button>
            <button
              type="button"
              className="desktop-sidebar-toggle icon-button"
              onClick={toggleSidebar}
              aria-controls="desktop-navigation"
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Sidebar size={20} />
            </button>
            <div className="station-select">
              <Building2 size={17} aria-hidden="true" />
              {data.stations.length > 1 ? (
                <select
                  aria-label="Active station"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                >
                  {data.stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="station-name" title={station?.name}>
                  {station?.name ?? "Station"}
                </span>
              )}
            </div>
          </div>
          <div className="topbar-actions">
            <WorkspaceSyncStatus
              onRefresh={!connectionLost ? () => void refresh() : undefined}
              refreshing={syncing}
              refreshFailed={syncError}
            />
            {owner && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="workspace-privacy-button"
                role="switch"
                aria-label="Hide financial amounts"
                aria-checked={privateMode}
                title={
                  privateMode
                    ? "Show financial amounts"
                    : "Hide financial amounts"
                }
                onClick={() => setPrivateMode(!privateMode)}
              >
                {privateMode ? <EyeOff size={19} /> : <Eye size={19} />}
              </Button>
            )}
            {owner && pending > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="notification-button"
                onClick={() => setAlerts(true)}
                aria-label={`${pending} pending reviews`}
              >
                <Bell size={19} />
                <i />
              </Button>
            )}
          </div>
        </header>
        <main
          id="main"
          className={`workspace-content ${owner && tab === "overview" ? "workspace-overview" : ""}`}
        >
          {data.workspace.includes("Design Lab") && (
            <div className="demo-banner">
              <strong>Design Lab</strong>
              <span>Synthetic data only</span>
            </div>
          )}
          <section className="page-heading">
            <div>
              <h1>
                {owner
                  ? title[tab]
                  : tab === "overview"
                    ? "Station tasks"
                    : tab === "credit"
                      ? "Digital parchi"
                      : title[tab]}
              </h1>
              {!owner && tab === "credit" && (
                <p>Scan an owner-issued vehicle pass to record a fill.</p>
              )}
            </div>
            <div className="heading-actions">
              {owner && ["credit", "shifts"].includes(tab) && (
                <Button variant="secondary" onClick={exportData}>
                  <Download size={15} />
                  {tab === "credit"
                    ? "Export recent fills"
                    : "Export recent shifts"}
                </Button>
              )}
              {!["operations", "documents", "overview"].includes(tab) &&
                (owner || tab !== "deliveries") && (
                  <Button
                    disabled={
                      !owner &&
                      tab === "credit" &&
                      (!currentShift || shiftOverdue)
                    }
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
          {syncError && !connectionLost && (
            <div className="notice warning" role="status">
              <Activity size={18} /> Couldn’t refresh. Showing the last loaded
              records.
            </div>
          )}
          {!owner && tab === "credit" && (!currentShift || shiftOverdue) && (
            <div className="field-readiness notice warning">
              <div>
                <strong>
                  {shiftOverdue ? "Shift cutoff reached" : "No shift open"}
                </strong>
                <p>
                  {shiftOverdue
                    ? "Close the overdue shift before recording another fill."
                    : "Open a shift to lock fuel prices before recording a fill."}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  open(
                    shiftOverdue ? "close_shift" : "open_shift",
                    currentShift?.id,
                  )
                }
              >
                {shiftOverdue ? "Close shift" : "Open shift"}
              </Button>
            </div>
          )}
          {!owner && tab === "overview" && (
            <div className="kiosk-actions station-task-grid">
              <button
                onClick={() =>
                  open(
                    currentShift ? "close_shift" : "open_shift",
                    currentShift?.id,
                  )
                }
              >
                <span className="station-task-icon">
                  <ClipboardCheck size={23} />
                </span>
                <span className="station-task-copy">
                  <strong>{currentShift ? "Close shift" : "Open shift"}</strong>
                  <small>
                    {currentShift
                      ? `${shiftOverdue ? "Overdue · " : "Cutoff "}${date(currentShift.due_at)}`
                      : "Start with locked prices and readings"}
                  </small>
                </span>
                <ArrowUpRight size={18} />
              </button>
              <button
                onClick={() => {
                  setTab("deliveries");
                }}
              >
                <span className="station-task-icon">
                  <Truck size={23} />
                </span>
                <span className="station-task-copy">
                  <strong>Deliveries</strong>
                  <small>Audit arrivals and confirm receipts</small>
                </span>
                <ArrowUpRight size={18} />
              </button>
              <button onClick={() => setTab("credit")}>
                <span className="station-task-icon">
                  <WalletCards size={23} />
                </span>
                <span className="station-task-copy">
                  <strong>Digital parchi</strong>
                  <small>Scan a vehicle pass and record fuel</small>
                </span>
                <ArrowUpRight size={18} />
              </button>
            </div>
          )}
          {tab === "operations" && (
            <StationOperations
              key={stationId}
              stationId={stationId}
              data={data}
              workKind={
                new URLSearchParams(locationSearch).get("work") || undefined
              }
              onWorkKindChange={(kind) =>
                updateWorkspaceLocation({ work: kind }, true)
              }
              onOpenDelivery={(id) => open("delivery_detail", id)}
            />
          )}
          {owner && tab === "documents" && (
            <DocumentCentre data={data} stationId={stationId} />
          )}
          {owner && tab === "overview" && (
            <OwnerOverview
              key={stationId}
              data={data}
              deliveries={deliveries}
              shifts={shifts}
              tanks={tanks}
              station={station}
              privateMode={privateMode}
              loadedAt={overviewSnapshotTime(data.snapshot_at, now)}
              onOpen={open}
              onStock={(tankId) => {
                setFocusedTank(tankId);
                setTab("stock");
              }}
            />
          )}
          {tab === "deliveries" && (
            <DeliveryBoard
              deliveries={deliveries.filter((d) =>
                `${d.vehicle} ${d.reference}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )}
              owner={owner}
              onOpen={(id) => open("delivery_detail", id)}
              search={search}
              onSearchChange={setSearch}
            />
          )}
          {tab === "shifts" && (
            <>
              {currentShift && (
                <div
                  className={`shift-current-strip${shiftOverdue ? " overdue" : ""}`}
                >
                  <Clock3 size={19} />
                  <strong>{currentShift.name}</strong>
                  <span>
                    {shiftOverdue
                      ? "Cutoff passed"
                      : `Cutoff ${date(currentShift.due_at)} PKT`}
                  </span>
                </div>
              )}
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Shift register</h2>
                  </div>
                </div>
                {shifts.length ? (
                  <ShiftRegister
                    shifts={shifts}
                    owner={owner}
                    privateMode={privateMode}
                    onOpen={open}
                  />
                ) : (
                  <Empty
                    title="No shifts recorded"
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
                {owner && (
                  <Button variant="secondary" onClick={() => open("parchi")}>
                    <Plus size={16} />
                    New digital parchi
                  </Button>
                )}
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
                    <div
                      className="table-scroll"
                      role="region"
                      aria-label={`${title[tab]} register`}
                      tabIndex={0}
                    >
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
                      title="No recorded credit fills"
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
                  {tanks.map((t) => {
                    const reconciliation = getLatestTankReconciliation(
                      shifts,
                      t.id,
                    );
                    return (
                      <section
                        key={t.id}
                        id={`tank-${t.id}`}
                        tabIndex={-1}
                        className="panel stock-card"
                      >
                        <div className="panel-heading">
                          <div>
                            <h2>{t.name}</h2>
                            <p>{fuelGradeLabel(t.grade)}</p>
                          </div>
                        </div>
                        <div className="stock-visual">
                          <meter
                            className="stock-level"
                            min={0}
                            max={t.capacity}
                            value={Math.max(0, Math.min(t.stock, t.capacity))}
                            aria-label={`${t.name} recorded stock`}
                          />
                          <div className="stock-readout">
                            <span>Recorded stock</span>
                            <strong>
                              {number(t.stock, 1)}
                              <small> L</small>
                            </strong>
                            <span>of {number(t.capacity)} L capacity</span>
                            <hr />
                            <b>{number(t.capacity - t.stock, 1)} L available</b>
                          </div>
                        </div>
                        <div className="stock-card-footer">
                          <Clock3 size={13} />
                          Last updated {date(t.updated_at)}
                        </div>
                        {reconciliation && (
                          <div className="stock-source">
                            <div>
                              <span>Last reconciled shift</span>
                              <strong>{reconciliation.shift.name}</strong>
                              <small>
                                {number(reconciliation.reading.sold, 1)} L
                                dispensed ·{" "}
                                {number(reconciliation.reading.actual, 1)} L
                                measured
                              </small>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                open("shift_detail", reconciliation.shift.id)
                              }
                            >
                              View reconciliation <ArrowUpRight size={15} />
                            </Button>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <section className="panel">
                  <Empty
                    icon={Droplets}
                    title="No tanks configured"
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
                  <div
                    className="table-scroll"
                    role="region"
                    aria-label={`${title[tab]} register`}
                    tabIndex={0}
                  >
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
                                <span className="fuel-grade">
                                  {fuelGradeLabel(p.grade)}
                                </span>
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
          {owner && tab === "settings" && station && (
            <div id="station-location" tabIndex={-1}>
              <StationLocation
                key={station.id}
                station={station}
                onSaved={() => void refresh()}
              />
            </div>
          )}
          {owner && tab === "settings" && (
            <>
              <div className="settings-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Station setup</h2>
                      <p>Configure your station before opening a shift.</p>
                    </div>
                    <Settings2 size={20} />
                  </div>
                  <div className="setup-list">
                    {[
                      {
                        label: station
                          ? "Station configured"
                          : "Add your station",
                        desc: "Station name, OMC, and city",
                        done: !!station,
                        action: "station",
                      },
                      {
                        label: tanks.length
                          ? "Review underground tanks"
                          : "Configure underground tanks",
                        desc: "Capacity, opening dip, and certified chart",
                        done: !!tanks.length,
                        action: "tank",
                      },
                      {
                        label: nozzles.length
                          ? "Review nozzle mapping"
                          : "Map your nozzles",
                        desc: "Source tank and opening totalizer",
                        done: !!nozzles.length,
                        action: "nozzle",
                      },
                      {
                        label: data.prices.some(
                          (p) => p.station_id === stationId,
                        )
                          ? "Review fuel prices"
                          : "Record current fuel prices",
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
                        onClick={() => {
                          if (
                            step.done &&
                            ["tank", "price"].includes(step.action)
                          )
                            setTab("stock");
                          else if (step.done && step.action !== "invite")
                            document
                              .getElementById(
                                step.action === "station"
                                  ? "station-location"
                                  : "nozzle-mapping",
                              )
                              ?.focus();
                          else open(step.action);
                        }}
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
                <section className="panel" id="nozzle-mapping" tabIndex={-1}>
                  <div className="panel-heading">
                    <div>
                      <h2>Nozzle mapping</h2>
                      <p>Readings flow into the correct tank.</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!!currentShift}
                      onClick={() => open("nozzle")}
                    >
                      <Plus size={14} />
                      Add
                    </Button>
                  </div>
                  {currentShift && (
                    <p className="notice warning">
                      Close the current shift before adding or changing
                      equipment.
                    </p>
                  )}
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
                <div
                  className="table-scroll"
                  role="region"
                  aria-label={`${title[tab]} register`}
                  tabIndex={0}
                >
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
            </>
          )}
        </main>
        <nav className="ledger-mobile-nav" aria-label="Station navigation">
          {navigation
            .filter((n) =>
              [
                "overview",
                "deliveries",
                "shifts",
                "credit",
                "operations",
              ].includes(n.id),
            )
            .map((n) => (
              <button
                key={n.id}
                aria-current={tab === n.id ? "page" : undefined}
                onClick={() => {
                  setTab(n.id);
                  setMobile(false);
                  window.scrollTo({ top: 0, behavior: "instant" });
                }}
              >
                <n.icon size={20} />
                <span>
                  {n.id === "overview"
                    ? "Home"
                    : n.id === "shifts"
                      ? "Shifts"
                      : n.id === "credit"
                        ? "Parchi"
                        : n.id === "operations"
                          ? "Work"
                          : "Deliveries"}
                </span>
              </button>
            ))}
        </nav>
      </div>
      {modal && (
        <WorkflowDialog
          modal={modal}
          data={data}
          stationId={stationId}
          privateMode={privateMode}
          onClose={() =>
            setModal(
              modal.type === "vehicle" && modal.id
                ? { type: "account_detail", id: modal.id }
                : null,
            )
          }
          onDone={() => {
            setModal(
              modal.type === "vehicle" && modal.id
                ? { type: "account_detail", id: modal.id }
                : null,
            );
            void refresh();
          }}
          onNavigate={setModal}
          onReviewTank={(id) => {
            setModal(null);
            setFocusedTank(id);
            setTab("stock");
          }}
        />
      )}
      <Dialog
        open={help}
        onOpenChange={setHelp}
        title={owner ? "Set up your station" : "Your shift checklist"}
      >
        {owner ? (
          <ol className="help-list">
            <li>Add a station in Settings.</li>
            <li>
              Add tanks with certified calibration charts, then map nozzles.
            </li>
            <li>Enter current prices from your verified source.</li>
            <li>
              Authorize a Munshi’s email. They create and confirm their account
              to join.
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
        ) : (
          <ol className="help-list">
            <li>Open a shift before recording credit fills.</li>
            <li>
              Scan the QR on an owner-issued vehicle pass in Digital parchi.
            </li>
            <li>Audit arriving deliveries and capture the required photos.</li>
            <li>
              Close your shift with final meter readings, tank dips and cash.
            </li>
            <li>
              Check sync status after reconnecting if you saved work offline.
            </li>
          </ol>
        )}
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
