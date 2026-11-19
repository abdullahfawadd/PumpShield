# PumpShield workspace design refresh

The Owner overview groups shift actions, sales, tank stock, receiving and recent work. Tank readings and sales link to the saved shift that explains them. Munshi’s home screen leads with station tasks and has a dedicated delivery register one tap away. The desktop sidebar can collapse to an icon rail and remembers the device’s preference. The phone drawer and bottom navigation retain labelled actions.

The station selector and device sync live in the top bar. Queued records, sync failures, offline readiness and manual refresh are available from the sync control. Synthetic records still carry the Design Lab label. Document lists, delivery filters and shift registers keep their primary controls near the records.

## Design references

| Reference | Decision in PumpShield |
| --- | --- |
| [Samsara platform design](https://www.samsara.com/blog/meet-the-new-samsara-platform-experience) | Keep the active destination visible when the sidebar is collapsed. Give the recovered space to operational records. |
| [MyGeotab asset management](https://support.geotab.com/help/mygeotab/managing-users-and-vehicles/asset-setup-and-management/assets) | Give exceptions a visible place when they need attention. Link the summary back to the source record. |
| [Fleetio work order overview](https://help.fleetio.com/en_US/maintenance/work-order-overview) | Use record status and next action to organize lists and filters. |
| [Electronic Cargo on Dribbble](https://dribbble.com/shots/26678832-Electronic-Cargo-App-Logistics-Mobile-Dashboard) | Use restrained color and give each delivery one focal action and a compact progress summary. |
| [Fleet Management System on Behance](https://www.behance.net/gallery/189812717/Fleet-Management-System/modules/1073410189) | Reorder information for the phone, with a vertical ledger and readable stock or sales figures. |
| [Astryx accessibility checklist](https://github.com/meta/astryx/wiki/Accessibility-Checklist) and [axe-core](https://github.com/dequelabs/axe-core) | Check contrast pairs, selected states, keyboard focus and accessibility names in the rendered app. |
| [Emil Kowalski’s design skills](https://github.com/emilkowalski/skills) and [Julio’s design skills](https://github.com/juliobsz/skills) | Review the interface in a browser and keep motion limited to changes in state. |

## Daylight contrast

| Text | Surface | WCAG contrast |
| --- | --- | --- |
| `#13221e` | `#fff` | 16.47:1 |
| `#465d54` | `#eef1ef` | 6.25:1 |
| `#fff` | `#13483c` | 10.40:1 |
| `#13221e` | `#d9eea6` | 13.12:1 |

The app draws stock and performance graphics from recorded data and reuses the original tanker illustration in the delivery view. The product’s sign-in artwork and measured-stock, receiving and reconciliation rules are preserved.
