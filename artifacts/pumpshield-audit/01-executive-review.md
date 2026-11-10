# PumpShield — evidence-based product review

Audit date: 9 November 2026. Repository and clean security target: `fa0c03254930ad9f41859eb2e189dd889f51f3ce`. Live application: https://pumpshield-seven.vercel.app. This is an audit and implementation brief, not a redesigned release. No application source, schema, deployment, financial posting or existing station record was changed. Two clearly labelled nonfinancial records were created in Design Lab: an Owner case progressed through investigation/resolution and a Mu handover acknowledged by its named Owner recipient. Both were verified independently in Postgres with immutable history. All SQL regression fixtures were rolled back.

## Assessment

PumpShield has substantive operational behavior: tenant-scoped memberships, immutable arrival audits, approval-before-decant, transactional credit checks, calibrated stock calculations, vehicle fuel passes, guarded work boards and encrypted offline drafts. Replacing it with a generic attractive dashboard would lose important product value. The next stage should simplify how users reach those controls and strengthen three concrete security weaknesses before a client rollout.

The main visual weakness is information priority. Large slogans, repeated helper sections, decorative tankers, pastel surfaces and small muted labels make a sparse operational dataset occupy several screens. On the Munshi parchi screen, the actual fill workflow competes with three repeated navigation cards and two equivalent creation actions. On 320px screens, layout width expands beyond the emulated device width; source-level responsive rules and layout measurements corroborate the clipping visible in the captures.

## Evidence and coverage

- Six page entry points and nine HTTP route handlers inventoried; metadata and error surfaces are listed separately. `/app` contains eight Owner modules and four Munshi navigation modules. They are local component state, not eight URL routes.
- Eleven Owner normal screen states, seven Munshi normal screen states and six public/error/auth states captured at **all eight** requested viewports. Additional forms, dialogs, validation, privacy, scanner and offline states are captured at documented subsets of sizes.
- Open [the screenshot gallery](gallery.html), [capture manifest](evidence/screenshot-index.json), [exact final counts](evidence/audit-summary.json) and [comparison sheets](contact-sheets/). Counts distinguish screen/state/viewport combinations from PNG files; each normal capture produces viewport and full-page images.
- Both approved temporary accounts authenticated into `PumpShield - Design Lab`; credentials were loaded privately and never added to reports or commits. No real customer workspace was opened for mutation.
- Production build, scoped ESLint, TypeScript and **12 unit tests in three files** passed. All three hosted SQL suites passed with transaction rollback. `npm audit --omit=dev` reported zero known production dependency vulnerabilities at audit time. These results do not prove absence of security defects.
- Automated accessibility checks cover 30 role/screen/viewport combinations, rather than every possible dialog/state. Actual findings and raw selectors are retained. Physical phones, assistive technology and field usability sessions were not available.
- Captures were structurally validated and representative comparison sheets inspected. Detailed visual review concentrated on 1440px desktop, 390px/320px mobile, tablet and critical forms; the report does **not** claim individual manual inspection of every full-page image at every resolution.

## Priorities

| Priority | Finding | Required next step |
|---|---|---|
| P1 | SQL accepts alternate spellings of non-finite numeric strings | Enforce finite values after numeric parsing and at table boundaries; test direct RPC as well as HTTP |
| P1 | Pending offline refresh/save/load can undo Lock | Invalidate all async continuations using a session generation; test delayed completion after lock/logout |
| P1 | Email-only invitation is auto-accepted during `/app` rendering | Require explicit recipient consent for a selected invitation; preserve staff revocation and existing-member isolation |
| P1 | 320px layout viewport expands to 339–370px on Owner screens | Fix min-content constraints, header composition, tables and form grids; compare document width with requested device width |
| P1 | Actual contrast failures in delivery, shift, credit and inventory labels | Replace scattered colors with tested semantic tokens; re-run both roles across normal and modal states |
| P1 | Mobile work is below repeated introductions and cards | Compact header and first-screen task content; remove duplication; use mobile lists and staged forms |
| P2 | `/app` local tabs lose context on refresh/back/navigation | Add validated URL-backed view/station/filter/record state without weakening SQL permissions |
| P2 | Long delivery details lead with tracking above arrival/decant actions | Surface current required step first; collapse secondary map and history on phones |
| P2 | Reports and exports are bounded by loaded dashboard data | Clearly show scope; build separately authorized, paginated historical queries before claiming complete reporting |
| P2 | Large components and layered CSS hinder consistency | Decompose by existing domain workflow, adopt semantic primitives, preserve transaction boundaries |

Security severities are **three medium findings** in the canonical source scan; P1 above is product remediation order, not a claim of critical remote exploitation. The scan covered 90 complete source files plus targeted large UI paths and is explicitly partial.

## Recommended direction

Choose **Petroleum Ledger**: warm neutral `#F5F3EE`, white surfaces, petroleum `#174C45`, charcoal `#202724`, readable secondary text `#58645F`. Use compact 28px page titles, numeric alignment, restrained surfaces and clear exception colors. Keep the dark, motion-rich login composition as an optional desktop brand moment, but reduce its mobile decorative area and transfer none of its visual density into field workflows.

Compare the alternatives in [the interactive canvas](design-exploration.html). It is a standalone artifact, not a production interface. The graphite alternative is suited to indoor monitoring; the ivory/forest journal alternative prioritizes document reading. Forty-eight semantic contrast pair calculations across all three pass their chosen AA/non-text thresholds; this does not certify the complete future UI.

## Existing reports reconciled with current evidence

`docs/mobile-field-review-2026-11-09.md` correctly describes QR pass guidance, Phosphor icons, station pin selection, browser GPS limits, offline encryption and source-controlled MapLibre workers. They are present and must be preserved. Its zero-violation statement describes a narrower historical check and cannot be generalized: current expanded checks identify real failing status/metadata colors. Its previous partial scan with no findings is superseded for the examined source by this scan's three validated findings. `docs/design-review-2026-11-08.md` and `docs/product-roadmap.md` correctly distinguish implemented operations from future integrations. New requests must not relabel unconfigured OCR, automatic WhatsApp delivery, hardware telemetry or tax invoicing as finished features.

## Limits before client acceptance

No real credit fills, money receipts, inventory posting, approval/decant transition, shift closure, user revocation, station relocation or driver bearer-link issuance were submitted against existing records. Their forms were inspected and core invariants exercised with separate rolled-back SQL fixtures. No physical QR/camera/GPS test, complete offline draft capture/replay in this run, SMTP message delivery, real-device install, screen-reader session, restore drill, production MFA enrollment or external-provider SLA was verified. Public competitor interfaces were studied through documentation and screenshots; no private competitor account was accessed. Accelerator cohorts are claimed only when supported by primary sources.

The implementation-ready handoff is [IMPLEMENTATION_MEGA_PROMPT.md](IMPLEMENTATION_MEGA_PROMPT.md). Supporting reports: [routes](02-route-and-workflow-matrix.md), [visual/copy](03-visual-audit.md), [research](04-competitive-research.md), [directions](05-design-directions-and-colors.md), [components](06-component-inventory.md), [architecture/security](07-architecture-and-security.md), [verification](08-testing-and-verification.md).
