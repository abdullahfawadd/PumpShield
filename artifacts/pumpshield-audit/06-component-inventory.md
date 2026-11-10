# Component coverage and replacement plan

Classification is based on actual TSX/CSS, role captures and interactions. “Missing” means the current product would benefit from that behavior for an existing task, not that every component library widget should be added. Existing good behavior is retained even when its visual treatment changes.

| Component / capability | Classification | Current implementation / evidence | Required disposition and reason | Priority |
|---|---|---|---|---|
| App shell / sidebar / header | Existing, needs redesign | workspace.tsx; large header/sidebar decoration; 320px expansion | Compact layout; stable station and navigation context; min-width0; remove sidebar slogan | P1 |
| Mobile navigation | Existing, inconsistent | Glisse TabBar + CSS variants; menu + dock | One visible implementation with labels, safe-area/content clearance and keyboard/screen-reader semantics | P1 |
| Workspace identity | Existing, good as identity | Sidebar badge, one membership | Retain; don't make it look like a multi-workspace switcher until that model exists | P2 |
| Station selector | Existing, needs focused verification | Native Active station select; one seed station | Show full/accessible name and bind data/filter state; test multiple fixture stations | P1 |
| Page header/breadcrumb | Existing, verbose | Local tab title plus slogan/eyebrow/subtitle | One page title, contextual subline and one primary action | P1 |
| URL-backed navigation | Missing | useState Tab; reload loses selected module | Validated view/station/record/filter query or nested route adapter | P1 |
| Buttons / icon buttons | Existing, inconsistent | ui/button.tsx, raw buttons, Glisse Button | Semantic primary/secondary/quiet/danger/loading states;44–48px targets; accessible icon labels | P1 |
| Text / numeric inputs | Existing, needs redesign | forms.tsx and raw labels/inputs | Unit-aware decimal entry, inputmode, untruncated native controls; explicit min/max/error descriptions | P1 |
| Search / filters | Existing, inconsistent | Delivery/doc/operations queries, mostly loaded arrays | Shared toolbar, clear-all, count/scope; distinguish no results from no data | P2 |
| Selects/dropdowns | Existing, inconsistent | Native selects plus Glisse controls | Keep native where useful; fix narrow two-column forms; do not add custom combobox without search needs | P1 |
| Tabs / segments | Existing, mixed semantics | Operations tabs buttons; delivery count spans look tab-like | Real buttons for selectable states; status-only counts must not imply clickability | P2 |
| Menus/popovers/tooltips | Limited, not universally required | Header actions, native controls | Add contextual menu only for real secondary actions; tooltips never the sole label or safety instruction | P2 |
| KPI summary | Existing, needs redesign | Stat component; major quantities sometimes truncated | Compact, tabular, scoped and timestamped; no decorative invented trends | P1 |
| Data tables | Existing, inconsistent | Shift/price/parchi/people tables | Shared header, right-aligned numbers, accessible scroll or mobile cards, row identity and action | P1 |
| Responsive operational lists | Missing as consistent pattern | Desktop tables/boards reused on phone | Shift/account/delivery/work-item rows purpose-built for narrow screens | P1 |
| Delivery Kanban | Existing, needs mobile alternative | delivery-board.tsx; four native draggable columns | Keep guarded forward checklist; add view choice and keyboard/button alternatives; phone list default | P1 |
| Work-item Kanban | Existing, good guards, needs layout | station-operations.tsx | Compact lanes desktop, status list phone; preserve expected-status concurrency and role rules | P1 |
| Delivery card | Existing, needs redesign | Large volume/card, repeated route/footer copy | Vehicle/ref/stage/next step + relevant time; show unexplained amount only when authorized | P1 |
| Status badges | Existing, contrast failures | globals/editorial/operations/field CSS | Central semantic icon+label+tested colors; common domain-to-label mapper | P1 |
| Timelines/activity history | Existing, inconsistent labels | work_item_events pagination; dashboard activity | Preserve immutable events; human labels, actor/time, real linked context | P2 |
| Charts | Limited existing, avoid invented needs | Tank cylinder, capacity/brief graphics | Recorded stock bar and explicit capacity/freshness; no fake sales sparkline | P2 |
| Pagination / historic queries | Partial | Work history100 cursor; boards500; dashboard200 | Visible record scope, cursor controls; server-backed history/export before all-time claims | P2 |
| Date range | Missing for full reports, not all pages | No complete archive filter | Add with real authorized query, not cosmetic client filter over200 records | P2 |
| Export controls | Existing, misleading scope risk | workspace export handler; report routes | Kind/scope-aware action names, documented loaded/full distinction | P1 |
| Multi-step form / stepper | Partial | Parchi has3 steps; delivery/shift long forms | Reuse progress/evidence completion for lengthy receiving/closure; no needless wizard for a two-field payment | P1 |
| Audit checklist | Implicit in required fields | Arrival and close forms/evidence | Summarize required readings/photos; show missing items before final lock | P1 |
| Camera capture | Existing, valuable | camera.tsx / evidence-capture.ts | Keep real capture, retry and stream cleanup; test denied/no-device/rear camera and stale evidence | P1 |
| General file upload | Only calibration CSV; evidence intentionally capture-based | forms/workflows, private bucket | Do not replace live evidence with arbitrary uploads unless operational requirements change | Preserve |
| GPS / permissions | Existing | field-map/location-picker/camera/tracking | Explicit permission/freshness/accuracy and fallback; no false background guarantee | P1 |
| Approval/review panel | Existing, needs hierarchy | workflows.tsx | Evidence, arithmetic and consequences adjacent; preserve immutable submitted fields | P1 |
| Confirmations | Inconsistent | Decant/revoke modal; direct vehicle disable | Standard danger confirmation and explicit record identity; distinguish approve vs decant | P1 |
| Transaction summary | Partial | Claim arithmetic and account/payment forms | Persistent units, locked rate, source record and clear “record received payment” consent | P1 |
| Evidence viewer | Basic links/previews | Signed evidence route | Focused photo viewer with capture provenance/age and failure state; no untrusted authenticity claim | P2 |
| Loading skeletons | Inconsistent/limited | Busy text and toasts; no uniform module shell | Shared bounded skeleton for actual pending fetches; preserve existing records on refresh failure | P2 |
| Empty states | Existing, often verbose | Empty component and board lane messages | One sentence + relevant action; no multi-paragraph marketing | P2 |
| Errors / retry | Existing, uneven | Form alerts/toasts, field queue review | Persistent field/API error, retry without losing inputs; explicit last-good-data state | P1 |
| Offline/connection indicators | Existing, useful | Header Connected; offline queue | Separate network, authenticated server reachability and unsent drafts; don't claim server healthy from navigator.onLine alone | P1 |
| Permission-denied/unauthorized | Existing API guards; uneven UX | RLS/routes/driver invalid state | Safe recovery action, no hidden button-only security; revoked offline session stays locked | P1 |
| Stale-data state | Existing for GPS, missing generally | Last report/status; no general last refresh | Add fetchedAt/server time and stale banner where retained data remains visible | P2 |
| Success feedback | Existing | Sonner and queue state | Announce meaningful saved state, record ID and next action; verify server-backed results | P2 |
| Fuel quantities/units | Existing, inconsistent scale | number() plus appended L / rates | Quantity value/unit component; distinguish litres, mm,°C,PKR,PKR/L; exact form decimals/domain rounding | P1 |
| Tank capacity | Existing, needs visual simplification | Purple cylinder and stock labels | Accessible meter/bar + exact recorded stock/capacity/ullage, last verified timestamp | P2 |
| Nozzle summaries | Existing | Settings mapping and shift forms | Reusable baseline/closing/test/dispensed breakdown with evidence status | P1 |
| Vehicle / QR pass | Existing, valuable | qrcode/ZXing/workflows/parchi | Keep original credential scheme, matched identity and private print; never put credential in screenshots or logs | P1 |
| Map card | Existing, needs prioritization | MapLibre with Leaflet fallback and local worker | Bounded height, selected record, persistent freshness, loading/fallback/error and accessible summary | P1 |
| Shift status / reconciliation | Existing | Locked baseline, submit/review SQL | Open/deadline/late/review/verified labels; concise variance table with units and meaning | P1 |
| Inventory reserve warnings | Not configured | Capacity/stock exist, thresholds not modeled | Optional future feature only after agreed per-tank reserves and trustworthy consumption history | Later |
| Notification inbox / automatic reminders | Not configured | Review queue and local toasts only | Do not imply SMS/WhatsApp delivery; add only with monitored provider, consent and delivery outcome | Later |

## Proposed domain component boundaries

Preserve existing behavior; names are implementation suggestions, not a mandate to add dozens of abstractions. `WorkspaceShell`, `StationContextBar`, `PageHeader`, `ActionQueue`, `Quantity`, `StatusBadge`, `AsyncBoundary`, `DataToolbar`, `OperationalTable`/mobile row, `EvidenceCaptureField`, `EvidenceViewer`, `ConfirmActionDialog`, `MapPanel`, `DeliveryStageSummary`, `ReconciliationSummary` and `DraftQueueItem` cover repeated real needs. Specialized forms remain in their domain module. Shared presentation components must not own SQL posting rules.

Do not build a universal workflow engine, universal JSON form renderer, empty notification center, custom icon pack, generic chart catalog or a second parallel mobile application. Existing Radix, Phosphor, Zod and Next primitives are enough. An `AlertDialog`-style component is needed for consequential confirmations; a tooltip is not a substitute.

## Replacement order

1. Security invariants and async session lifecycle; create regression tests first.
2. Semantic tokens, type/quantity/status components, inputs/buttons/dialog focus and narrow-screen layout primitives.
3. Shell and route/view adapter, concise headers, role-appropriate navigation.
4. Delivery list/board/detail and arrival/approval/decant hierarchy; then shift reconciliation.
5. Parchi/vehicle/account flow and offline forms, including real-device evidence acceptance.
6. Existing operations, document register/PDF presentation, stock/settings.
7. Server-backed historic reporting and only client-approved domain extensions.

There is no need to change the underlying component technology simply to obtain a fashionable appearance. Consolidation and task clarity have greater immediate value than another UI dependency.
