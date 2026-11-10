# PumpShield — repository-specific redesign implementation prompt

Use this prompt in the next development stage **only after implementation is requested**. The audit that produced it intentionally changed no application source or production schema. Build on the real application; do not replace its behavior with mock data, a frontend-only prototype, or a generic dashboard template.

## 1. Mission and baseline

Redesign PumpShield for a real petrol-station client. Make Owner review/oversight and Munshi field entry faster, readable and predictable while preserving the existing database-authoritative operational safeguards. Improve security before visual release. Use the selected **Petroleum Ledger** direction, current installed stack and real Supabase operations. Hardware tracking of owned trucks remains out of scope. Contractor driver-phone links remain supported with honest foreground-GPS limits.

Repository: `https://github.com/abdullahfawadd/PumpShield`; audit checkout `D:/PumpShield`; baseline commit `fa0c03254930ad9f41859eb2e189dd889f51f3ce`; current deployment `https://pumpshield-seven.vercel.app`. Refresh the actual checkout and compare drift before editing. Do not assume line numbers or hosted settings remain unchanged. Preserve user changes and pending field drafts. Use a `codex/` branch for implementation. Do not reset Design Lab or seed records over existing data.

Read these audit artifacts first, then targeted owning source files:

1. `artifacts/pumpshield-audit/01-executive-review.md` — findings, priorities and honest limits.
2. `02-route-and-workflow-matrix.md` — exact pages, handlers, role surfaces and state machines.
3. `03-visual-audit.md` — screenshot-backed findings V01–V16 and current-copy replacement table.
4. `04-competitive-research.md` — verified associations, actual reference material and blocked visual research.
5. `05-design-directions-and-colors.md` and `evidence/design-tokens.json` — selected semantics and48 contrast checks.
6. `06-component-inventory.md` — current/good/inconsistent/missing component matrix.
7. `07-architecture-and-security.md` — current architecture, three medium findings and managed canonical reports.
8. `08-testing-and-verification.md` — actual tests, outcomes and remaining acceptance gaps.
9. `gallery.html`, `evidence/screenshot-index.json`, `contact-sheets/` — actual deployed evidence.
10. `design-exploration.html` — separate responsive concept. Use direction01; it is illustrative and has no backend. Do not transplant its synthetic values or simplified confirmation logic into production.

Read `AGENTS.md`, README, SECURITY and installed Next16.4.5 documentation under `node_modules/next/dist/docs/` before deciding API conventions. In particular, page/route params are promises and `proxy.ts` is the current convention. Verify this against the installed package after any approved dependency update.

## 2. Actual stack and existing structure

Installed audit versions: Next16.4.5, React/ReactDOM19.3.1, TypeScript5.9.3, Tailwind4.3.4, SupabaseJS2.119.0, SSR0.12.7, SupabaseCLI2.122.1, RadixDialog1.3.1, RadixSlot1.5.0, Phosphor2.1.10, Glisse0.5.0, MapLibre6.17.0, Leaflet1.9.4, ZXingBrowser0.2.1, Zod4.6.7, Vitest4.1.12, pdf-lib1.17.1 and qrcode1.5.4. Resolve exact transitive versions from `evidence/repository-inventory.json` and the installed tree. Package ranges alone are not installed versions. Keep Node24 and lockfile consistency. Do not add another icon library, UI framework, chart package or global store merely to achieve a visual style.

Owning files:

| Current file | Responsibility / redesign work |
|---|---|
| `src/app/app/page.tsx` | Server Auth/dashboard and problematic automatic memberless join; make read navigation side-effect free |
| `src/components/workspace.tsx` |1710-line shell, local view state, selectors, overview/registers/settings, polling, export, shared headings; decompose by real domain |
| `src/components/workflows.tsx` |1135-line modal switch including station/equipment/access, delivery, shift, account/vehicle/payment; extract focused forms with preserved op payloads |
| `src/components/delivery-board.tsx` | Existing guarded forward drag and stage columns; retain desktop board, add list/keyboard/mobile behavior |
| `src/components/station-operations.tsx` | Four work kinds, creation/detail/history/state transitions; preserve role and concurrency rules |
| `src/components/parchi-form.tsx` | Existing pass→fill/evidence→server approval steps, match lookup and invalid-pass message |
| `src/components/offline-terminal.tsx` |727-line prepare/unlock/session/draft queue/sync controller; repair async lifecycle before extracting UI |
| `src/components/offline-draft-form.tsx` | Offline parchi/arrival/shift drafts; preserve original shift, capture metadata and evidence references |
| `src/lib/offline-vault.ts` | IndexedDB encryption; retain key derivation/AAD/format unless migration explicitly tested |
| `src/lib/offline-sync.ts`, `offline-types.ts`, `field-api.ts` | Upload/replay contract, current permission verification and idempotency |
| `camera.tsx`, `qr-scan.tsx`, `src/lib/evidence-capture.ts` | Real device capture/ZXing and evidence assertions; no pretend OCR |
| `tracking.tsx`, `field-map.tsx`, `route-map.tsx`, `location-picker.tsx`, `station-location.tsx`, `src/lib/geo.ts` | Real reported positions, station pin, interpolation/fallback; no invented future route/ETA |
| `src/components/document-centre.tsx`, `src/lib/report-pdf.ts`, document/pass routes | Recent saved documents and real PDFs; update design, typography, scope and tests |
| `src/components/ui/button.tsx`, `ui/dialog.tsx`, `forms.tsx`, `icons.tsx`, `brand.tsx` | Consolidate semantic primitives; explicit dialog trigger/return focus; consistent existing Phosphor family |
| `src/components/login.tsx`, `design-canvas.tsx`, `src/app/login.css` | Actual auth modes, pointer/motion canvas; preserve auth and reduced motion while making form-first mobile |
| `src/app/globals.css`, `editorial.css`, `operations.css`, `field.css` | Layered styles and hardcoded colors; consolidate tokens/ownership instead of another overrides layer |
| `src/app/layout.tsx` | Geist/GeistMono, global style imports, skip link, Sonner, metadata; scope loading where justified |
| `src/app/api/**`, `src/proxy.ts`, `src/lib/supabase/**` | Authenticated adapters, error contracts and cookie refresh; preserve no-store/role/resource checks |
| `supabase/migrations/*.sql` | Effective schema/invariants across9 migrations. `schema.sql` is only the initial snapshot, not current truth |
| `tests/*.test.ts`, `tests/database.sql`, `tests/operations.sql`, `tests/field.sql` | Current12 unit tests and3 rolled-back integration suites; extend meaningfully |
| `.github/workflows/ci.yml`, `codeql.yml`, `.github/dependabot.yml`, `next.config.ts`, `vercel.json`, `public/sw.js` | Current quality/security/deployment/cache constraints; do not weaken for convenience |

Static import analysis found no cycles; do not invent a circular-dependency remediation project. Large UI components and repeated CSS are established debt, but source review does not justify rewriting every file.

## 3. Preserve the actual product surface

Pages: `/` redirect, `/login` with signin/signup/recovery modes, `/app`, `/offline`, `/auth/password`, `/gate/[token]`. Handlers: `/auth/callback`, `/api/dashboard`, `/api/command`, `/api/operations`, `/api/field`, `/api/tracking`, `/api/documents/[kind]/[id]`, `/api/evidence/[id]`, `/api/vehicle-pass/[id]`. Metadata: manifest/icon/favicon; error/not-found states.

The eight Owner modules are local views in `/app`: overview,deliveries,shifts,credit,operations,documents,stock,settings. Station operations contains cases,indents,maintenance,handovers. Mu receives assigned-station deliveries,shifts,parchi and permitted station work plus a field home. The normal screenshot count is11 Owner screens and7 Mu screens after expanding operations. There is no separate owned Fleet hardware module, notification inbox, customer portal, tax invoice module or complete reports archive.

Add validated URL-backed view state, preferably incrementally with an adapter preserving current `/app` entry compatibility. Example proposed query contract: `/app?view=deliveries&station=<uuid>&delivery=<uuid>&stage=submitted`. Validate enums/UUIDs, reject unauthorized resource identifiers and never place bearer links, vehicle credentials, evidence signed URLs or financial payloads in navigation URLs. Back/forward, reload and sharing a record within authorized membership must preserve context. A station change clears incompatible selected records and stale form state. A mobile list is a layout change, not a new backend role.

Do not manufacture a multi-workspace switcher over the current one-membership model. Do not expose Owner balances, rates, calibrated stock volumes, reconciliation results or full account details to Mu simply because components are now shared. Hidden UI is not authorization.

## 4. Security prerequisites — before visual release

All three findings are medium security severity and P1 implementation priorities. The scan is partial; fixing these is not a guarantee of overall security. Reopen the exact source and canonical findings linked in report07; use new migrations, not edits to applied migrations. Add regression tests first on disposable/rolled-back fixtures.

### Finite numeric domain values

Effective `private.command` in `20261108203536_mobile_field_operations.sql:114` checks raw JSON with an exact-case regex for quoted NaN/Infinity. Postgres normalizes `nan`, mixed case or padded NaN at `::numeric`; comparisons in shift close218–240 can admit it into nozzle totals and shift results. An active station user still needs legitimate evidence/open shift; do not misreport this as anonymous account takeover.

Implement finite checks **after parsing inside SQL**, including every litres, dip, cash/POS, limit, rate, coefficient, counter, capacity and coordinate boundary. Use a narrowly owned helper/domain representation and finite CHECK constraints on numeric columns where appropriate. Check existing values read-only before adding constraints; stop for an agreed repair if any invalid data exists. Do not silently change balances or stock. Preserve atomic commands and legitimate decimal precision. Do not rely on browser number fields, `Number.isFinite` in the UI or HTTP Zod alone because direct authenticated RPC remains possible.

Add operation-specific discriminated Zod contracts for HTTP feedback, keeping SQL authoritative. Tests must include lowercase/mixed/padded NaN, Infinity variants, null/missing, boundaries, negative/unexpected values, direct RPC, failed-command no-write and future finite closure after rejection. Check tracking/calibration paths too; do not patch only one cash field.

### Explicit invitation acceptance

`src/app/app/page.tsx` currently calls join on GET for memberless users. SQL119–130 accepts a pending invitation by email without a selected invitation/consent, and revoked membership blocks future join. Remove membership mutation from page rendering. Present the target business/station/role and require explicit recipient acceptance of a specific invitation through an authenticated state-changing operation. Provide decline and independent Owner workspace creation before membership exists. Handle multiple invitations deterministically with user choice. Existing active memberships cannot be displaced, and staff revocation must remain effective. Define controlled recovery/leave behavior; do not casually permit a revoked employee to rejoin.

Tests: open `/app` causes no DB mutation; future Owner can decline unrelated invite; legitimate Mu explicitly accepts correct tenant/station; competing invite selection; already-member isolation; revoked membership; expired/cancelled invite; repeated accept idempotency/concurrency. Do not create or revoke real client users while testing.

### Offline lock lifetime

`offline-terminal.tsx` lock56 clears state/ref, but load194–209 restores decrypted context/session unconditionally after awaits. Refresh569–582 and save211–220 retain old handles. Add a session generation or scoped handle invalidated by Lock, logout broadcast, unmount and account/workspace changes. Every prepare/unlock/read/save/refresh/sync continuation must compare generation and identity after each await and before updating key/plaintext/queue state. Abort cancellable network work; abort alone does not invalidate IndexedDB/crypto promises. A delayed response after Lock must never unlock, render data or post a draft. Keep Lock usable during busy operations.

Preserve AES-GCM256, PBKDF2-SHA256600k, random salt/IV, nonextractable key, actor/workspace/record AAD and existing encrypted drafts. No key/passphrase in localStorage, URLs, logs or persistent Redux state. Tests with delayed network and IndexedDB promises must cover refresh/save/load/setup/unlock/sync, cross-tab logout, idle/visibility lock and unmount. Ordinary lock/unlock passing is insufficient to test this race.

### Additional release safeguards

Retain tenant RLS, authenticated SELECT-only direct table grants, fixed-search-path narrow RPC gateways, same-origin Next mutation checks, no-store private responses, private5MB evidence bucket, one-use/age-bound evidence, locked shift prices, request ID/payload-hash replay protection, row locks and expected-status state changes. Keep random hashed expiring/revocable driver capabilities and current delivery-status restrictions. The amount privacy toggle is presentation only.

Review CSP `unsafe-inline` with an installed-Next-compatible nonce/hash plan and actual offline/media testing; do not simply remove it and break the app. Preserve framing/HSTS/nosniff/referrer/permission policies and provider attribution. Treat browser photo/GPS/time/hash assertions as untrusted supporting evidence. Never log raw pass credentials, driver links, photos, passphrases or private financial payloads. Correct SECURITY.md's overly broad “all mutations authenticate twice”/Owner-only evidence wording to account for direct RPC, uploader storage policy and driver capabilities.

Hosted SMTP/email redirects, MFA/step-up policy, leaked-password protection, rate limits, backup/PITR/restore and monitoring need explicit operator verification. The current hosted advisor reports leaked-password protection disabled. Source login minimum12 is below NIST800-63B-4's15-character single-factor guidance; choose and implement a policy consistently with hosted Auth, while supporting password managers/paste and avoiding arbitrary composition rules. No compliance badge or “vulnerability-free” claim.

## 5. Selected visual system — Petroleum Ledger

Build a calm, precise station workspace. Use warm paper, clear white surfaces, charcoal type and petroleum actions. Separate statuses by meaning; do not apply green to everything. Avoid pastel purple data vessels, giant generic KPI cards, decorative dashboard gradients and excessive rounded pills. Preserve the existing coherent icon family and original brand identity unless a client-approved replacement is supplied.

Implement these semantic colors centrally:

```css
:root {
  --background: #F5F3EE;
  --surface: #FFFFFF;
  --surface-raised: #FFFFFF;
  --text: #202724;
  --text-secondary: #58645F;
  --primary: #174C45;
  --on-primary: #FFFFFF;
  --secondary: #E9EDE7;
  --on-secondary: #34473E;
  --border: #CAD1CB;
  --control-border: #7A8580;
  --focus: #2463AA;
  --success: #1F6247;
  --success-surface: #E7F3EB;
  --warning: #80530B;
  --warning-surface: #FFF3D6;
  --error: #9E302F;
  --error-surface: #FCEBE8;
  --info: #24598A;
  --info-surface: #EAF2FC;
  --chart-1: #174C45;
  --chart-2: #24598A;
  --chart-3: #80530B;
}
```

Use decorative `border` for card separation and tested `control-border` for meaningful inputs/controls. Do not weaken text through opacity. All selected tested pairs pass their thresholds in the audit's contrast JSON; recalculate final computed colors, including hover, focus, disabled, error and overlay states. Ratios do not transfer through translucent backgrounds automatically.

Typography: existing self-hosted Geist and GeistMono,400/500/600 weights; body14/20px desktop,16/24px field forms, metadata12/18px minimum; page title28/34px desktop,24/30px phone; section16–18px; quantities28–32px with tabular numbers; financial values never ellipsized. Use explicit PKR,L,mm,°C and PKR/L. Do not substitute UI font names based on marketing references.

Spacing scale4,8,12,16,20,24,32,48px. Controls8px radius, cards12px, dialog16px, status5px. Shadows only for floating layers (`0 8px 28px #142A201A`, dialog `0 24px 72px #142A2029`). Normal action44px minimum, field actions48–52px. Focus3px with2px offset and visible contrast. No translucent essential text over a map. Icons20px normal,24px field; one consistent Phosphor weight, filled only when selection benefits.

Glisse can remain on optional navigation/secondary selection where tested. Financial inputs, confirmation actions and evidence requirements must stay opaque/readable. Provide reduced-motion/reduced-transparency fallbacks. Do not assume Apple material provides accessibility automatically.

## 6. Responsive shell and login

Desktop1920×1080,1440×900,1366×768:216px sidebar,64px header,24–32px content gutters; cap overly wide reading content while allowing real registers. At768×1024 use compact rail/menu and appropriate two-column sections, not a squeezed desktop sidebar. At430,390,360,320px use one column,16px gutters,56px compact header, safe-area-aware navigation and sufficient bottom padding. All flex/grid children that contain controls/numbers need `min-width:0`; define grid columns with minmax(0,1fr), stack form groups below640px. Keep unit suffixes and select option text readable.

Regression evidence: Owner320px screens expanded to339–370px layout width. Test requested viewport width, document scrollWidth and visualViewport.width together. `scrollWidth === innerWidth` alone is inadequate. Avoid global overflow-x:hidden as a cover-up. Table overflow must be intentional, labelled and keyboard-focusable; prefer mobile rows for primary work. Bottom navigation may not obscure focused controls, last rows or dialog submit. Use dvh/safe-area insets and virtual-keyboard testing; do not prevent necessary scrolling on small/zoomed devices.

Login: preserve real Supabase signin/signup/recovery; no Owner/Mu role picker or sample credentials on the page. Keep concise “Sign in to PumpShield”, persistent labels, password toggle and recovery/create-account links. Preserve password manager/autofill/paste and generic safe errors. Desktop can retain a bounded split composition with pointer-responsive canvas; reduce artwork weight and avoid excessive heading lines. Phone must prioritize the form with a small or absent decorative strip, particularly320×640 and landscape/keyboard. Do not promise one-screen login by clipping controls or disabling zoom. The logo is an original PumpShield mark, not Apple Music's glyph. Current local Flowing art/attribution needs documented reuse rights before further extraction; see assets section.

## 7. Screen-specific changes and acceptance

### Owner overview

Change the current tanker/brief-first hero into: station + current shift context, pending review queue, recorded stock summaries and relevant incoming delivery. Keep an optional bounded map below decisions. Show last verified stock and last refresh time. Preserve privacy toggle, review queue, real finance scoping and station filters. Remove sidebar “Built on evidence” promotion and generic “one clear picture” copy. No synthetic trend delta, automated forecast or live hardware reading.

Acceptance: at 390px the primary review/task appears in the first viewport after required synthetic disclosure; meaningful quantity values fit; Owner can open correct arrival/shift review directly; empty queue offers calm true empty state; stale refresh leaves last-good-data clearly marked.

### Deliveries, arrival audit, approval and decant

Desktop: compact toolbar with search, stage filters/counts, list/board view and New delivery. Four state columns can remain; sparse empty lanes should not dominate. Mobile: default vertical worklist grouped/filtered by stage. Each card shows registration, dispatch ref, current stage, meaningful timestamp and next action. Keep forward drag opening required checklist; add explicit button/keyboard alternative and refuse invalid state moves.

Detail: compact identity + stage progress + current required step first. Tracking map and history become collapsible on phones, with last signal/freshness still visible. Dispatched arrival: temperature with°C, certified per-chamber dip units/progress and required photo(s), no unload warning, then review and immutable submit. Do not add arbitrary manual measured litres where certified chart calculation is required. Submitted Owner review: compare invoice/measured/thermal/unexplained quantities and locked rate alongside evidence and capture provenance. “Unexplained shortage” is not “theft”. Approval records Owner decision, then decant remains a separate explicit physical-receipt confirmation and single stock posting.

Creation: registration, dispatch reference, depot, receiving tank, invoice volume, gantry temperature and1–8 certified chamber charts. Avoid raw CSV as the only user experience: retain paste/upload but add validation/preview, clear units, errors by chamber and existing chart reuse only with a modeled certified source. Changing equipment/calibration must respect active-shift restrictions. No unreviewed global tolerance defaults.

Acceptance: valid full lifecycle on isolated fixtures, fresh/stale/missing/reused evidence, duplicate/stale transitions, linked indent restrictions, roles, arithmetic parity and failed-command no-write. Capture every stage at desktop and phone; the current audit had no submitted delivery and did not prove that UI approval path.

### Shifts and reconciliation

Owner: compact current shift/deadline, pending review queue and register with units, variance status and row action. Mu: direct close task without repeated home greeting/cards. Closure groups nozzle baseline/closing/testing and evidence by source tank, then tank dip/photo, cash and POS/photo when required. Show calculated preview and completion checklist before lock. Server owns locked baseline/prices, deadline and actual totals. A late submission is marked; never synthesize midnight readings.

Owner review shows expected/actual volume, unexplained variance and cash reconciliation side by side with evidence and note requirement. Do not hide negative/positive sign meaning. Historical rows become mobile summary cards. Keyboard users can reach any scrollable price/register region. Preserve original actor/time/shift identity.

### Corporate credit, fuel passes and digital parchi

Owner accounts: searchable comparative rows with account name, outstanding PKR, credit limit, utilization and available balance. Do not truncate money or show unfounded ageing from synthetic opening balances. Account detail includes real ledger/statement, vehicles and issue/print pass. Pass preview remains Owner-only, credential hidden by default where reasonable; revoke/disable needs explicit confirmation naming vehicle and effect.

Mu dedicated parchi page: one New parchi action, no repeated home cards. Keep existing3-step flow. First instruction “Scan the vehicle fuel pass” with expandable “Which QR?” retaining that payment/receipt QRs and plates do not authorize credit. On match show registration/account/fuel/per-fill allowance; only then enable nozzle/litres/final reading photo. Server checks current credit/role/shift/price at posting. No editable price, account balance or self-approval. Offline visibly saves a pending encrypted draft, not approved fuel credit.

Tests: malformed pass, unissued/revoked/other-tenant pass, fuel-grade mismatch, per-fill and account limits, closed/original shift, duplicate request, retry after lost response, stale context/evidence, wrong user and camera unavailable. Decode an actual generated pass with a clearly labelled synthetic camera fixture and then a physical phone/printed pass. Never publish either QR/code in screenshots, logs or report artifacts.

### Station operations

Retain the existing four domains. Cases: linked delivery/closed shift, assignee, priority, due state, investigation and required resolution note; no auto-deduction. Indents: supplier/grade/litres and approved→linked dispatched delivery→received only after same-grade decant; no second stock posting. Maintenance: equipment ref, due date, assignment, start/completion note. Handovers: briefing and outstanding actions to named recipient who personally acknowledges; sender cannot accept.

Reduce overall slogan + subview explanation to one compact title/context. Use task list on phones, board on desktop if useful. Prioritize assigned-to-me and overdue filters only with real query/logic. Preserve include-cancelled behavior and history cursor. Fix the narrow form grid where Priority currently truncates “Normal” to “No”. Save/retry must preserve inputs; stale expected-status errors offer refresh/review, not blind automatic retry of a different action.

### Stock, settings, documents and PDFs

Recorded stock: replace large purple cylinders with compact tank bars and exact stock/capacity/ullage/last-verified labels. A tank meter needs accessible numeric text; no fake live sensor badge. Prices show effective date/source/rate/margin and shift-lock consequences. Optional reserve thresholds are future-scoped unless agreed and persisted.

Settings: separate station/location, equipment and people sections. Pin selection/use-current-location are real; never save on a map click without explicit confirmation. Show coordinate precision/accuracy and destination purpose. Equipment changes keep active-shift restrictions. People actions distinguish pending invitation, active Mu, revoked access and assigned station. Workspaces/roles remain server-owned.

Documents: concise Recent documents header, type/date/ref/record source and result count; real loading/error/empty states. Existing dashboard lists are200 recent per type and work snapshot500; exports currently cover loaded records. Do not label these “complete archive”. Implement a dedicated authorized cursor/date-range query/export if full history is included; otherwise state scope clearly. Statement calculations must reconcile opening balances/ledger rather than infer transactions from a displayed synthetic balance. Account creation/payment forms and dangerous actions need consistent review.

PDFs: keep real saved-record math, locked rates, station, reference, source time, generation time, actor/approval/evidence provenance, units, page numbering and privacy. Use compact brand header, aligned ledger rows, clear total and repeated multi-page header/footer. Keep synthetic NOT FOR SETTLEMENT and “not a tax invoice / not proof of theft or legal liability” warnings. The sample claim is400L raw difference −276L thermal =124L unexplained ×PKR300 =PKR37,200. This audit inspected actual claim/statement PDFs; no seeded parchi PDF was available. Embed licensed Unicode fonts with proper script support before claiming Urdu/company-name coverage; current ASCII normalization destroys non-Latin text. Record-reference QR is not a public authenticity signature and must not confer authorization. Do not conflate it with a private vehicle pass.

### Offline field terminal

Keep prepare/unlock distinct. Before preparation explain trusted device, separate passphrase, irrecoverable unsynced loss and required online context. After preparation collapse installation help and marketing header. Unlocked view begins with station/actor/original shift context, connection/last-refresh and pending queue, then the actual form. Draft rows show type, capture time, original shift, queued/syncing/posted/review state and actionable reason. Post only while open/unlocked with current valid online session and original shift constraints. Review-required stops subsequent posting. Network detection is not server health; show failed-auth/retry separately.

Never cache authenticated pages/API responses, driver links, signed evidence or map tiles in the service worker. Preserve encrypted photos/context, request IDs and payload hashes across retry/reload. No automatic deletion of unresolved drafts or destructive storage reset without explicit irreversible-loss confirmation. Offline passphrase recovery cannot be promised. Fix lock races first; demonstrate lost-response replay and database once-only effects on disposable synthetic data.

## 8. Exact shared component plan

Introduce or consolidate only real repeated needs from report06:

- WorkspaceShell/StationContextBar/PageHeader with role-aware navigation and validated view state.
- Button/IconButton semantic variants, labelled numeric/unit field, SearchToolbar/FilterBar, native/select adapter, StatusBadge.
- Quantity (value/unit/precision), compact Metric, RecordedTankLevel, NozzleReadingSummary and ReconciliationSummary.
- OperationalTable with accessible scroll and domain-specific mobile rows; DeliveryCard/DeliveryBoard/DeliveryList; work-item card/list.
- AsyncBoundary or equivalent for loading/error/retained stale data, concise EmptyState, RetryNotice, ConnectionStatus and PermissionState.
- EvidenceCaptureField/EvidenceViewer, GPS freshness/accuracy summary, bounded MapPanel with actual loading/fallback.
- ConfirmActionDialog with trigger focus return, named record and consequences; ReviewSummary/step progress only for genuinely lengthy tasks.
- Domain timelines retaining real immutable actor/time/events; DraftQueueItem retaining state/provenance/recovery action.

Do not add a notification inbox without a provider/workflow, a universal schema-driven form engine, generic repositories around one Supabase call, a second mobile app, another icon family, dashboard charts without data, or a fake capacity/forecast metric. Keep specialized domain fields inside their module.

## 9. Copy cleanup

Apply the exact table in report03. Replace slogans with task titles: Station overview, Deliveries, Shifts & reconciliation, Corporate credit/ Digital parchi, Recorded stock & prices, Station settings, Station work and Documents. Remove repeated sidebar reassurance, generic “Real records. Clear accountability.” and redundant paragraph introductions. Keep greeting only on home. Make empty states one useful sentence plus action. Humanize event IDs. Correct the replacement glyph between actor/time in work history and check labels for U+FFFD encoding artifacts. Change404 to Page not found.

Retain meaningful consequences and recovery copy: no unload before approval; submitted readings lock; pass is not payment QR; offline is not credit approval; signed links/credentials are private; evidence/GPS assertions are not proof; browser background tracking unavailable; calibration/source requirements; price deadlines; synthetic-data warning; verified-funds consent; PDF operational/legal distinctions; passphrase/storage-loss warning. Use progressive disclosure rather than deleting these safeguards.

## 10. Assets and licensing

Inventory current `public/brand`, `public/flowing`, tanker/map assets, icon.svg, manifest icons and local MapLibre worker before adding files. Keep provider attribution and license notices. No need to generate a truck to replace a working map marker; the main problem is oversized decorative use, not lack of assets.

Create camera/QR guidance as concise original SVG/code diagrams only if physical acceptance exposes confusion; do not generate raster icons instead of extending Phosphor. Actual evidence placeholders must never look like a captured valid nozzle photo. Brand, receipt and operational signs require real licensed/vector assets, not copied Apple trademarks. No imagegen output may be presented as a screenshot from the production application.

## 11. Architecture and engineering plan

Preserve the modular monolith and SQL transaction owner. Decompose workspace into shell + domain modules/selectors; split the workflow switch into focused domain forms; keep current public command envelopes while introducing typed contracts. Extract a small testable vault-session controller/adapter, not a service framework. Centralize semantic status/quantity formatting and reviewed calculations; server/client preview parity tests prevent drift. Avoid abstractions that only rename existing calls.

Patterns: explicit state/transition maps for view rendering backed by SQL guards; strategy only for real grade/calibration rules; adapters for camera/GPS/map/transport/IDB; existing command pattern with typed payloads; immutable domain events for history. A monitored outbox is a later requirement for actual external notifications, not an excuse to invent delivery now. Repository/factory/facade patterns are optional tools, not deliverables.

Reduce polling duplication with scoped request ownership/cancellation/visibility and last-good-data semantics. Measure before replacing polling with realtime. Do not subscribe the Mu to Owner data. Purpose-built historic queries/export avoid loading all records in the initial dashboard. Use hosted23 FK-index notices as leads; inspect EXPLAIN/workload before additive indexes. Reconcile schema.sql documentation with effective migrations using a disposable database. Never regenerate production data from the initial snapshot.

CSS: establish tokens/base/components/domain ownership, remove superseded rules only after route/state regression coverage, and avoid another appended override stylesheet. Root currently imports all five stylesheets. Scope heavy assets and media by entry/task where build/runtime measurements justify it. Keep MapLibre worker matched to installed package via existing prebuild; no CDN worker mismatch. Lazy map/scanner loads need loading/error states and offline preparation compatibility.

## 12. Testing and verification strategy

Before coding, retain current source hash and rerun baseline lint/types/12 tests/build. The audit's ignored security clone can cause Vitest to discover duplicate tests: explicitly scope tests to actual `tests/**/*.test.ts` or exclude `output/**` and `artifacts/**`. Likewise exclude audit JS from production ESLint. Do not count24 duplicated tests as new coverage.

Use isolated synthetic fixtures with private credential mechanism and stable IDs. Never print credentials or expose private passes/bearer links in screenshots, reports or CI. No real funds, stock, user revocation or station reset in QA. Rolled-back SQL suites cover core domain transitions; end-to-end browser tests must still verify corresponding UI→API→DB behavior in a disposable environment. Do not assert success based on toast alone.

Required automated tests:

1. Security regressions for all three findings and direct RPC numeric/role/tenant paths.
2. Existing calculation, PDF and vault tests preserved; per-operation validation, rounding/units, stale-transition and failed-command atomicity.
3. SQL migrations applied in clean disposable DB; all core/operations/field suites, no persistent fixtures. Add linked-grade/duplicate-indent, approval/decant, evidence reuse/age, credit limits and replay assertions as appropriate.
4. Owner/Mu authenticated browser navigation, URL state/back/reload/station context, modal open/close/return focus, native/form/API errors, search/filter/list-board/empty states and safe synthetic operations.
5. Complete delivery lifecycle, shift close/review, pass issue→real scanner decode→matched fill→server current credit→receipt, controlled payment and field replay on isolated fixtures; verify exact DB deltas and immutable history.
6. Offline prepare, encrypt, capture synthetic evidence fixture, save, reload offline, unlock, reconnect, current auth/shift rejection, lost-response replay once, review barrier and lock races. Then physical station-device/camera/printed-pass acceptance.
7. Driver capability issue/share preview/consent/20s reporting/stale/stop/expiry/revoke/replacement/status closure on isolated fixtures. Test denial without saving actual location or exposing raw capability.
8. PDFs: actual endpoint auth + render/inspect, correct math and warnings, long values/multipage, Unicode if supported, printable pass scanning. Screenshot masks on all credentials.

Required responsive/visual checks:

- Capture viewport/full-page and long-dialog top/middle/end at 1920×1080,1440×900,1366×768,430×932,390×844,360×800,320×640,768×1024. Both roles and all current modules. Inspect actual images, not only screenshot completion.
- Compare to audit evidence and selected canvas while checking operational hierarchy, clipping, untruncated money/units/options, keyboard/virtual-keyboard, safe area, zoom, stable bottom navigation, maps and stale state.
- Run axe across normal/modal/error states, and manually verify keyboard order/trap/return, screen-reader errors/status,200/400% zoom, reduced motion and physical touch targets. Color contrast4.5:1 normal text,3:1 qualifying large/non-text elements; correct observed failures rather than suppress rules.
- Do not certify WCAG from zero axe violations. Add non-color status labels/shape/dashes and inspect color-vision simulations.

Performance: reproduce audit observations before comparing. Its one-sample cache-disabled login transferred~800.7KB, app desktop~1.06MB with~652KB JS, and4×CPU phone app load event~3.81s; these are not field CWV. Collect at least3 independent cold/warm runs with specified device/network/CPU, map first-use timing, resource/bundle breakdown, LCP/CLS/interaction traces and API query counts. Reduce decorative login media, initial app JS and repeated full-dashboard requests based on measurements; avoid new large art/video dependencies. Set repeatable budgets with the client environment; do not manufacture before/after percentages.

CI: preserve pinned Actions, minimal permissions, npm ci/lint/types/unit/prod-audit/build and existing protected-route smoke tests. Add clean migration/SQL tests, synthetic role E2E, contrast/visual checks and artifact redaction checks. Never expose privileged tokens to untrusted PR code. Keep production/preview environment separation and verify deployment protection/promotion/rollback policy before a release; no unrequested deployment from this prompt.

## 13. Implementation order and review gates

Work in reviewable increments, verifying relevant behavior before expanding scope:

1. Refresh baseline, record drift, read installed Next docs and exact audit evidence. Establish disposable data/credentials and regression harness.
2. Implement three security fixes plus numeric constraints/contracts and targeted regressions. Preserve existing field drafts and SQL transactions. Security review before visual rollout.
3. Add semantic tokens, accessible primitives, dialog return focus, unit/quantity/status components and320px container/form fixes.
4. Introduce compact role-aware shell and validated URL state. Verify all normal routes/views, history and station isolation.
5. Deliver overview + delivery board/list/detail and guarded arrival/approval/decant flow. Review mobile first, then desktop evidence.
6. Deliver shifts/reconciliation, corporate credit/pass/parchi and race-safe offline terminal with full end-to-end verification.
7. Deliver existing operations, recorded stock/settings, document register and PDF improvements. Verify full history claims against actual queries.
8. Optimize measured media/JS/query costs, complete accessibility/device/security checks, update factual docs and produce final change/test/limitation summary.
9. Only then consider client-approved extensions: receivable allocation/ageing after ledger rules, persisted reserve thresholds, equipment certification/evidence and monitored reminders. Supplier scorecards need comparable reviewed history; a future corporate portal requires a separate scoped role. No broad feature expansion until core tasks pass.

Acceptance is not “looks premium”. It is a real Owner/Mu task completed accurately, clear state/provenance, correct persisted transaction, safe recovery, no narrow-screen clipping, readable controls and verified permissions. Reject any redesign that swaps real backend behavior for mock cards, bypasses approval/evidence/shift limits, invents live telemetry, silently changes stock or promises legal/security guarantees.

## 14. Final implementation deliverables

Provide the actual source changes, additive migrations, targeted tests, production build evidence, both-role screen gallery at the requested sizes, database verification for safe fixtures, before/after resource measurements and honest remaining launch configuration/device checks. Update README/SECURITY/design docs to match the delivered behavior. Keep credentials/session profiles/.env and raw pass/bearer values out of source, screenshots and commits. Include a concise rollout/rollback plan preserving ledger integrity and pending drafts. Push/deploy only when explicitly requested for that implementation stage.

Preserve this audit and exploration as references. They are not the redesigned production interface and must never become the deployed application by accident.
