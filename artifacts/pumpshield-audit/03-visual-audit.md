# Visual, interaction and copy audit

Grounding: [actual deployed screenshots](gallery.html), [measured layout expansion](evidence/layout-expansion.json), [Owner axe results](evidence/quality-owner.json), [Munshi axe results](evidence/quality-munshi.json). All images are synthetic Design Lab data. Concept images belong in `concepts/`, not `screenshots/`.

## What the captures establish

The final capture count is recorded in evidence/audit-summary.json; the gallery contains more than300 state/viewport combinations and600 PNG evidence files, including seven additional desktop dialog-end images. Normal screens span all eight requested sizes. Form states mostly cover 1440×900, 390×844 and 320×640; some interaction states use only the desktop/390 pair. Full-page screenshots do not reveal the hidden contents of an internally scrolling dialog. Some modal content is represented by extra end captures; complete mobile scroll-through coverage remains a gap.

The normal desktop page is mostly aligned and readable at 1440px; this is not a broken blank application. The major issue is hierarchy and scaling. The Owner delivery board starts below two headline layers and several metadata bands. On a 390px Mu parchi screen the first 800px are largely navigation/greeting content. On 320px, document and layout widths exceed the intended device width; checking `scrollWidth === innerWidth` alone incorrectly misses mobile visual-viewport expansion.

| Finding | Evidence | Interpretation / exact change |
|---|---|---|
| V01 · Large multi-layer page introductions | owner/deliveries desktop1440 and mobile390 normal; owner/documents normal | Replace slogan, subtitle, uppercase eyebrow and second section slogan with one 24–28px task title and one compact context row. Retain required instructions beside the relevant action |
| V02 · Mu task shortcuts repeat on every field module | munshi/credit/mobile390 normal-full | On home keep task shortcuts; on dedicated parchi/shift/delivery pages remove the repeated greeting and three task cards. Keep one creation action |
| V03 · Primary work below first phone viewport | munshi/offline prepare/unlocked; owner/deliveries normal | Collapse install help after preparation; reduce decorative header; put current record, next action and connection state first. Safety explanation remains available before final submission |
| V04 · 320px viewport expansion | evidence/layout-expansion.json; owner/inventory/mobile320 normal-full | Owner normal layout widths: overview353, deliveries355, shifts370, credit340, documents362, inventory339, operations358, settings348 against intended320. Set min-width:0 on grid/flex children, wrap header controls, stack form fields and create mobile table/list alternatives |
| V05 · Tiny, low-contrast stage and status text | quality-owner.json; quality-munshi.json | Examples: #6F8554 on #EAF1DF 3.51:1; #748462 on #F4F4F1 3.65:1; shift open #8565AA on #EEE8F7 3.94:1; verified #527969 on #E9F1ED 4.25:1. These 11–12px labels require 4.5:1. Use semantic foreground/background pairs, not opacity |
| V06 · Task boards do not become a task list on phones | owner/deliveries and owner/cases mobile390 normal | Desktop board can stay. Phone default should be stage filters + vertically ordered cards, with counts and next action. Optional board is a secondary view. No touch-only drag dependency |
| V07 · Form fields compress unevenly | owner/cases/mobile390 create-viewport; owner/indents create | Assigned-to consumes most of two-column grid; Priority displays truncated “No” for Normal. Stack below640px; minmax(0,1fr) on desktop groups; native text must remain legible |
| V08 · Maps precede necessary audit/decant work | owner/deliveries arrival-audit/approved-decant mobile | Current detail first shows identity and a tall tracking block. Put current verification step ahead of the secondary map; collapse tracking/history. Keep last report time and stale state visible |
| V09 · Stock graphics use unexplained purple emphasis | owner/inventory mobile320 full | Quantity, capacity and last verified time matter more than a large cylinder. Use compact accessible bars, tabular units and freshness labels. Do not imply recorded stock is a live sensor reading |
| V10 · Corporate totals can truncate | owner/credit desktop normal; mobile320 | Amounts need tabular numerals, explicit PKR and adequate minimum widths; avoid ellipsizing financial values. Prefer compact account rows with balance, limit and utilization |
| V11 · Decorative UI competes with actions | owner/overview normal, sidebar note | Reduce/remove large tanker hero and “Built on evidence” sidebar panel. Keep delivery identity as a small operational summary. Glass is limited to optional navigation, not every control |
| V12 · Bounded reports look like an archive | owner/documents normal; source DocumentCentre | Show “Recent records” scope and result count; date/type filters require server-backed complete search before promising all documents. Distinguish document generation date from source record date |
| V13 · 404 copy asserts an unverified cause | public/not-found | “This page has moved” is not established. Use “Page not found”, with safe workspace/sign-in action |
| V14 · Credential action is visually adjacent to dangerous disable | owner/credit manage-vehicles; workflows VehicleCard | Make pass preview/copy/print explicit. Revoke/disable requires a separate confirmation explaining effect and affected vehicle; no accidental direct action |
| V15 · Dialog focus is not returned to the initiating action | evidence/focus-return.json | New delivery opens a focused button; Escape closes it but focus ends on BODY, not New delivery. Preserve a trigger ref and restore focus explicitly or use the Radix Trigger composition |
| V16 · Replacement glyph in actor/time history | owner/handovers/mobile390 after-accept and owner/cases after-resolved | A visible replacement diamond appears between actor and timestamp. Correct the source separator/encoding and add a rendering check for U+FFFD in operational labels |

## Page-by-page task review

The following uses Nielsen visibility/error prevention/recognition, Gestalt grouping, Fitts target size and progressive disclosure. It is expert inspection, not measured staff task success.

| Screen | Main objective / immediate clarity | Primary action / information organization | Competing, verbose or duplicate content | Missing/inappropriate components | Faster workflow / mobile-specific need / likely error |
|---|---|---|---|---|---|
| Login | Authenticate; form recognizable | Form present but artwork first on phones | Three-line slogan plus two-line pitch and third-party tile wall | Short recovery flow summary; restrained identity | Short art strip or hide decorative media on short screens; keep labels and password manager support; no clipped CTA, allow zoom/keyboard scroll |
| Signup/recovery | Confirm identity or recover account | Mode heading/button changes correctly | Shared marketing dominates single-field recovery | Explicit sent/error/expiry states need real email validation | Keep consistent mode navigation and return-to-sign-in; no account enumeration |
| Overview | Find what needs attention | Current tanker/brief precedes lower operational summaries | Hero truck and “one clear picture” consume space | Timestamped action queue and stock freshness | Review queue first, compact stock second, optional map; no invented consumption forecast |
| Deliveries | Find a delivery and perform next stage | New delivery clear; second board header repeats title | Empty lanes occupy large areas | Phone list, list/board choice, stage counts with true interactive semantics | Open directly to current required stage. Filter state and selected delivery URL-backed; drag never skips evidence |
| Arrival audit | Record measured temperature/dips/photo | Inputs exist after tracking section | Generic modal description | Stepper, chamber progress, saved/draft provenance, persistent summary | One chamber group per section; explicit units and validated chart mapping; no unload until approval |
| Approval/decant | Evaluate evidence/math, then approve/unload | Distinct state guards exist | Long tracking before arithmetic | Split invoice/measured/thermal/unexplained summary, evidence review controls | Owner decision and decant confirmation remain separate; never label discrepancy as theft |
| Shifts | Close accurately / Owner review variance | Register and close/review actions present | Page slogan and repeated Mu shortcuts | Phone reconciliation rows; keyboard-accessible scroll region; per-field evidence completion | Group nozzle readings by source tank; numerical change summary before irreversible submit |
| Parchi | Scan issued vehicle pass and record allowed fill | Three-step parchi form already exists | Home cards and duplicate new-parchi buttons; long Owner setup instructions inside field form | Strong matched vehicle summary, clearer offline pending state | Short instruction “Scan the vehicle fuel pass”; expandable “Which QR?” retains distinction from payment/receipt QR; no manual price entry |
| Accounts/vehicles | Control limit, review balance and issue pass | Account cards and Manage vehicles work | Large balance cards waste comparative space | Searchable account register, confirmation for credential disable | Read balance/limit/available together; mobile detail drawer, protected pass actions; no auto-allocation invented |
| Cases | Investigate discrepancy and record decision | Guarded workflow clear | Overall operations slogan plus module explanation | Source-evidence preview/link, mobile list and due/assignee filter | One contextual next action; preserve expected-status guard and decision requirement |
| Indents | Request and track fuel purchase | Lifecycle present | Empty board lanes dominate sparse data | Link delivery by matching grade/status; meaningful no-match explanation | Phone requested/approved/dispatched list; receiving requires verified decant, never second stock posting |
| Maintenance | Assign service and record completion | Work form fits domain | Generic “next action” not task-specific | Equipment picker rather than only free-text reference is future-scoped | Clear due/overdue, priority, completion note; avoid pretending certification upload/reminders exist |
| Handovers | Brief incoming named worker and acknowledge | Recipient-restricted acceptance is valuable | Home-style instructions repeat | Pending-for-me section with distinct acknowledgement | Read briefing then accept; sender cannot accept; no implied cash transfer |
| Documents | Retrieve a saved operational document | Search/type selector and PDF links present | Two headlines repeat document purpose | Date scope, kind-specific identifier, actual loading/error states | Mobile rows show kind/ref/date + Open; not entire generic dashboard list |
| Stock/prices | Check recorded stock and effective rates | Numerical stock present | Large purple vessels, narrative panel | Reserve threshold/freshness components only when configured; accessible price table | Compact tank row with unit and last verification; scheduled price changes stay Owner-controlled |
| Settings | Set location/equipment/access | Setup actions grouped | Marketing headings and guarantee-like security text | Setup status, searchable people, controlled danger actions | Split Location/Equipment/People sections; phone full-width fields; confirmation before financial equipment changes |
| Offline | Prepare/unlock device; capture pending drafts | Encryption and connection states exist | Repeated install instructions and tall hero displace work | Prominent draft queue state, age/shift binding, race-safe lock feedback | Prepare once; short locked screen; draft form first while unlocked; never claim closed-browser syncing |
| Driver link | Consent to/report own position | Invalid-state feedback visible | Consent paragraph shown before invalidity can confuse | Distinct expired/revoked/not-yet-consented view | Validate capability before showing start action; battery/open-page caveat remains; no inferred route/ETA |

## Copy audit

| Current content | Problem | Proposed replacement/removal | Reason |
|---|---|---|---|
| A clearer view of your station. | Slogan where page identity should be | Station overview | Recognition and direct task naming |
| Every delivery, verified. | Implies all records already verified | Deliveries | Dispatched and pending records are not verified |
| Keep every arrival moving. | Duplicate board heading | Remove; keep stage counts | Saves vertical space |
| Close the shift. Open the facts. | Marketing-like task title | Shifts & reconciliation | Staff vocabulary |
| Credit, without the paper trail. | Ambiguous grouping of accounts and fill | Corporate credit (Owner); Digital parchi (Mu) | Role-appropriate objective |
| Know what’s in the ground. | Can imply live stock measurement | Recorded stock & prices | Accurate provenance |
| Make this workspace yours. | Setup slogan | Station settings | Clear destination |
| Keep the station moving. | Duplicates operations navigation | Station work | Short umbrella label |
| A record you can return to. / Documents, in one place. | Repeated meaning | Documents + scoped result count | Results first |
| Built on evidence. A little more clarity. A lot more confidence. | Sidebar filler | Remove panel | Frees navigation space |
| Ready when you are, Adeel. | Repeated on every Mu module | Keep short greeting only on field home | Avoid repeated onboarding |
| Capture the reading. Submit the evidence. We’ll take it from there. | Vague and repeated | Remove from dedicated tasks | Actual step and requirements communicate work |
| Real records. Clear accountability. | Generic dialog description | Remove, or specific one-line consequence | Does not help completion |
| Complete the details below. | Default placeholder | Task-specific instruction or no description when redundant | Screen-reader signal quality |
| A new station. A clearer picture. | Verbose creation title | Add station | Familiar action |
| A paperless, accountable fill | Non-operational heading | New digital parchi | Clear transaction type |
| Start with a locked baseline | Conceptual opening title | Open shift | Keep baseline explanation beside review |
| Close your shift with confidence | Unnecessary assurance | Close shift | Irreversible consequences are more useful |
| Give your Munshi the right access | Wordy | Authorize Munshi | Preserve assigned station/role fields |
| Your workspace, clearly separated. | Security reassurance in setup content | Move to short security/help documentation | Preserve factual permissions disclosure, avoid guarantees |
| The server checks the vehicle’s fuel grade… Prices and balances are never entered here. | Long repeated paragraph | “Limits and price are verified when submitted.” + expandable details | Keep no-offline-approval and current-limit checks explicit |
| This page has moved. | Incorrect assumed cause | Page not found | Honest error message |
| Operation names with underscores replaced and an8-character subject ID (`workspace.tsx` recent activity) | Command vocabulary and UUID fragment are weaker than a named record | Human event label + vehicle/shift/account reference | Meaningful operational history without exposing extra private fields |
| Synthetic records… No real deliveries, funds, or location signals. | Essential disclosure | Retain, compact but persistent | Prevents synthetic values being mistaken for real business data |
| Do not unload before owner approval | Essential safety/verification | Retain next to submit/decant actions | Cannot be sacrificed for visual brevity |
| Camera capture … not an automatic guarantee of authenticity | Essential limitation | Retain in help/evidence review | Browser evidence is not hardware attestation |
| Not a tax invoice; discrepancy does not establish theft | Essential financial/legal distinction | Retain in PDF and claims review | Current output is an operational claim, not a statutory invoice |
| Separate offline passphrase; unsynced drafts cannot be recovered | Essential device-security instruction | Retain at prepare and storage reset | Avoids irreversible data loss |

## Documents

Actual [claim PDF](documents/claim.pdf) and [statement PDF](documents/statement.pdf) returned 200 and were rendered and inspected. Claim arithmetic is legible: invoice40,000L − measured39,600L − thermal276L = unexplained124L, at locked PKR300/L → PKR37,200. The sample explicitly says no evidence is attached; that is a synthetic record limitation, not proof that production accepts missing required evidence. Statement displays a synthetic opening balance and no recorded ledger transactions and correctly discloses this. Neither is a tax invoice.

The one-page samples have no observed text collision. Improve print economy: replace the 106pt dark masthead with a compact identity block, keep legal/synthetic text readable, separate source record time from generation time, align quantities/currency, and use repeated headers/totals for multi-page statements. The current ASCII-normalization function replaces non-Latin characters; Urdu/company names need embedded licensed Unicode fonts and real script-shaping tests before promising multilingual reports. A generated record-reference QR is not an authenticity signature or public authorization. No vehicle-pass credential is included in the public audit PDFs.

## Accessibility interpretation

Automated results: 17/30 examined screen/viewport combinations have violations; unique rules are color-contrast and scrollable-region-focusable. These are repeated state/selector findings, not 17 independent vulnerabilities. A scrollable price table needs keyboard access without trapping the page. Actual focus, keyboard order and screen reader announcements require task-based manual validation; Radix primitives alone do not establish conformance. Existing labels, skip link, reduced-motion handling and evidence status guards should remain. Target 44–48px field actions; WCAG2.2's minimum24px target criterion has spacing exceptions, so the raw small-target list is a triage aid, not an automatic failure count.

Primary frameworks: [Nielsen heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility), [WCAG2.2](https://www.w3.org/TR/WCAG22/). Heuristic assessments above are the auditor's application of these principles to PumpShield, not statements that these sources evaluated PumpShield.
