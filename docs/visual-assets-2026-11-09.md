# Dashboard visual assets

The current dashboard combines an original generated tanker cutout with code-native data visuals. The tanker is an illustration, not a photograph of a registered vehicle or proof of GPS position. All displayed quantities, identifiers, stages and counters come from authorized station records.

## Generated tanker

- Mode: built-in imagegen, transparent-background generation; no API-key CLI fallback.
- Project asset: `public/illustrations/fuel-tanker-v1.webp`.
- Original: retained under the Codex generated-images directory on the development machine.
- Delivery asset: 1100 × 550, RGBA WebP, 105,040 bytes. Alpha preserved; resized/encoded with the installed Sharp package.
- Consumer: `src/components/receiving-focus.tsx`, using responsive Next Image sizes and lazy loading.
- No external manufacturer art, logos, copied dashboard screenshots or new runtime art libraries.

Exact generation prompt:

> Use case: product-mockup. Asset type: transparent cutout for PumpShield fuel-station delivery dashboard. Create one polished, physically plausible 3D product rendering of a road fuel tanker: modern compact white tractor cab with understated deep petroleum-green lower panels, attached brushed-silver cylindrical multi-axle fuel tank trailer. Original generic design, no manufacturer logo, no words, no registration, no symbols or hazard text. Front three-quarter view from slightly above, cab on the left and tanker extending to the right, full vehicle visible with generous breathing room, horizontal composition. Sophisticated industrial catalog photography, soft studio light, crisp realistic materials and tires, restrained white, silver, charcoal and petroleum green. Genuine transparent background with a very soft contact shadow only. No UI, no gauges, no landscape, no people, no watermark. This is an illustrative vehicle asset, not a screenshot.

## Code-native operational concepts

1. **Receiving focus:** switch among actual incoming records; inspect invoice litres, depot/station, calibration compartment count, loading temperature, measured arrival and verification stage. Open the selected record or its lazy-loaded tracking panel. Progress is the verification workflow, not road distance.
2. **Tank cutaways:** the fill percentage represents recorded stock divided by capacity. Select a tank to inspect its linked saved nozzle counters. Confirm physical levels by dip; the graphic is not an ATG sensor.
3. **Payment ring:** select Cash, POS or Credit to inspect actual submitted shift totals. Values are directly labelled and masked in presentation privacy mode. Percentages describe that loaded period, not projected revenue.
4. **Daily shift chart:** select a recorded date, then open its actual shift records. The 7/30-day window uses Pakistan calendar dates. Missing observations are not invented as zero sales.
5. **Delivery stage controls:** filter the loaded register by actual guarded state. Workflow cards retain server approval/evidence requirements.

Motion is limited to subtle hover emphasis and respects reduced motion. Keyboard/touch controls accompany every interaction; there is no hover-only operational command.

## Useful later concepts, gated by data availability

- Reserve bands only after the owner can persist and verify per-tank thresholds; do not invent a red threshold from a generic percentage.
- Reorder forecasts only after reviewed comparable sales history and a documented forecast model; do not fabricate days of cover.
- A discrepancy trend only from reviewed cases with consistent categorization; do not imply every variance is theft.
- Actual road routing/ETA only with a configured route provider and fresh positions. The current map does not claim these capabilities.
- Receivable ageing only after an allocation/due-date ledger exists. Current balance is not a reliable age bucket.
