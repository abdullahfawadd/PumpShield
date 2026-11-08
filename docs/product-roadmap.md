# PumpShield station workflows and delivery priorities

## Shipped

| Module | Working flow | Boundary |
| --- | --- | --- |
| Delivery movement board | In transit → arrival audit → owner approval → decant; explicit buttons plus desktop dragging | Evidence and stock-posting gates remain authoritative. |
| Discrepancy cases | Open → investigating → resolved; priority, assignee, due time, related shift/delivery, discussion | Owner only. Resolution requires a note. No automatic theft judgement or financial deduction. |
| Fuel indents | Requested → owner approved → dispatched → received | Dispatch links a same-grade delivery; receipt requires its posted decant. A delivery can fulfil only one active indent. No second stock posting. |
| Equipment maintenance | Scheduled → in progress → completed; equipment reference, due date, assignee, completion note | A work register; certification attachments and automated reminders are future integrations. |
| Shift handover | Briefing → named recipient accepts; optional related closed shift | Sender cannot accept for the recipient. Does not transfer funds or change closed readings. |
| Document centre | Search/filter delivery claims, fuel parchis, account statements; authenticated PDF links | Uses up to 200 recent dashboard records per type; not a complete archival search. |
| Login | Reference-inspired full-height composition, local motion tiles, pointer response, phone layout, reset/signup, reduced motion | Real Supabase authentication; no role selection or advertised access roles on the sign-in page. |
| Records | Timestamped history, due states, saved comments, stale-transition protection | Board lists 500 most recently updated station items; detail history loads 100 entries per page with older-entry navigation. |

These are actual database-backed workflows. Only the isolated Design Lab contains labelled synthetic records. Existing delivery, shift, and account state was retained.

## Next petrol-station improvements

1. **Receivable allocation and ageing:** allocate each receipt to actual issued credit fills/invoices, reconcile opening balances, agree payment terms, then calculate overdue buckets. Current ledger balances and generated statements remain available. Avoid inferred settlements or tax invoices without accounting requirements.
2. **Reserve-based purchasing:** configurable tank reserves, trustworthy historical consumption and supplier lead times before recommending order quantities. Manual indents already work.
3. **Service evidence and reminders:** certified calibration documents, linked equipment registry and monitored notification delivery. Basic maintenance work tracking already works.
4. **Supplier scorecards:** reviewed delivery quantity, variance, timeliness and case resolution. Require enough comparable history and an agreed supplier identifier before ranking.
5. **Customer portal:** a separately authorised corporate-customer role for its own vehicles, fills and statements. Do not reuse supervisor privileges.

## Client launch prerequisites

Agree calibration tables and commercial tolerances with the station owner; reconcile opening stock and credit balances; configure production email and operational notifications; exercise backup restoration and retention; test cameras, connectivity and location permission on actual station devices. Confirm incident handling and staff access ownership. The hosted Auth advisor still reports leaked-password protection disabled; enable it on an eligible plan: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

No unconfigured OCR, WhatsApp, banking, automatic accounting allocation or hardware signals are represented as working features.
