# Changelog

## Unreleased — 2026-11-09

- Added a data-backed customizable Owner overview: original generated tanker, delivery selection/stages, daily shift drilldowns, payment mix and tank/nozzle inspection.
- Replaced the glass brand bitmap with an original minimal vector mark; retained the existing login layout and canvas.
- Refined role-aware navigation, URL context, mobile work lists, reconciliation, evidence forms, parchi guidance, confirmations, document scope and PDFs.
- Added typed command contracts and staged SQL finite-number constraints and explicit invitation consent. The additive migration has been tested locally but is not applied to the hosted project.
- Isolated the offline session controller and guarded pending network/crypto/IndexedDB work across Lock, logout and identity changes without changing the vault format.
- Added domain regression coverage and a disposable PostgreSQL migration/test CI job; documented actual screenshots, browser checks and remaining release gates.

See [implementation and verification](docs/redesign-implementation-2026-11-09.md). These changes are local and unreleased; no deployment is implied.
