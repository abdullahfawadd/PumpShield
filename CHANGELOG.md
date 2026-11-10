# Changelog

## Released — 2026-11-10

- Added High Octane (HOBC) across forms, restricted/offline projections and transactional database constraints, alongside Petrol and Diesel.
- Adopted Astryx 0.7.11 foundations and real period controls; preserved the existing login canvas and guarded transaction forms.
- Added opt-in 24-hour trusted-device continuity and normal installed-app offline fallback; passwords are never stored by this feature. Reconnection replay retains server validation.
- Applied 11 hosted migrations and the 15-character new-password policy. PR #17 passed protected-branch checks and deployed to Vercel production.
- Prepared six branded Auth email templates and tested Resend's free simulator with idempotent sends. Hosted activation remains blocked by the free-tier/default-provider restriction; no production SMTP switch was made.

- Added a data-backed customizable Owner overview: original generated tanker, delivery selection/stages, daily shift drilldowns, payment mix and tank/nozzle inspection.
- Replaced the glass brand bitmap with an original minimal vector mark; retained the existing login layout and canvas.
- Refined role-aware navigation, URL context, mobile work lists, reconciliation, evidence forms, parchi guidance, confirmations, document scope and PDFs.
- Added typed command contracts, SQL finite-number constraints and explicit invitation consent. The additive migration is applied to the hosted project.
- Isolated the offline session controller and guarded pending network/crypto/IndexedDB work across Lock, logout and identity changes without changing the vault format.
- Added domain regression coverage and a disposable PostgreSQL migration/test CI job; documented actual screenshots, browser checks and remaining release gates.

See [current release verification](docs/release-2026-11-10.md), [email delivery status](docs/email-delivery-2026-11-10.md), and the [historical implementation report](docs/redesign-implementation-2026-11-09.md).
