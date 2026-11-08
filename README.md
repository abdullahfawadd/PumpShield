# PumpShield PK

Fuel-station operations built with Next.js 16, React 19, TypeScript, Tailwind 4, shadcn-style Radix components, and Supabase Auth/Postgres/Storage.

## Run locally

Use Node.js 24. Copy `.env.example` to `.env.local`, set the Supabase URL and publishable key, then:

```powershell
npm ci
npm run dev
```

Create and confirm your account, then create your owner workspace. In Settings, add a station, certified tank charts, nozzle baselines and verified fuel prices. Authorize each Munshi's email before they create their account. Their role and station assignment come from database membership.

## Implemented workflows

- Owner and station-restricted Munshi access; server-verified sessions and tenant isolation.
- Multi-station setup, certified CSV dip charts, nozzle mapping, price history and effective times.
- Incoming deliveries, immutable arrival audits, thermal allowance calculation, owner approval, single decant posting and downloadable shortage claims.
- Shift baselines, camera/location evidence, nozzle/tank/cash reconciliation, owner review and CSV exports.
- Corporate credit accounts, controlled vehicle QR credentials, transactional credit-limit checks, digital parchis, receipts and payment recording.
- Expiring contractor driver links, explicit location-sharing consent, real location reports, stale-signal status and stop-review flags. Owned-truck hardware tracking is excluded.
- Discrepancy case desk, owner-approved fuel indents, equipment maintenance and named-recipient handovers, with immutable history and guarded state transitions.
- Searchable document centre for approved claims, issued parchis and current customer statements.
- Responsive reference-inspired sign-in canvas, pointer motion, local media, still fallback, amount masking, accessible dialogs and reduced-motion support.
- Original glass PumpShield mark, Phosphor icons, touch-first parchi steps and printable owner-issued vehicle fuel passes.
- MapLibre 3D maps, optional licensed satellite imagery, real terrain, reported-position tanker animation, station pin selection and WhatsApp/SMS/native link sharing.
- Installable `/offline` field terminal: encrypted local parchi, arrival-audit and shift-close drafts; camera evidence; ordered reconnect verification; idempotent posting and review states.

## Validation

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm audit
npx supabase db query --linked --project-ref yfeqjemxzfhzqbpgblfm --file tests/database.sql
npx supabase db query --linked --project-ref yfeqjemxzfhzqbpgblfm --file tests/operations.sql
npx supabase db query --linked --project-ref yfeqjemxzfhzqbpgblfm --file tests/field.sql
```

The SQL suite creates temporary users and business records inside a transaction and rolls them all back. It checks tenant isolation, kiosk projections, role escalation, locked submissions, approval gates, double-decant prevention, credit limits, stock/cash reconciliation and revocation. The operations suite checks assignment, owner-only cases, state ordering, decision notes, recipient acknowledgements, stale requests and immutable history. Indent receipt is integrated with the real decant flow and checked for duplicate stock posting. Run with a migration-admin connection, never a browser key.

## Deployment and updates

The repository is connected to Vercel. Git pushes produce deployments; production follows `main`, and other branches receive protected previews. GitHub Actions runs lint, TypeScript, calculation tests, dependency audit, a production build and unauthenticated-route checks. CodeQL performs static analysis. Dependabot opens weekly dependency and Actions update pull requests.

Require the Quality check on `main` before merging. Do not merge dependency updates without passing checks. Supabase migrations are versioned in `supabase/migrations`; deploy schema changes before application code that depends on them. Auth redirect configuration lives in `supabase/config.toml`. Preview environments should use a separate Supabase project before testing destructive schema changes.

## Operational boundaries

The isolated PumpShield - Design Lab workspace contains explicitly labelled synthetic records for evaluation. Other workspaces use entered business records. WhatsApp/SMS buttons open the user's composer; automated messaging, OCR and PPDA partner offers are not configured. Captured images are reviewed by people. Phone GPS depends on permission, coverage and an open page; it cannot guarantee background tracking. MapLibre/OpenFreeMap shows reported coordinates, with Leaflet/OpenStreetMap fallback if 3D is unavailable. It does not calculate a road route or ETA. Set a domain-restricted `NEXT_PUBLIC_MAPTILER_KEY` for licensed satellite imagery; otherwise the application uses a dark vector map. Provider attribution remains visible.

For parchi scanning, the owner opens **Digital parchi → corporate account → Vehicles & QR credentials → Print vehicle fuel pass**. Munshi scans that pass, checks the matched vehicle, enters litres and captures the final nozzle reading. Payment QRs, number plates and receipt QRs are not vehicle credentials. A pass never bypasses staff authentication or server checks.

Prepare `/offline` while signed in, choose a separate strong passphrase, then use the browser's Install/Add to Home Screen command. Drafts are encrypted with AES-GCM; the key is not persisted. Offline capture does not approve credit. Sync runs while the terminal is open and unlocked, checks current access and original shift, and stops at a record requiring review. Context/evidence older than 24 hours require review; the normal credit shift deadline still applies. Lost passphrases or cleared browser storage cannot recover unsynced drafts. Private pages, APIs, map tiles and bearer links are never service-worker cached. Bump the cache version when changing service-worker cache rules; hashed Next assets update through the online preparation flow.

The thermal result is a calculated commercial claim for review, not a legal determination or evidence of theft. Fuel rates and coefficients are entered by the owner from verified sources. Prices are not scraped or hardcoded.

Shift deadlines occur at the earliest of 12 hours, midnight PKT, or a scheduled price change. Late submissions are flagged; the app does not invent historical readings. All volumes and revenue refer to recorded measurements. Dashboard detail lists use the most recent 200 workspace records; exports cover the loaded register.

Before a business-critical rollout, connect production SMTP for unrestricted staff confirmation/recovery emails, configure backup retention and monitoring, verify charts and measurement procedures, and perform a supervised station acceptance run. Supabase's default SMTP may restrict recipients. Leaked-password screening depends on your Supabase plan/settings.

See [security controls](SECURITY.md) and [screen-by-screen design references](docs/design-references.md).

See the [design and workflow verification report](docs/design-review-2026-11-08.md) and [station feature roadmap](docs/product-roadmap.md).

See the [mobile, maps, vehicle pass and offline verification report](docs/mobile-field-review-2026-11-09.md) for the latest release and remaining station acceptance checks.
