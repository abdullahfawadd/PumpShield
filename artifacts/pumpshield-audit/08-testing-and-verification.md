# Testing, verification and limits

Audit baseline: source `fa0c03254930ad9f41859eb2e189dd889f51f3ce`, live production URL, 9 November 2026. This document distinguishes static review, actual UI exercise, server results, DB fixtures and unverified paths. A visible success toast is never used as the sole evidence of a persisted transaction.

## Completed checks

| Check | Result / evidence | Interpretation |
|---|---|---|
| Source integrity | [168-file hash comparison](evidence/architecture-check.json): no original file changed | Only audit artifacts/ignored execution outputs created; no redesign implemented |
| Live deployment identity | [Vercel metadata](evidence/live-deployment.json):READY production Git deployment, main, exact fa0c032 commit, live alias confirmed | Read-only metadata inspection; source/deployment baseline matches. No release triggered; hosted policy/rollback drill still unverified |
| Installed dependencies / routes | [inventory](evidence/repository-inventory.json) | Actual installed versions, not package semver ranges or prior app assumptions |
| Next docs | Installed route, proxy and page file-convention guides read | Async route/page params and proxy conventions evaluated against installed16.4.5; no API rewrite during audit |
| TypeScript | [typecheck log](evidence/typecheck.log), no errors | Existing application plus included TS scope |
| ESLint | [clean-scope log](evidence/lint-clean-scope.log), no warnings/errors | Audit JS tools excluded; initial broad lint flagged unused variables in new audit tooling only |
| Unit/PDF/field tests | [clean-scope log](evidence/unit-tests-clean-scope.log):3 files,12 tests passed | Initial broad Vitest run discovered the ignored clean security clone and double-counted tests;24 is deliberately NOT reported as real suite coverage |
| Production build | [build log](evidence/build.log), successful | Map worker prebuild and Next routes generated. No deployment triggered |
| Production npm advisories | [npm audit JSON](evidence/dependency-audit.json):0 at audit time | Production dependencies only; not a security certification or all dev-dependency assessment |
| Core database suite | [database.sql result](evidence/database.sql.result.json), PASS | Fresh fixtures test tenant/role isolation, immutable audit, approval, duplicate decant, credit, stock/cash and revocation; transaction rolled back |
| Station operations SQL suite | [operations.sql result](evidence/operations.sql.result.json), PASS | State guards, note/recipient/linked-delivery rules and isolation; rolled back |
| Field/offline SQL suite | [field.sql result](evidence/field.sql.result.json), PASS | Idempotency, changed replay, original shift, evidence, credit and revocation; rolled back |
| Owner authentication | Approved private credentials → live `/app`; role/workspace asserted | Actual sign-in passed; no credential included in artifact |
| Mu authentication | Approved private credentials → live `/app`; assigned-station projection asserted | Actual sign-in passed; financial fields remain excluded by source/SQL suite |
| All normal navigation | Owner 11, Mu 7 screen states across8 viewports | Page/module visitation and rendered data, not proof every button submission passed |
| Owner dialogs |23 opened in first workflow stage; Add account, Add vehicle and QR added separately | Initial “New account” locator was wrong: actual label is Add account. Follow-up succeeded; not an app defect |
| Required validation | Empty dispatch → native invalid messages;0 `/api/command` posts | Prevented empty submit; no mutation |
| QR error / scanner | Malformed pass rejected; scanner frame opened | This run does not claim actual camera QR decoding or permission-denial response; scanner could remain waiting for permission |
| Offline prepare/lock/unlock | Actual encrypted vault prepared; locked and unlocked while network disabled; reconnected | Real local context recovery. No field draft saved, replayed or server-posted in this run |
| Synthetic case creation | Before/after capture, POST200, DB open case +1 event in correct Lab tenant/station | [UI response](evidence/safe-case.json), [independent DB check](evidence/safe-case-db.json). No financial or inventory side effect requested |
| Case lifecycle | Newly created audit-only case investigating→resolved, both POST200; DB final state +3 events | [UI transitions](evidence/case-transitions.json), [DB verification](evidence/case-transitions-db.json). Existing cases unchanged |
| Mu→Owner handover | Mu creates audit-only briefing addressed to Owner; named Owner accepts; both POST200, DB accepted +2 events | [creation](evidence/handover-create.json), [acceptance](evidence/handover-accept.json), [DB verification](evidence/handover-db.json). No actual duty, funds or stock transferred |
| PDF endpoints/render | Claim200, statement200; application/pdf;1 page each | [inspection metadata](evidence/document-inspection.json), [rendered samples](documents/). No seeded parchi record available |
| Dialog keyboard |22 Tabs remained within dialog; Escape closed | [keyboard.json](evidence/keyboard.json). Separate test found return focus on BODY; [focus-return](evidence/focus-return.json), actionable gap |
| URL state | Overview→Documents retains `/app`; refresh returns Overview | Actual observed loss of navigation context |
| HTTP boundary smoke | [protection-checks](evidence/protection-checks.json) | Anonymous protected access and wrong-Origin requests checked separately; exact statuses in evidence |
| Hosted DB metadata |9 migrations,20 RLS tables, read-only authenticated table grants, private5MB image bucket | Metadata only, not exhaustive row-by-row authorization proof |
| Formal source security |3 medium findings;90 fully reviewed files + targeted paths | Canonical scan complete with explicitly partial source coverage; no exploitation of existing data |
| Design token contrast |48/48 tested semantic pairs pass chosen thresholds | Reproducible calculations, not whole-screen conformance |
| Exploration prototype |36 theme/screen/width renders, no overflow/page errors, native dialog Escape works | Synthetic standalone design artifact, not deployed product |

## Actual screenshot matrix

Normal screens: Owner overview,deliveries,shifts,credit,documents,inventory,cases,indents,maintenance,handovers,settings; Mu home,deliveries,shifts,credit,handovers,indents,maintenance; public login,signup,recovery,password update,invalid driver,not-found. Each is captured at 1920×1080,1440×900,1366×768,430×932,390×844,360×800,320×640,768×1024. Offline preparation also has all 8; subsequent states have selected desktop/phone sizes. Additional modals/states are indexed individually in [screenshot-index.json](evidence/screenshot-index.json).

Final aggregation contains328 state/viewport rows and663 PNG files, including follow-up validation and safe cross-role workflows. The authoritative count is [audit-summary.json](evidence/audit-summary.json), regenerated after all stages. Do not hardcode a gallery count into future tests. Chrome DevTools device metrics and touch emulation were used, deviceScaleFactor2 on mobile/tablet,1 on desktop; screenshot pixel output uses CSS scale. Mobile UA stayed desktop Chrome. These are responsive/touch-emulated checks, not actual iOS Safari or Android-device acceptance. Full-page dimensions can reveal overflow beyond requested width.

All saved PNGs were decoded and checked for plausible dimensions/nonblank content. Comparison sheets were visually inspected by module, with closer examination of critical1440px,390px and320px screens/forms and representative tablet layouts. Individual manual inspection of every full-page image at all 8 sizes was not completed. Remaining images are evidence for the next review, not implicitly approved designs.

## Accessibility

Thirty axe screen/viewport checks: Owner 6 screens ×3 sizes, Mu 4 screens ×3 sizes. Seventeen checks have violations. Unique rules: color-contrast and scrollable-region-focusable;36 unique contrast selector strings and1 scroll-region selector in current summary. Selector count is an implementation aid, not number of people affected or complete WCAG failure count. [Owner raw](evidence/quality-owner.json), [Mu raw](evidence/quality-munshi.json), [summary](evidence/accessibility-summary.json).

Small touch targets were measured from DOM rectangles, but spacing exceptions and visibility/context require manual judgment. No screen-reader, voice-control, switch-control or200/400% zoom session was completed. Reduced-motion handling exists in source; media playback/pointer-motion acceptance on physical phones remains open. Focus trap and Escape worked in tested dialog; return focus failed separately. Map canvas accessibility needs a text alternative with location freshness, not only labelled zoom controls.

## Performance measurements

One sample per condition, same desktop Chrome context, HTTP cache disabled, no network throttle. Mobile sample uses390×844 and4× CPU slowdown. Waited for load plus1.8s. Service-worker/prefetch/cross-origin timing effects and existing browser context may affect transfer counts. These are observations, not field CWV or comparable independent cold-device benchmarks.

| Sample | TTFB | DOMContentLoaded | Load event | Resource count | Resource transfer / JS transfer |
|---|---:|---:|---:|---:|---:|
| Login desktop |87ms |898ms |2840ms |50 |800,670 /250,478 bytes |
| Authenticated app desktop |62ms |603ms |1231ms |30 |1,061,754 /652,258 bytes |
| Authenticated app mobile emulation,4× CPU |70ms |3801ms |3809ms |21 |593,811 /345,649 bytes |

Login FCP was1032ms in that sample. [Raw resource timing](evidence/performance.json) lists top transfer assets. The login loaded a130,878-byte desktop wall image and several motion clips; it has a measurable decorative-media cost. App JavaScript and shared CSS contribute significant transfers; root layout imports all five stylesheets. Map libraries are dynamically loaded, but no isolated first-map-interaction benchmark or pan/FPS measurement was completed. Different transfer totals between samples reflect loading/caching/lazy-resource conditions, not demonstrated optimization.

Do not claim LCP/CLS/INP pass or an overall Lighthouse score: those metrics were not collected with sufficient methodology here. Next stage should measure three independent cold runs per screen, CPU/network profiles, LCP/CLS, interaction traces and actual field-phone behavior. Set budgets only after the same repeatable measurement, preserving camera/map/offline capability.

## Unverified or constrained operations

Signup confirmation, recovery email delivery, password update completion, MFA, SMTP configuration, hosted backups/restore, notifications/SMS transport, multiple-station UI switching, actual printed QR scan on phone, valid vehicle-match UI in this run, actual camera/GPS capture, new driver link consent/sharing/reporting, map pin save, every map/fallback permission branch, shift close/review, arrival submit/approval/decant, credit fill/payment and account/user mutations were not committed against existing data. Normal forms and SQL fixtures provide partial evidence, not an end-to-end pass for those production workflows.

Complete offline draft capture→reload→reconnect→lost-response replay→DB verification is still an acceptance gate. So are all mobile scroll positions in long dialogs, every filtered/error/empty state, and physical touch/keyboard permission flows. No test of real financial records, real delivery stock or client hardware was conducted.

## Reproduction and retention

Audit helpers under `tools/` use the installed/cached Playwright CLI and approved ignored credentials without printing them. They are audit-specific and not part of app CI. Do not run creation stages repeatedly without checking for their synthetic record first. Never publish the ignored credential file, session storage, browser profiles, `.env.local`, raw bearer links or vehicle QR values. Images of QR credentials and raw tracking fields are masked. Keep public reports limited to labelled synthetic data.

For a source-only quality rerun while the ignored security clone exists, exclude `output/**` and `artifacts/**` from Vitest discovery and `artifacts/**` from ESLint. This avoids auditing tool files as production code or counting duplicated tests. Future CI should use explicit test include patterns rather than relying on ignored directory names.

## Installed dependency inventory

`json
{
  "@phosphor-icons/react": "2.1.10",
  "@radix-ui/react-dialog": "1.3.1",
  "@radix-ui/react-slot": "1.5.0",
  "@supabase/ssr": "0.12.7",
  "@supabase/supabase-js": "2.119.0",
  "@zxing/browser": "0.2.1",
  "class-variance-authority": "0.7.1",
  "clsx": "2.1.1",
  "glisse": "0.5.0",
  "leaflet": "1.9.4",
  "maplibre-gl": "6.17.0",
  "next": "16.4.5",
  "pdf-lib": "1.17.1",
  "qrcode": "1.5.4",
  "react": "19.3.1",
  "react-dom": "19.3.1",
  "sonner": "2.0.8",
  "tailwind-merge": "3.7.0",
  "zod": "4.6.7",
  "@tailwindcss/postcss": "4.3.4",
  "@types/leaflet": "1.9.21",
  "@types/node": "24.19.2",
  "@types/qrcode": "1.5.6",
  "@types/react": "19.3.0",
  "@types/react-dom": "19.3.0",
  "eslint": "9.39.5",
  "eslint-config-next": "16.4.5",
  "fake-indexeddb": "6.2.8",
  "prettier": "3.6.2",
  "supabase": "2.122.1",
  "tailwindcss": "4.3.4",
  "typescript": "5.9.3",
  "vitest": "4.1.12"
}
`
