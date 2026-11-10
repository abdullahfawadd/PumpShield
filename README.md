# PumpShield PK

Fuel-station operations built with Next.js 16, React 19, TypeScript, Tailwind 4, shadcn-style Radix components, and Supabase Auth/Postgres/Storage.

## Run locally

Use Node.js 24. Copy `.env.example` to `.env.local`, set the Supabase URL and publishable key, then:

```powershell
npm ci
npm run dev
```

Create and confirm your account, then explicitly create your owner workspace. In Settings, add a station, certified tank charts, nozzle baselines and verified fuel prices. Invite each Munshi's email; after signing in, the recipient chooses and accepts the invitation showing its workspace and station. Viewing a page never creates membership. Existing memberships cannot be replaced by another invitation.

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
- Original minimal vector PumpShield mark, Phosphor icons, touch-first parchi steps and printable owner-issued vehicle fuel passes. The existing sign-in canvas and layout are preserved.
- Context-aware Owner overview: real daily shift totals and drilldowns, payment mix, recorded tank levels, delivery-stage filters, and a permanent review queue. Versioned browser preferences hide/reorder optional panels without storing business values. Missing days are not fabricated as zero sales.
- Validated URL view/station/record state, desktop board and phone list presentations, compact reconciliation register and progressive operational forms.
- MapLibre 3D maps, optional licensed satellite imagery, real terrain, reported-position tanker animation, station pin selection and WhatsApp/SMS/native link sharing.
- Installable `/offline` field terminal: encrypted local parchi, arrival-audit and shift-close drafts; camera evidence; ordered reconnect verification; idempotent posting and review states.

## Validation

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm audit
docker run --name pumpshield-redesign-validation --network none -e POSTGRES_HOST_AUTH_METHOD=trust -d postgres:17-alpine
python scripts/test-database.py
```

The database harness applies every migration to a fresh database in the named disposable, unexposed PostgreSQL container. Auth/Storage schemas are minimal test fixtures, not running Supabase services. Four rolled-back SQL suites check tenant isolation, kiosk projections, role escalation, approval/decant/credit/shift invariants, operations transitions, offline replay, explicit invitation consent and finite numeric boundaries. Results are written under ignored `output/`. This does not substitute for an isolated full Supabase browser-to-database acceptance run. Never point this harness at a client database. Remove the dedicated test container when finished; do not clear unrelated containers or pending device drafts.

## Deployment and updates

The repository is connected to Vercel. Git pushes produce deployments; production follows `main`, and other branches receive protected previews. GitHub Actions runs lint, TypeScript, unit tests, dependency audit, a production build, unauthenticated-route checks and disposable PostgreSQL migration/domain suites. CodeQL performs static analysis. Dependabot opens weekly dependency and Actions update pull requests.

Require the Quality check on `main` before merging. Do not merge dependency updates without passing checks. Supabase migrations are versioned in `supabase/migrations`; deploy schema changes before application code that depends on them. Auth redirect configuration lives in `supabase/config.toml`. Preview environments should use a separate Supabase project before testing destructive schema changes.

## Operational boundaries

The isolated PumpShield - Design Lab workspace contains explicitly labelled synthetic records for evaluation. Other workspaces use entered business records. WhatsApp/SMS buttons open the user's composer; automated messaging, OCR and PPDA partner offers are not configured. Captured images are reviewed by people. Phone GPS depends on permission, coverage and an open page; it cannot guarantee background tracking. MapLibre/OpenFreeMap shows reported coordinates, with Leaflet/OpenStreetMap fallback if 3D is unavailable. It does not calculate a road route or ETA. Set a domain-restricted `NEXT_PUBLIC_MAPTILER_KEY` for licensed satellite imagery; otherwise the application uses a dark vector map. Provider attribution remains visible.

For parchi scanning, the owner opens **Digital parchi → corporate account → Vehicles & QR credentials → Print vehicle fuel pass**. Munshi scans that pass, checks the matched vehicle, enters litres and captures the final nozzle reading. Payment QRs, number plates and receipt QRs are not vehicle credentials. A pass never bypasses staff authentication or server checks.

Open Device & sync while signed in, choose a separate strong passphrase, then use the browser's Install/Add to Home Screen command. Drafts are encrypted with AES-GCM; the key remains in memory by default. The explicit trusted-device option stores a nonextractable device credential for up to24hours; it never stores the account password. Offline capture does not approve credit. Sync runs while the app is open and unlocked, checks current access and original shift, and stops at a record requiring review. Context/evidence older than 24 hours require review; the normal credit shift deadline still applies. Lost passphrases or cleared browser storage cannot recover unsynced drafts. Private pages, APIs, map tiles and bearer links are never service-worker cached. Bump the cache version when changing service-worker cache rules; hashed Next assets update through the online preparation flow.

The thermal result is a calculated commercial claim for review, not a legal determination or evidence of theft. Fuel rates and coefficients are entered by the owner from verified sources. Prices are not scraped or hardcoded.

Shift deadlines occur at the earliest of 12 hours, midnight PKT, or a scheduled price change. Late submissions are flagged; the app does not invent historical readings. All volumes and revenue refer to recorded measurements. Dashboard detail lists use the most recent 200 workspace records; exports cover the loaded register.

Before a business-critical rollout, connect production SMTP for unrestricted staff confirmation/recovery emails, configure backup retention and monitoring, verify charts and measurement procedures, and perform a supervised station acceptance run. Supabase's default SMTP may restrict recipients. Leaked-password screening depends on your Supabase plan/settings.

See [security controls](SECURITY.md) and [screen-by-screen design references](docs/design-references.md).

See the [design and workflow verification report](docs/design-review-2026-11-08.md) and [station feature roadmap](docs/product-roadmap.md).

See the [mobile, maps, vehicle pass and offline verification report](docs/mobile-field-review-2026-11-09.md) for the latest release and remaining station acceptance checks.

See the [redesign implementation and verification report](docs/redesign-implementation-2026-11-09.md) for the current local changes, evidence, staged migration, rollout order and unverified release checks. The earlier audit is preserved under `artifacts/pumpshield-audit`.


High Octane (HOBC) is supported independently of Petrol (MS) and Diesel (HSD). Prices and thermal coefficients must be verified per station grade. Astryx0.7.11 provides the neutral theme and initial controls. Installed launch opens `/app`; a network failure serves the public offline shell without caching private pages. Remembered-device access is optional and revoked by Lock/logout. Browsers do not guarantee synchronization while the app is closed.
