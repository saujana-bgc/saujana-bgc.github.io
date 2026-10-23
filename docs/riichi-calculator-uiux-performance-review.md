# Riichi calculator: UI, UX and performance review and fixes

Reviewed and fixed 19 October 2026 against the working tree, with a later follow-up for mobile tile sizing, fu detail visibility and tile preloading. Scope: `pages/riichi-calculator.vue`, `components/riichi/TileHandEntry.vue`, scoring dependencies, shared layout, compiled production CSS/JS, and tile/logo assets.

## Assessment

The reported layout, marker sizing, accessibility feedback and asset-size defects have been fixed. The calculator now uses its full desktop width, reserves one column for initial tile entry, and positions mobile marker controls relative to the visible score panel.

The page already has useful foundations: labelled tile buttons, generous primary tile targets, reversible clearing, automatic yaku detection, English search aliases, progressive disclosure, a persistent score, and explicit payment splits. Preserve these.

## Findings and applied fixes

### 1. P1 — Heading CSS changes the entire page container — fixed

**Location:** `pages/riichi-calculator.vue:1592`, repeated at `:1806`.

The scoped selector `:global(.page-content) .calculator-heading` does not produce the intended descendant selector in this build. The emitted CSS is:

```css
.page-content {
  text-align: center;
  max-width: 700px;
  margin: 0 auto 22px;
  padding: 8px 0 0;
}
```

This constrains the shared content wrapper and centres text throughout the form. At a 1280 × 720 viewport, the wrapper was 700 px wide, the calculator 644 px, and its form column **277 px**. The intended calculator width is up to 1140 px. The hidden result panel still reserves a 345 px column, further compressing initial tile entry.

Both desktop and mobile rules now use `.calculator-page .calculator-heading`. The shared `.page-content` width is no longer changed by this route.

### 2. P1 — Dora picker images render at 300 × 400 px — fixed

**Location:** `components/riichi/TileHandEntry.vue:146–148`; intended sizing at `:640–642`.

The hand picker gives each button `class="tile-picker-button"`. The face-up/ura picker omits that class. Its images therefore miss the 29 × 39 px sizing, and its buttons also miss the intended background, layout, disabled appearance and focus treatment.

Browser measurement at 390 × 844 confirmed **every indicator image was 300 × 400 px**. The grid was approximately 319 px wide and **910 px tall**. Images overflowed their roughly 56 px columns, overlapped one another and were clipped horizontally. This affects an essential step in calculating ordinary tile hands.

The indicator buttons now share the hand picker's sizing and focus styles. Images render at 29 × 39 px with an explicit 3:4 ratio. The marker picker was checked at 390 × 844 and rendered all ten character images at the intended size.

### 3. P2 — The mobile payment panel covers marker controls — fixed

**Locations:** `pages/riichi-calculator.vue:1805,1812`; `components/riichi/TileHandEntry.vue:714`.

The result panel is fixed at the bottom with `z-index:20`. The marker picker is sticky at the same bottom offset with `z-index:2`. They occupy the same space.

In the completed sample hand at 390 × 844, the result panel was **181 px tall**, while calculator bottom padding was **108 px**. Reopening markers left the second row beneath the result panel; hit testing at those button centres returned the panel. The oversized-image bug makes the problem worse, but the competing bottom positions need a separate fix.

The marker picker and group controls now offset above the measured payment panel height. A `ResizeObserver` updates that measurement as score content changes. Initial tile entry does not reserve result-panel space while the panel is hidden.

### 4. P2 — Returning to tile editing loses keyboard focus — fixed

**Locations:** `components/riichi/TileHandEntry.vue:18`; `pages/riichi-calculator.vue:1170–1177`.

“← Edit tiles” disappears when the stage changes. `scrollToTileDetails()` focuses the destination only when moving into stage 1. The reverse transition scrolls but does not restore focus. Browser inspection confirmed `document.activeElement` became `BODY`.

Returning to stage 0 now focuses the first available tile-edit action, with the tray as fallback, and scrolls it into view. The existing keyboard focus outline remains visible.

### 5. P2 — Quick-entry errors promise highlighting that does not exist — fixed

**Location:** `pages/riichi-calculator.vue:25–27,78–90`.

Reproduction: enter 1 han, leave Ron selected, choose 20 fu. The page correctly reports “20 fu is only possible on tsumo” and offers “Review hand value”. However, the result says “Review the highlighted hand value” while the select has no error styling, `aria-invalid`, or `aria-describedby` linking it to the message.

Quick-entry errors now set `aria-invalid`, point to the stable error message with `aria-describedby`, and add a visible error border. Impossible 20- and 25-fu choices are disabled for the current hand; an invalid restored value remains visible with its explanation. The tested 2-han 20-fu ron state was announced and visibly marked.

### 6. P2 — The navigation logo downloads a large multi-resolution ICO — fixed

**Locations:** `layouts/default.vue:7`; `assets/css/main.css:135`; `nuxt.config.ts:49`.

The 38 × 38 px brand image uses `/favicon.ico`, a **175,967-byte** file (171.8 KiB). It contains six images at 16, 32, 48, 64, 128 and 256 px. The browser reported a 256 × 256 intrinsic image for the logo.

This is larger than the entire initial Characters tile set before compression. A local gzip comparison still leaves the ICO at **109,689 bytes** (107.1 KiB), versus 47,530 bytes for those ten tile SVGs combined.

The mobile logo now uses a dedicated 114 × 114 WebP at **3,124 bytes** while rendering at 38 × 38 CSS pixels. The favicon keeps only its 16, 32, 48 and 64 px entries, preserved byte-for-byte, and is now **32,038 bytes**. Combined payload fell from 175,967 to **35,162 bytes** (80.0% smaller).

### 7. P2 — Tile SVGs contain substantial avoidable data — fixed

**Location:** `public/tiles/*.svg`.

All 37 files use `width="300"`, `height="400"`, `viewBox="0 0 300 400"`. They are vector artwork; these source dimensions are appropriate and do not create a raster-resolution problem. Changing 300 × 400 to 30 × 40 will not meaningfully reduce their path data.

The files retain Inkscape editor attributes, named views, unused definitions and excessive numeric/path data. A default SVGO trial, written only to a temporary directory, produced:

| Asset group | Existing bytes | Existing KiB | Local gzip KiB |
| --- | ---: | ---: | ---: |
| Characters, including red five: 10 files | 155,588 | 151.9 | 46.4 |
| Dots, including red five: 10 files | 224,558 | 219.3 | 29.9 |
| Bamboo, including red five: 10 files | 322,189 | 314.6 | 42.5 |
| Honours: 7 files | 79,373 | 77.5 | 23.2 |
| **Entire tile set** | **781,708** | **763.4** | **142.0** |
| **SVGO trial, entire set** | **304,689** | **297.5** | **46.0** |

The trial saves **61.0% uncompressed** and **67.6% with local gzip**. `Sou1.svg` is the largest original file at 60,885 bytes; the trial reduced it to 24,598 bytes.

The shipped SVGs were optimised with SVGO 4.1.0. All 37 retain the original 300 × 400 viewBox. File size fell 61.0% raw, from 781,708 to **304,689 bytes**. Local gzip estimates fell 67.6%, from 142.0 to **46.0 KiB**; these estimates are not observed GitHub Pages transfer sizes. Browser checks confirmed the white dragon remains intentionally blank against its CSS tile background, and sampled tiles load at their constrained dimensions.

### 8. P3 — Initial desktop entry reserves an empty result column — fixed

**Locations:** `pages/riichi-calculator.vue:10,1596–1598`.

On tile stage 0, `v-show` hides the result aside, but `grid-template-areas:"form result"` and its two columns remain. This persists independently of the accidental 700 px container limit. The empty column reduces the room available for the tray and suit picker at the stage with the most repetitive input.

Initial tile entry now uses a centred one-column layout capped at 920 px. The 1280 px browser check measured a 920 px form column with no empty result column.

### 9. P3 — The live score announcement omits who pays — fixed

**Location:** `pages/riichi-calculator.vue:1111–1119`.

The live message contains han, fu and the headline total. For tsumo it does not announce the dealer/non-dealer payment split; for pao it does not announce liability. Those details exist visually, but are central to the calculator's table-side purpose.

The live announcement now uses the existing concise result summary, including ron payer, tsumo splits, or pao liability. The text was checked in the accessibility tree; spoken output was not audited with a screen reader.

## Smaller improvements applied

- Guided entry now marks “Count from yaku” as selected and exposes its pressed state.
- Called-group and marker examples now render at 20 × 28 px; primary tile images reserve a 3:4 aspect ratio.
- Yaku category headings show filtered match counts during search.
- The completed tile count now says “ready for win details” before the winning tile is selected.
- Table rules disclose three-player tsumo and that riichi sticks are collected separately.
- The latest debounced edit is flushed on `pagehide` as well as component unmount.

## Performance assessment beyond images

The production calculator route chunk is **180.94 kB** (build-reported gzip 47.29 kB), and its CSS is **45.78 kB** (gzip about 7.6 kB). These are route assets, not total page transfer: Nuxt/Vue/shared layout code, fonts, images and request headers are additional. The largest unrelated collection chunk should not be attributed to this page merely because it exists in the build output.

Two targeted optimisations were applied:

1. `tileResult` reuses the structural scoring result for ordinary hands and calculates again only where pao liability changes the scoring input.
2. `RiichiTileHandEntry` mounts after session restoration only for tile mode, or when the visitor selects tile entry. Once mounted, `v-show` preserves its history and draft state across mode changes.
3. The route starts low-priority image requests for all 37 tile SVGs on mount, while the tile-entry component remains lazy. This adds about 305 kB of source SVG artwork (roughly 46 KiB in the prior local gzip estimate) to the route's eventual transfer so suit changes can reuse the browser cache.

Keep the active picker eager: delaying the essential tile artwork would hurt the task. Optimise files before introducing a sprite system, raster conversion or elaborate image-loading infrastructure. Repeated instances of the same external SVG URL are reusable resources, not 37 new downloads every time a tile is added.

## Validation and limits

- `npm run build`: passed after the fixes; output confirms the updated route chunk and CSS sizes above.
- The earlier review ran `npm test` with **84 passed, 0 failed**. The suite was not rerun for these presentation and asset changes.
- Browser checks after the fixes covered desktop at 1280 × 720 and mobile at 390 × 844 and 320 × 720. Measured the 920 px desktop entry column, mobile logo dimensions, 30 × 40 px winning-stage hand tiles, constrained face-up marker images, dynamic payment-panel spacing with zero overlap at 320 px, and visible quick-entry error feedback. Returned from win details and confirmed focus lands on the edit action.
- Switched from Characters to Bamboo and Honours; all ten bamboo images and all seven honour images were complete when displayed. Opened a five-han result breakdown and confirmed the fu section is omitted. Under five han, tile scoring still shows the fu breakdown when available; quick-entry breakdowns show the entered fu value without an inaccurate “fu does not affect this payment” note.
- Exercised entry into tile mode, a 14-tile sample hand and the win-details step. Manual post-fix checks did not cover every suit, ura markers, pao panel heights, backward-step focus, 320 px screens, or navigation to another route.
- Existing untracked session-related files were left untouched. Production code and assets were changed as listed above.
- No Lighthouse score, field Core Web Vitals, network throttling, physical touchscreen, browser pinch-zoom, or spoken screen-reader result is claimed.

The dynamic picker offset uses the result panel's measured height so it adapts to incomplete, ordinary and expanded result states. Further manual coverage can focus on ura/pao layouts, other routes, and screen-reader speech.

## Reference guidance

- [MDN: the image element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img) explains intrinsic dimensions and width/height space reservation.
- [W3C: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) provides the narrow-layout accessibility criterion relevant to clipped controls.
- [W3C: Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) explains why fixed content must not fully hide a focused control. The observed overlap warrants verification against that criterion; it is not a complete WCAG conformance audit.
