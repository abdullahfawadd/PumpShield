# PumpShield product concepts and delivery priorities

## Delivered in this iteration

- Delivery movement board: in transit, audit review, cleared to decant, completed. Dragging a card opens its next required workflow; it cannot bypass evidence, owner approval, or posting confirmation. Explicit card buttons work on touchscreens and keyboards.
- Viewport-fitted sign-in with the actual Flowing launch media tiles and motion clips, local assets, source credit and reduced-motion handling.
- Shared multipage PDF system for delivery claims, credit-fill receipts and corporate account statements. Documents wrap long content, paginate, carry record IDs and machine-readable QR references, and identify synthetic records.

## Next modules worth building

| Priority | Module | Concrete workflow | Why it earns its place | Required foundation |
| --- | --- | --- | --- | --- |
| 1 | Exception case desk | Turn a stock/cash discrepancy into a case; assign an owner, attach evidence, record investigation, resolve with a reason. | A variance should lead to a traceable resolution rather than another red card. | Tenant-scoped case, comment and attachment tables; immutable resolution history. |
| 1 | Procurement / indent board | Requested → approved → supplier confirmed → dispatched → reconciled. Link the resulting dispatch directly to delivery verification. | Connects purchasing intent to what actually reaches the tank. | Supplier contacts, approval limits, purchase-order numbering and quantities. |
| 1 | Document centre | Search claims, receipts and statements by period, vehicle, counterparty and amount; bulk download a reviewed period. | Removes the need to find a PDF inside individual record dialogs. | Date-bounded APIs, immutable issued-document snapshots and retention policy. |
| 2 | Accounts receivable | Invoice batches, received payments, allocation to invoices, overdue buckets and a customer statement. | Current balances alone do not show what is overdue or which receipt settled which fill. | Double-entry or allocation ledger; accurate opening balances; reviewed tax requirements. |
| 2 | Shift handover | Incoming supervisor accepts keys, cash, unresolved issues and instrument status. Outgoing submission remains locked. | Makes responsibility transfer explicit across shifts. | Acceptance records, escalation rules and role-bound signing. |
| 2 | Equipment maintenance board | Schedule nozzle calibration, tank cleaning and meter inspection; track due dates, evidence and service completion. | Prevents recurring variances caused by equipment drift. | Equipment registry, certified service attachments and reminder provider. |
| 2 | Inventory planning | Consumption trend, minimum stock, expected deliveries and actionable reorder suggestions. | Converts inventory into purchasing decisions. | Reliable historical readings, delivery lead times and configurable reserve limits. |
| 3 | Supplier scorecards | Compare delivery quantity, unexplained shortages, audit timeliness and dispute resolution by supplier. | Supports factual supplier conversations. | Sufficient reviewed history; no unsupported theft labels. |
| 3 | Corporate fleet portal | Customers see only their authorized vehicles, fills and statements; request revocation of a lost credential. | Reduces reconciliation messages between the station and corporate clients. | A separate customer role and tested row policies. |

## Production rollout work

The deployed controls use real authentication, database state and guarded operations. They do not make the deployment fully ready for every station's business process. Before expanding the pilot: connect production SMTP and monitored notification delivery, agree on calibration and commercial standards, exercise backup restoration, define retention, test real cameras/locations on the station's devices, and validate accounting balances with the owner. WhatsApp and OCR require configured providers and their own failure/review paths.

Do not auto-close a shift using invented meter readings, infer theft from a variance, or move a financial board card by silently changing a status. Keep speculative financial and operational modules out of the live navigation until their data model and complete workflow exist.
