# Three design directions and measured color system

Open [design-exploration.html](design-exploration.html) to change direction, screen and phone composition. It contains real HTML/CSS/SVG, native form validation, working search/stage specimens, a native confirmation dialog and labelled synthetic values. It does not replace or connect to the real application. [36 rendered concepts](concepts/) cover three directions × four screens × three widths. [Canvas verification](evidence/canvas-verification.json) found no document overflow in those36 combinations, no JavaScript page errors, and working dialog open/Escape. This is prototype verification, not proof that a future production implementation passes accessibility.

## Direction01 — Petroleum Ledger · recommended

Philosophy: a precise station instrument panel with the warmth of a paper ledger. Brand: dependable, understated and operational. White surfaces on warm paper; petroleum ink is reserved for primary actions, selected navigation and principal quantity series. Charcoal numbers and dark secondary text replace pale green metadata. One bounded sidebar and a compact station header frame a work-first grid.

Typography: preserve self-hosted `next/font` Geist for UI; Geist Mono for identifiers/technical numeric strings where helpful. Use tabular numerals for quantities and money without forcing all text to mono. Body14/20px desktop,16/24px field inputs, metadata12/18px, title28/34px desktop and24/30px phone. Weights400/500/600; no decorative all-caps paragraphs. Prototype uses local system sans to remain standalone and network-free.

Radius: controls8px, cards12px, dialog16px, status5px, pills only for compact filter/status controls. Spacing:4,8,12,16,20,24,32,48px. Shadows: flat for registers; floating menu `0 8px 28px #142A201A`; dialog `0 24px 72px #142A2029`. Do not cast shadows on every row.

Buttons:44px normal,48–52px field; primary filled petroleum with white, secondary neutral surface with visible border, destructive text/outline plus confirmation. Inputs: white,46–48px, explicit unit suffix and label; focus3px with2px offset. Error includes text and target field association. Status: icon+word+color, never only a dot. Charts: petroleum quantities, blue comparison, amber threshold; use labelled axes, dashes/markers and direct values. Red only for meaningful exception/denial, not routine in-transit.

Desktop:208–224px sidebar,64px header,24–32px content gutter, three compact summaries, action queue, recorded stock and optional bounded map. Phone: one56px header, station selector,24px title, compact context, immediate work; safe-area-aware stable bottom navigation; page content reserves its height. Deliveries default to list. Arrival/parchi use staged full-screen forms with review before irreversible submission.

## Direction02 — Graphite Dispatch

Philosophy: an indoor monitoring console. Brand: controlled, technical, calm. Background graphite, raised dark panels, light mint action and high-contrast text. Distinct from01 through a narrower navigation rail, tighter rectangular cards, emphasis on current exceptions and larger map/work split. Do not choose it merely because a portfolio screenshot looks dramatic.

Typography: Geist14/20px, metadata12/18px; operational quantities28/32px and IDs13px Geist Mono. Radius:4px data regions,8px controls,12px dialogs. Same spacing increments, with16/20px panel padding. Shadow: subtle dark floating layer `0 12px 36px #00000040`; borders distinguish surfaces rather than endless gradients. Buttons: mint filled with deep text; secondary dark green; destructive pale red text with outlined boundary. Inputs: dark surface, visible neutral border, light focus. Status: light colored foreground on darker tinted surface, with labels/icons. Charts: mint, blue and amber with direct values; avoid oversaturated heatmap effects.

Desktop:160px nav rail, persistent review pane and optional map. Phone: revert to single-task stacked layout; no miniature control-room grid. Dark mode can reduce daylight readability and amplify reflections on station phones; validate on actual hardware. No transparent input fields over maps.

## Direction03 — Forecourt Journal

Philosophy: a readable operating record. Brand: composed, accountable and editorial. Ivory, forest and muted copper; ruled tables and section numbers replace rounded dashboard cards. Difference from01 is a journal-style information layout, squared records, more pronounced section rhythm and document continuity.

Typography: retain Geist for controls/body; optional licensed local serif for section titles only after font budget and language coverage are checked. The canvas demonstrates Georgia for those headings. No serif numeric entry or tiny uppercase totals. Radius:3px record panels,6px controls,12px dialogs. Spacing4–48px;24px sections and thin rules. Shadow: none for records, `0 12px 36px #2626211F` for dialogs. Buttons: deep forest filled, ivory/copper secondary, restrained danger. Inputs: opaque ivory-white, prominent border and labelled units. Status: same semantic success/warning/error/information roles as01, with text. Charts: forest, copper and violet; direct labels and line styles. Avoid copper on ivory for small text unless measured.

Desktop: ledger/table composition, compact summaries and numbered workflows. Phone: reading-first record list and single-column forms, moderate whitespace, no wide journal tables. More distinctive for documents than a dispatch-intensive workspace.

## Heuristic comparison

Scores are reasoned designer judgments on a1–5 scale, not user-study measurements or mathematically proven brand attributes.

| Criterion | Petroleum Ledger | Graphite Dispatch | Forecourt Journal |
|---|---:|---:|---:|
| Readability | 5 | 4 | 5 |
| Operational usability | 5 | 4 | 4 |
| Distinctiveness | 4 | 4 | 5 |
| Trust / measured presentation | 5 | 4 | 5 |
| Petrol-station brand fit | 5 | 4 | 4 |
| Accessibility potential | 5 | 4 | 5 |
| Desktop/mobile suitability | 5 | 3 | 4 |
| Consistency with print documents | 5 | 3 | 5 |
| Total /40 | 39 | 30 | 37 |

Select01 because field readability, financial records and task density matter more than a darker “premium” impression.03 is a credible secondary direction if the client prefers a quieter document-led identity. Do not mix all three palettes into a single application.

## Contrast verification

Calculated from sRGB relative luminance `(Llighter+.05)/(Ldarker+.05)`, with linearization threshold0.04045. [All48 exact calculations](evidence/contrast-calculations.json) are reproducible in [build-design.py](tools/build-design.py). Each direction checks normal/metadata text against backgrounds/surfaces, primary and secondary button pairs, input border and focus against surface/background, four status pairs and three chart colors against surfaces.

All tested text pairs meet 4.5:1 and tested focus/control/chart pairs meet 3:1. Decorative border tokens need not reach3:1 when not the sole control boundary; use `control-border` for actual inputs, toggles and essential chart boundaries. Do not use decorative `border` to claim an input passes. Disabled/inactive controls are exempt from some WCAG contrast requirements but still need recognizable state; never use a disabled appearance as a loading/error substitute.

The chart checks are contrast against their surface, **not pairwise color differentiation**. Colorblind acceptance still requires direct labels, distinct marker shapes/line patterns, icon+word status, and inspection with protan/deutan/tritan simulation. Such simulation and real observer testing were not performed in this audit. Avoid green/red-only comparisons or red/green map dots without symbols. Text on aerial photography needs an opaque tested surface.

## Semantic variables

The exact machine-readable source is [design-tokens.json](evidence/design-tokens.json). The blocks below are complete proposed color tokens, not app source changes. Add application spacing/radius/type tokens once the direction is selected; use aliases instead of scattering raw HEX values. Keep provider-map styling and warning surfaces subordinate to these roles.


### 01 · Petroleum Ledger

`css
[data-theme=petroleum] {
  --background: #F5F3EE;
  --surface: #FFFFFF;
  --surface-raised: #FFFFFF;
  --text: #202724;
  --text-secondary: #58645F;
  --primary: #174C45;
  --on-primary: #FFFFFF;
  --secondary: #E9EDE7;
  --on-secondary: #34473E;
  --border: #CAD1CB;
  --control-border: #7A8580;
  --focus: #2463AA;
  --chart-1: #174C45;
  --chart-2: #24598A;
  --chart-3: #80530B;
  --success: #1F6247;
  --success-surface: #E7F3EB;
  --warning: #80530B;
  --warning-surface: #FFF3D6;
  --error: #9E302F;
  --error-surface: #FCEBE8;
  --info: #24598A;
  --info-surface: #EAF2FC;
}
`

### 02 · Graphite Dispatch

`css
[data-theme=graphite] {
  --background: #151A1B;
  --surface: #202728;
  --surface-raised: #2A3432;
  --text: #EFF4EF;
  --text-secondary: #B0BDB7;
  --primary: #A5D6BA;
  --on-primary: #142A20;
  --secondary: #35463D;
  --on-secondary: #E6EEE7;
  --border: #4A5852;
  --control-border: #7D8D85;
  --focus: #AFC9FF;
  --chart-1: #A5D6BA;
  --chart-2: #9EC3F1;
  --chart-3: #E7C47D;
  --success: #A5D6BA;
  --success-surface: #203D30;
  --warning: #F1D089;
  --warning-surface: #443820;
  --error: #FFB4AA;
  --error-surface: #4B2D2C;
  --info: #B3D1FA;
  --info-surface: #293C53;
}
`

### 03 · Forecourt Journal

`css
[data-theme=ivory] {
  --background: #FAF7F0;
  --surface: #FFFDFC;
  --surface-raised: #FFFFFF;
  --text: #262621;
  --text-secondary: #66614F;
  --primary: #3C4936;
  --on-primary: #FFFFFF;
  --secondary: #EEE4D8;
  --on-secondary: #75523E;
  --border: #D4CFC0;
  --control-border: #8A816D;
  --focus: #5B509C;
  --chart-1: #3C4936;
  --chart-2: #75523E;
  --chart-3: #5B509C;
  --success: #1F6247;
  --success-surface: #E7F3EB;
  --warning: #80530B;
  --warning-surface: #FFF3D6;
  --error: #9E302F;
  --error-surface: #FCEBE8;
  --info: #24598A;
  --info-surface: #EAF2FC;
}
`

Shared non-color variables: --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:20px; --space-6:24px; --space-8:32px; --space-12:48px; --radius-control:8px; --radius-card:12px; --radius-dialog:16px; --focus-width:3px; --touch-target:48px; --sidebar-width:216px; --header-height:64px. Respect user font scaling and safe-area insets.

## Measured contrast ratios

| Direction | Foreground / background | Ratio | Threshold |
|---|---|---:|---:|
| petroleum | text #202724 / background #F5F3EE | 13.75:1 | 4.5:1 |
| petroleum | text #202724 / surface #FFFFFF | 15.25:1 | 4.5:1 |
| petroleum | text-secondary #58645F / surface #FFFFFF | 6.17:1 | 4.5:1 |
| petroleum | text-secondary #58645F / background #F5F3EE | 5.56:1 | 4.5:1 |
| petroleum | on-primary #FFFFFF / primary #174C45 | 9.74:1 | 4.5:1 |
| petroleum | on-secondary #34473E / secondary #E9EDE7 | 8.38:1 | 4.5:1 |
| petroleum | control-border #7A8580 / surface #FFFFFF | 3.82:1 | 3:1 |
| petroleum | focus #2463AA / surface #FFFFFF | 6.1:1 | 3:1 |
| petroleum | focus #2463AA / background #F5F3EE | 5.5:1 | 3:1 |
| petroleum | success #1F6247 / success-surface #E7F3EB | 6.36:1 | 4.5:1 |
| petroleum | warning #80530B / warning-surface #FFF3D6 | 6.03:1 | 4.5:1 |
| petroleum | error #9E302F / error-surface #FCEBE8 | 6.23:1 | 4.5:1 |
| petroleum | info #24598A / info-surface #EAF2FC | 6.48:1 | 4.5:1 |
| petroleum | chart-1 #174C45 / surface #FFFFFF | 9.74:1 | 3:1 |
| petroleum | chart-2 #24598A / surface #FFFFFF | 7.31:1 | 3:1 |
| petroleum | chart-3 #80530B / surface #FFFFFF | 6.65:1 | 3:1 |
| graphite | text #EFF4EF / background #151A1B | 15.77:1 | 4.5:1 |
| graphite | text #EFF4EF / surface #202728 | 13.64:1 | 4.5:1 |
| graphite | text-secondary #B0BDB7 / surface #202728 | 7.82:1 | 4.5:1 |
| graphite | text-secondary #B0BDB7 / background #151A1B | 9.04:1 | 4.5:1 |
| graphite | on-primary #142A20 / primary #A5D6BA | 9.36:1 | 4.5:1 |
| graphite | on-secondary #E6EEE7 / secondary #35463D | 8.47:1 | 4.5:1 |
| graphite | control-border #7D8D85 / surface #202728 | 4.36:1 | 3:1 |
| graphite | focus #AFC9FF / surface #202728 | 9.13:1 | 3:1 |
| graphite | focus #AFC9FF / background #151A1B | 10.56:1 | 3:1 |
| graphite | success #A5D6BA / success-surface #203D30 | 7.3:1 | 4.5:1 |
| graphite | warning #F1D089 / warning-surface #443820 | 7.71:1 | 4.5:1 |
| graphite | error #FFB4AA / error-surface #4B2D2C | 7.22:1 | 4.5:1 |
| graphite | info #B3D1FA / info-surface #293C53 | 7.19:1 | 4.5:1 |
| graphite | chart-1 #A5D6BA / surface #202728 | 9.35:1 | 3:1 |
| graphite | chart-2 #9EC3F1 / surface #202728 | 8.34:1 | 3:1 |
| graphite | chart-3 #E7C47D / surface #202728 | 9.11:1 | 3:1 |
| ivory | text #262621 / background #FAF7F0 | 14.21:1 | 4.5:1 |
| ivory | text #262621 / surface #FFFDFC | 14.99:1 | 4.5:1 |
| ivory | text-secondary #66614F / surface #FFFDFC | 6.11:1 | 4.5:1 |
| ivory | text-secondary #66614F / background #FAF7F0 | 5.79:1 | 4.5:1 |
| ivory | on-primary #FFFFFF / primary #3C4936 | 9.55:1 | 4.5:1 |
| ivory | on-secondary #75523E / secondary #EEE4D8 | 5.51:1 | 4.5:1 |
| ivory | control-border #8A816D / surface #FFFDFC | 3.81:1 | 3:1 |
| ivory | focus #5B509C / surface #FFFDFC | 6.74:1 | 3:1 |
| ivory | focus #5B509C / background #FAF7F0 | 6.39:1 | 3:1 |
| ivory | success #1F6247 / success-surface #E7F3EB | 6.36:1 | 4.5:1 |
| ivory | warning #80530B / warning-surface #FFF3D6 | 6.03:1 | 4.5:1 |
| ivory | error #9E302F / error-surface #FCEBE8 | 6.23:1 | 4.5:1 |
| ivory | info #24598A / info-surface #EAF2FC | 6.48:1 | 4.5:1 |
| ivory | chart-1 #3C4936 / surface #FFFDFC | 9.42:1 | 3:1 |
| ivory | chart-2 #75523E / surface #FFFDFC | 6.83:1 | 3:1 |
| ivory | chart-3 #5B509C / surface #FFFDFC | 6.74:1 | 3:1 |
