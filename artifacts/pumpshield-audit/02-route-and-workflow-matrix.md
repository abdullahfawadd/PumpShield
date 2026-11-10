# Routes, modules and workflows

Source baseline and installed versions are recorded in [repository-inventory.json](evidence/repository-inventory.json). Route counts below exclude static media, framework internals and query combinations. Do not describe local tabs as independent routes.

Complete tracked project inventory: [all 168 paths](evidence/tracked-project-tree.txt), with hashes/line counts/imports in the JSON. The principal directories are `src/app` (pages, handlers, metadata and five stylesheets), `src/components` (workspace, domain workflows, camera/maps/offline and UI primitives), `src/lib` (Supabase adapters, domain calculations, evidence/field/vault/PDF helpers), `supabase` (CLI config, initial snapshot and9 additive migrations), `tests` (3 Vitest files and3 SQL suites), `scripts` (map worker preparation and synthetic seed generation), `public` (brand/Flowing/media/map assets and service worker), `docs` (design/product/security review references), and `.github` (CI/CodeQL/Dependabot).

Migration sequence: initial_platform establishes core records/transactions; evidence_integrity strengthens capture use/validation; contractor_tracking adds phone capabilities/reports; final_access_controls narrows grants/projections; station_operations adds work items/events; operations_delivery_integrity links indents to verified deliveries; paginated_work_history adds history cursor; mobile_field_operations adds client replay/context/vehicle lookup and updates effective commands; serialize_driver_link_lifecycle orders/revokes replacement links under locks. Hosted migration list matches these 9. Public RPC wrappers are command,dashboard,field,ops_command,ops_snapshot,tracking; private helpers include calibrate,check_evidence,member,distance_m and validate_shift_evidence. See [hosted summary](evidence/hosted-summary.json), including actual security-definer/search-path/execute metadata.

## Page and endpoint inventory

| URL | Source under `src/` | Access and observed behavior |
|---|---|---|
| `/` | app/page.tsx | Redirect entry; no standalone dashboard |
| `/login` | app/login/page.tsx; components/login.tsx | Sign-in, signup and recovery are modes on one page. Real auth login tested for both roles; signup/recovery UI captured without sending email |
| `/app` | app/app/page.tsx; components/workspace.tsx | Authenticated workspace, server dashboard RPC. Memberless branch currently calls join during GET rendering; security finding |
| `/offline` | app/offline/page.tsx; components/offline-terminal.tsx | Public shell plus encrypted device vault; station context requires current authenticated access. Prepared, locked and unlocked without a network in this run |
| `/auth/password` | app/auth/password/page.tsx | Password form captured without recovery session or changing credentials; completion unverified |
| `/gate/[token]` | app/gate/[token]/page.tsx | Driver bearer capability; invalid/expired state captured. No live driver session issued or GPS report sent |
| `/auth/callback` GET | app/auth/callback/route.ts | Confirmation/recovery code exchange; source reviewed, live email round trip unverified |
| `/api/dashboard` GET | app/api/dashboard/route.ts | Real role projection verified through authenticated browser requests |
| `/api/command` POST | app/api/command/route.ts | Same-origin, authenticated operation allowlist; generic unknown-valued p object delegates domain checks to SQL |
| `/api/operations` GET/POST | app/api/operations/route.ts | Work-board snapshot/history and create/comment/transition; one synthetic case created through UI and verified in DB |
| `/api/field` GET/POST | app/api/field/route.ts | Assigned-station context, vehicle lookup, offline sync. Offline context/unlock tested; complete posted replay only SQL suite |
| `/api/tracking` POST | app/api/tracking/route.ts | Issue/revoke/poll and bearer-link reports routed into SQL. Creation/revocation not exercised on existing records |
| `/api/documents/[kind]/[id]` GET | app/api/documents/[kind]/[id]/route.ts | Owner documents: claims, parchis, statements. Actual claim/statement PDFs returned 200 and rendered |
| `/api/evidence/[id]` GET | app/api/evidence/[id]/route.ts | Authorized evidence access, private signed storage; full real capture/unrelated-record matrix unverified in browser, SQL permissions tested |
| `/api/vehicle-pass/[id]` GET | app/api/vehicle-pass/[id]/route.ts | Owner-only printable credential. QR preview opened with QR/code masked; credential PDF not published in artifacts |

Metadata: `src/app/manifest.ts` → `/manifest.webmanifest`; `src/app/icon.svg` → `/icon.svg`; favicon. `not-found.tsx` and `error.tsx` supply failure surfaces. A deliberately nonexistent route was captured; throwing the application error boundary was not forced against production.

## Actual module inventory

| Module / state key | Owner | Munshi | Objective / source | Audit actions and limits |
|---|---|---|---|---|
| Overview / overview | Yes | Initial field home | workspace.tsx; operations-hero.tsx | Read Owner KPIs, map, review count; Mu three task shortcuts. All eight sizes |
| Deliveries / deliveries | Yes | Assigned station | delivery-board.tsx; workflows.tsx | Board, search, stage controls, creation, dispatched arrival form and approved decant form opened. No submitted delivery exists in snapshot: approval state not fabricated |
| Shift reconciliation / shifts | Yes | Assigned station | workspace.tsx; workflows.tsx | Register, close form, Owner review form. Current shift left open; review record left unchanged |
| Digital parchi / credit | Accounts, balance, payment, passes | Fill terminal | parchi-form.tsx; workflows.tsx | Account/create vehicle/payment forms; masked QR; malformed pass error; scanner opened. No real credit or payment posted |
| Station operations / operations | Four workflows | Handovers, indents, maintenance | station-operations.tsx | All role-visible subviews; create/detail dialogs. Cases hidden from Mu; indent creation Owner-only |
| Documents / documents | Yes | No navigation | document-centre.tsx | Search, type filter surface, actual PDF endpoints. Recent loaded data only, not full archive |
| Stock & prices / stock | Yes | No navigation | workspace.tsx; workflows.tsx | Tank capacity/stock, nozzle mappings, prices. No inventory adjustment or rate change |
| Settings / settings | Yes | No navigation | workspace.tsx; station-location.tsx | Location picker, station/tank/nozzle/price/invite/revoke forms. No real staff/equipment/location changes |

Station operation subviews counted separately for screenshots: discrepancy cases, fuel indents, maintenance, shift handovers. Owner therefore has 11 normal captured screens (8 modules, with operations expanded into 4). Mu has 7 (home, deliveries, shifts, parchi, handovers, indents, maintenance). Public captures: login, signup mode, recovery mode, password update, invalid driver link, not-found. Offline is an additional captured field surface.

Not separate current modules: Fleet, owned-truck hardware, dedicated reports route, customer portal, OCR console, banking allocation, equipment certification archive or notification inbox. Contractor map/tracking lives inside deliveries and overview. Notification bell is a pending-review queue. Workspace identity badge is not a switcher among independently owned tenants. Only one Design Lab station was available, so a real cross-station selection result was not exercised.

## Critical workflow sequences

| Workflow | Exact sequence and starting role | Expected / actual / verification |
|---|---|---|
| Auth | Public login → fill approved account privately → Sign in → `/app` → dashboard GET | Both roles authenticated; role and Design Lab name asserted. No session details retained |
| Arrival | Mu Deliveries → Start arrival audit on dispatched TKA-842 → inspect temperature/chamber readings/photo requirement | Correct arrival form, current status and no-unload instruction present. No submit; immutability/evidence tested in rolled-back SQL |
| Approval / decant | Owner Deliveries → approved TKA-843 → Confirm decant detail | Approved detail, calculation and separate decant confirmation present. No stock posting. Submitted-to-approved UI path unavailable in current seed |
| Shift | Mu Shift reconciliation → Close shift → inspect per-nozzle, tank, cash/POS and evidence controls | Form opens; originals preserved. Owner register → Review opens submitted reconciliation. No live close/review |
| Parchi | Mu Digital parchi → New parchi → manual malformed pass → Check vehicle → Scan vehicle fuel pass | Specific owner-issued-pass error rendered, scanner frame opens. No valid match/camera decoding or posting in this audit run; prior report is historical evidence only |
| Fuel pass | Owner parchi → Manage vehicles → QR | Credential preview exists; screenshots mask QR and code. Printed-pass physical acceptance unverified |
| Nonfinancial case | Owner operations → Discrepancy cases → New case → Title and Details → Create record | Before/after screenshots; POST 200; DB confirms case `8427a67e-f2a6-405c-b921-0ec478cfd1e2`, open, correct tenant/station, one immutable event. Title begins AUDIT ONLY. No financial action |
| Case transitions | Newly created audit-only case → investigating → required completion note → resolved | Both POSTs200. Separate DB query confirms resolved state and3 immutable events. No existing case changed; [transition evidence](evidence/case-transitions.json), [DB result](evidence/case-transitions-db.json) |
| Cross-role handover | Mu operations → New handover → audit-only briefing → select named Owner recipient → Create; Owner opens it → accepted with note | Creation/acceptance POSTs200. DB confirms Mu creator, intended Owner assignee, accepted state and2 events. No real shift or cash transferred; [Mu creation](evidence/handover-create.json), [Owner acknowledgement](evidence/handover-accept.json), [DB result](evidence/handover-db.json) |
| Offline | Signed-in Mu → `/offline` → choose assigned station → ephemeral separate passphrase → prepare → Lock → disable network → unlock → reconnect → Lock | Real context encrypted locally and recovered without network. Screens captured for prepare/unlocked/locked/offline. No draft saved or credit posted; no claim of background sync |
| Documents | Owner dashboard API → approved claim/account statement IDs → authorized document GET → decode and render | Two 200 application/pdf responses; one page each. No parchi record available. PDF-generated record QR is not vehicle authorization |

## State machines that implementation must preserve

Delivery: `dispatched → submitted → approved → decanted`; forward drag opens required checklist, it does not itself post stock. Arrival locks measured fields; approval records Owner decision; decant performs exactly one stock change. Shift: `open → review → verified`, original baseline and prices remain locked; missed deadline is explicit. Case: open → investigating → resolved with decision; no automatic deduction/theft judgement. Indent: requested → approved → dispatched → received, linked delivery/grade and decant required, no duplicate stock posting. Maintenance: scheduled → in_progress → completed with completion note. Handover: pending → accepted by named recipient, not sender; no transfer of cash/readings. Cancel branches and expected-status concurrency checks remain SQL authoritative.

All role restrictions must survive redesign even when navigation or component ownership changes. The public driver role is a scoped bearer capability, not an Owner/Munshi authenticated account. Offline drafts are pending evidence, never financial authorization.
