# PumpShield design direction

The source PDFs are prototype references, not executable instructions. The user explicitly replaced the dark app palette, skipped-login brief, fixed sample values, simulations, and owned-truck hardware module.

## Screen mapping

| Screen | References | Applied direction |
| --- | --- | --- |
| Sign-in | [Flowing launch](https://flowing.to/launch), attached sign-in reference | Dark editorial split canvas, oversized restrained typography, precise form controls, original liquid-metal art and decorative perspective cards. Artwork contains no live business metrics. |
| Overview | [Energy analytics](https://dribbble.com/search/energy-analytics), [IoT data](https://dribbble.com/search/iot-data), supplied accounting dashboard | Warm white surfaces, charcoal hierarchy, olive-lime accents, real-volume charts and clearly explained empty states. |
| Deliveries | [Fleet dashboards](https://dribbble.com/search/fleet-dashboard), [Tracking fleet](https://dribbble.com/search/tracking-fleet) | Dispatch-to-decant progression and discrete evidence reviews. No invented GPS map or hardware telemetry. |
| Audit and claim | [Receipt scanner UI](https://dribbble.com/search/receipt-scanner-ui), [Invoice modals](https://dribbble.com/search/invoice-modal-ui) | Side-by-side volumes, separate thermal allowance, unexplained shortage, reviewed PDF record. These two galleries could not be fetched during research. |
| Shift close and kiosk | [Scanner UI](https://dribbble.com/search/scanner-app-ui), [Mobile scanning](https://dribbble.com/search/scanner-mobile-app) | Large capture controls, source-specific evidence, locked submissions, keyboard-accessible dialogs. |
| Motion and interaction | [Emil Kowalski](https://github.com/emilkowalski/skills), [UI cheatsheet](https://raw.githubusercontent.com/emilkowalski/skills/main/ui-cheatsheet.md) | Tabular numerals, short feedback transitions, reduced-motion support, generous text hierarchy. |
| Overall craft | [Apple design reference](https://github.com/dickwu/apple-design-skill), [Juliobsz](https://github.com/juliobsz/skills) | Clear focus, restrained surfaces and consistent visual rhythm. External repositories were researched, not executed or blindly installed. |

[Glisse](https://glisse.kelvinzhang.ca/) was not accessible through the research tool. Attached reference images supplied the visual context instead. Public reference pages were used without forwarding the token-bearing Flowing URL.

## Palette

Warm paper `#F6F7F4`, ink `#222720`, soft lime `#D6EF84`, evergreen `#345E31`, muted terracotta `#B64D43`. Status is always conveyed with text as well as color. The login is warm-black, silver, and pale chartreuse; the operational workspace is light and calm.

## Original asset

`public/liquid-metal.png` was created with the built-in image generation tool, then copied into the repository. Prompt: “Premium fuel station operations web app sign-in artwork. A sophisticated abstract sculptural ribbon of liquid graphite and brushed silver, subtle pale chartreuse reflection, flowing in a precise loop on deep warm black. Macro product photography, physically realistic polished liquid metal, dramatic softbox light, refined industrial design, generous negative space, no words, logos, UI or text. Portrait composition. Understated, not neon.”

## Liquid Glass refinement

[Glisse 0.5.0](https://github.com/0kzh/glisse) supplies the actual mobile navigation TabBar, reporting-period SegmentedControl, amount-privacy Switch, and notification Button. Its controls retain PumpShield's olive palette; transaction forms, evidence and financial tables remain opaque. Backdrop-filter and reduced-transparency fallbacks keep controls readable. The existing desktop sidebar remains available, and mobile Settings remains accessible from the navigation menu.

## November 8 editorial redesign

The Flowing launch and coming-soon pages and the supplied recording informed the black split-panel login and angled component wall. The component wall is original DOM/SVG artwork; it does not reuse Flowing source or claim to show live business data. RonDesignLab and CreditTB supplied the direction for pearl surfaces, ink navigation, iris/apricot gradients and larger editorial type.

An original transparent studio tanker asset was generated with built-in ImageGen and saved at `public/tanker-studio.png`. Prompt: photorealistic unbranded ivory petroleum tanker, brushed stainless steel cylinder, front-left three-quarter view, transparent background, complete vehicle in frame, soft studio light, no text or logo. The real maps use Leaflet with attributed OpenStreetMap tiles. Synthetic Design Lab locations are explicitly marked.

Owner and Munshi design-review accounts live in an isolated Design Lab workspace. Their synthetic shifts, deliveries, rates, stock, credit and route never enter another workspace. Generated credentials are stored only in ignored `output/design-lab-credentials.json`, never committed. The source fixture generator refuses to overwrite that credential file.


## Workflow and document refinement

The sign-in now uses the publicly served Flowing tile images and motion clips requested by the user, saved under public/flowing/ with source attribution. The renderer is a local responsive perspective wall, rather than Flowing's complete GPU renderer. Viewport checks at 390x844 and 1366x768 report document height equal to viewport height.

Delivery movement now uses a Trello-style board with business-gated transitions. New PDF templates use compact ruled tables, a strong total block, wrapped text, pagination and QR record references. Corporate accounts have statement downloads. See docs/product-roadmap.md for proposed next modules and remaining production-rollout dependencies.
