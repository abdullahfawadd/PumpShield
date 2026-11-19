# Station workflow update

## Receiving and stock

- Match the indent to a delivery for the same station and fuel grade. The Owner approves the arrival audit. Once a permitted operator confirms the physical unload, the system posts the measured volume to the assigned tank.
- A dispatched indent stays open until the linked delivery posts stock. The Operations response includes the linked delivery after it leaves Munshi’s active delivery queue. It exposes the status and fuel grade needed to record the receipt.
- An approved audit can still be too large for the assigned tank. The Owner sees recorded stock, available capacity and projected stock before confirming. Resolve the discrepancy using verified measurements.
- A closed shift updates recorded stock from the calibrated closing dip. The Overview and Stock & prices panels link back to dispensed volume, expected stock, measured stock and variance on that shift. Recorded stock can also include subsequent deliveries.

## Phone workflow

- Install or open PumpShield online and sign in once to prepare the assigned station on the device. Start or load an open shift online before a disconnected credit fill or shift close.
- Arrival audits, shift closures and digital parchis can save evidence and measurements on the device. PumpShield uploads saved records when the app is open and connectivity returns. The same server checks still apply. A conflicting or rejected record remains visible for review.
- The cached work view can reopen on a prepared device while its 24-hour access window is valid. Keep the device protected with its normal screen lock. Sign-out locks cached access. The previous encrypted drafts are available through recovery for people who used the former device setup.
- Owners start with guided workspace creation and the first station. Station settings provide next steps for equipment, rates and staff invitations. Existing accounts and their history are retained.

## Verification scope

The synthetic [Design Lab fixture](../scripts/seed-design-lab-high-octane.sql) provides a High Octane tank with 15,000 L of free capacity, a 6,000 L delivery, a matching nozzle and rate, and a corporate vehicle pass. The seed checks both demo roles before inserting sample records. No real station records are needed.

The isolated PostgreSQL suites apply every migration from scratch and check capacity, duplicate stock posting, role-scoped delivery links, indent receipt, three-grade reconciliation, credit accounting, onboarding and offline replay. Browser checks use the existing synthetic roles. Build and test evidence should be recorded against the commit being released. Physical camera, GPS and installation behavior require checks on the client’s target devices.
