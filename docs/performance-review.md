# Performance review · 27 October 2026

The clearest repeated work was in collection scrolling/searching and the site-wide fade-in plugin. The Riichi Open guide also loaded two libraries before visitors opened it. These paths have been improved without changing the site’s content or scoring rules.

## Changes made

| Area | Finding | Change |
| --- | --- | --- |
| Collection scrolling | `virtualState` returned a new object on every scroll frame. This invalidated `virtualGames` and recreated its array even when the rendered rows were identical. | Reuse the previous state when all row boundaries and spacer inputs are unchanged. Filters, history updates, and resizing still invalidate the appropriate computed values. |
| Collection search | Every query rebuilt searchable strings for all games and sorted the matching list again. | Index immutable catalogue fields once, cache each sort order, and filter those cached lists. |
| Fade-in animation | A global Vue mixin queried each updated component’s entire subtree, including overlapping ancestors. Typing and scrolling could repeatedly scan the same DOM. | Scan the body once, then batch scans of newly inserted element subtrees with a MutationObserver. Text-only changes do not trigger scans. Detaching elements or unmounting the app releases observers and queued frames. |
| Shared play history | Deep reactive proxies were created for rows that are only read and replaced as complete snapshots. | Store the snapshot in `shallowRef`; both consumers continue to react when the array is replaced. |
| Tournament guide | Marked and DOMPurify were bundled into the event page despite only being needed by the optional guide dialog. | Load both libraries alongside the guide request when it is opened. Keep the existing sanitation pipeline, loading state, and retry behavior; prevent duplicate concurrent loads. |

The computed-state and immutable-data changes follow [Vue’s performance guidance](https://vuejs.org/guide/best-practices/performance.html#computed-stability).

## Local measurements

| Check | Before | After |
| --- | ---: | ---: |
| Card-list invalidations during 100 one-pixel scroll updates within the same virtual window | 100 | 0 |
| 900 search updates over the real 342-game catalogue | 267 ms | 34 ms |
| Riichi Open page chunk, minified JavaScript | 109,894 bytes | 33,921 bytes |
| Same page chunk, gzip using Node’s default compression | 36,709 bytes | 11,308 bytes |

Search timings are the median of five local Node runs after warmup, using the original page from Git and the revised page compiled with Vue’s SFC compiler. Both produced the same result-count checksum. They measure computed/filter work, excluding DOM rendering and network time. They are not browser responsiveness or Core Web Vitals measurements.

Bundle sizes come from production client manifests and emitted files. The numbers above describe the page’s own chunk, excluding shared Nuxt/runtime chunks, CSS, and images. The parser and sanitizer remain available as separate dynamic chunks and are downloaded on the first guide open. That first open can therefore spend additional time downloading these libraries; the guide request and imports run in parallel.

## Validation

- `npm test`: 106 tests passed. The existing calculator rendering harness emits component-resolution warnings for the tutorial dialog outside Nuxt.
- New coverage checks virtual-window stability, row changes, filtering, play-history replacement, resizing, spacer geometry, animation insertion/removal/cleanup, the observer fallback, and guide loading/retry behavior.
- `npm run build`: passed after the final source changes.
- `git diff --check`: passed.

## Remaining opportunities, in priority order

1. **Reduce poster transfer size on Riichi Open.** The preview currently loads the full 2,108,489-byte PNG (`public/images/riichi-open/riichi-open-i-poster.png`). Add an appropriately sized compressed preview and reserve the full-resolution image for the poster dialog. Compare poster text legibility before choosing the final encoding. This asset is much larger than the JavaScript savings above.
2. **Prerender the public content that does not need a browser.** `nuxt.config.ts` sets `ssr: false`, so even the static home page initially sends an app shell and waits for JavaScript to render its content. Moving suitable public routes to rendered HTML should improve first content display. This requires a separate rendering migration: browser-only initialization and module-scoped state in composables need review before enabling server rendering.
3. **Pause live tournament polling while the tab is hidden.** The current 30-second interval keeps fetching the public summary in background tabs. Gate interval refreshes on visibility and refresh promptly when the tab becomes visible, while keeping hold expiry based on absolute timestamps.

Image savings, server-rendered output, and browser Web Vitals have not been measured in this review. The tutorial video already uses `preload="none"`, collection images already load lazily, and full game descriptions already use a dynamic import.
