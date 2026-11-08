# Design reference decisions — 8 November 2026

## Visual sources mapped to the product

| Reference | Used for | Decision in PumpShield |
| --- | --- | --- |
| [Flowing launch](https://flowing.to/launch) | Desktop split composition, oblique media wall, optical depth, quiet form | Approximately 45.5 / 54.5 split, 12px outer inset, near-black surfaces, large 1:1 line-height heading; compact real email/password form. Phone places the wall above the form. Local media with visible source credit. |
| [Flowing coming soon](https://flowing.to/coming-soon) | User-supplied alternative launch reference | Launch is the primary measured source; do not mix two layouts and claim a pixel-identical clone. |
| [RonDesignLab](https://dribbble.com/RonDesignLab), [CreditTB](https://dribbble.com/shots/27862421-CreditTB-Credit-Score-Management-Dashboard) | Card proportions, editorial hierarchy, sidebar organisation | Keep clear headings and asymmetric overview cards. Replace decorative low-contrast pastel text with readable ink and olive; reserve colour for status and small surfaces. User screenshots supply the visual detail. |
| [Fleet dashboards](https://dribbble.com/search/fleet-dashboard) | Arrival status, vehicle context, map and operational focus | Retain contractor GPS reports and delivery spotlight, not owned-truck hardware. Show saved report provenance and synthetic-data notices. |
| [Behance fuel-station dashboard](https://www.behance.net/gallery/212648659/Fuel-Station-Management-Dashboard-UI-Design-SaaS) | Domain-specific research lead | Direct fetch returned 403. No claim that the project was visually audited or copied. |

## Interaction and HCI reasoning

- **Visibility and feedback:** saved stages and dated history; periodic refresh; error/retry state; server rejection of stale decisions. Grounded in [Nielsen's usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).
- **Error prevention:** an explicit, initially empty next-action menu, cleared decision notes after a transition, required completion/cancellation reasons, immutable comments, and physical-delivery requirements before receipt. A test exposed the browser retaining an unintended selection when an option disappeared; the action form now remounts for the new stage.
- **Recognition:** labelled workflow groups and lanes, named assignees, linked station records, and clear empty states. Cards are buttons and do not require dragging to complete a task.
- **Touch and keyboard:** the sign-in fields are at least 42px on small phones; major board actions are at least 44px. Secondary auth links have at least 28px height. The latter exceeds WCAG's 24px target minimum but is smaller than the preferred 44px touch size. Radix dialogs provide Escape dismissal and focus containment.
- **Motion:** [Apple HIG motion](https://developer.apple.com/design/human-interface-guidelines/motion) and [WebKit reduced-motion guidance](https://webkit.org/blog/7551/responsive-design-for-motion/) inform a still composition with no video playback for reduced motion. Decorative movement never conveys saved business state.
- **Colour and readability:** automated checks use WCAG 2 A/AA and 2.2 AA rule tags. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) is a verification reference, not a certification claim. The review corrected observed text contrast failures and changed the interactive map from an image role to a labelled region.

## Code and asset selection

Reviewed [Glisse](https://github.com/0kzh/glisse), [dnd-kit](https://github.com/clauderic/dnd-kit), and [React Three Fiber](https://github.com/pmndrs/react-three-fiber). Glisse 0.5.0 was already installed and remains limited to appropriate controls/navigation. Existing Leaflet maps and Radix dialogs were retained. New workflow boards use explicit authenticated actions; a drag gesture cannot bypass a required decision or post stock. No additional 3D engine is necessary for a flat projected decorative wall.

The official [weekly TypeScript trending feed](https://github.com/trending/typescript?since=weekly) was fetched during research. It included tldraw and multiple agent/developer tools. Popularity does not establish suitability for forecourt accounting; none was added solely because it was trending. tldraw's collaborative editor is not needed for the current operational forms. No unreviewed dashboard template or arbitrary install script was imported.

The new Canvas 2D renderer is independent application code, with orthographic geometry, pointer easing, wheel inertia, four local video clips and local still fallback. The source uses WebGPU and wheel/touch listeners; mouse-position easing is an additional user-requested behaviour. Tile order and rendering engine differ. The result matches the reference's composition and interaction direction, not its signup content or every rendered pixel. See [media attribution](../public/flowing/SOURCE.md).

## Relevant feature choices

Cases, supply indents, maintenance and signed handover briefings answer actual station tasks. A document centre makes approved delivery claims and customer statements easier to retrieve. Accounting allocation, tax invoices, supplier rankings, OCR and notification automation require commercial requirements or configured providers and remain outside the current release. See [roadmap](product-roadmap.md).
