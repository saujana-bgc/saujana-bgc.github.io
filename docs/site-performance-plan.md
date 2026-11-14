# Saujana site performance plan

Start with the mobile journey from Home to finding a gathering’s date, venue and sign-up. Apply the same checks to Riichi Open, Collection and Play History, where the largest assets or live data can delay the next action.

## 1. Establish a repeatable baseline

- Serve a fresh static build using the Node version in `.nvmrc`. Record the median of five cold-cache Lighthouse mobile runs per route and capture a DevTools network and performance trace. Record LCP and its element, CLS, transferred bytes by asset type, and main-thread time. Repeat the Home → Gatherings flow with a warm cache and time when the date and venue become visible. Use `?skipStats=1` when checking production, as described in [CODEX.md](../CODEX.md).
- Use the deployed HTML and response headers as the starting inventory. Home references a 1,052,642-byte hero, preloads 26 JavaScript modules totalling 180,610 response bytes and links a 28,730-byte gzip stylesheet. The Riichi Open preview references a 2,108,489-byte PNG. These are resource sizes and HTML hints. The browser waterfall will establish which resources are fetched when and what delays rendering.

## 2. Ship smaller images first

- **Home.** Add static responsive WebP variants with `srcset` and `sizes` matched to the layout. Use the existing visual refresh budget of 150 KiB for the mobile hero and 300 KiB for desktop as a starting point. Keep the hero discoverable in the prerendered HTML, preserve its dimensions and check the crop and legibility at 390 px and desktop widths. Use the same delivery approach for the photo chosen in the [visual refresh plan](visual-refresh-plan.md). [Home source](../pages/index.vue) · [LCP guidance](https://web.dev/articles/optimize-lcp)
- **Riichi Open.** Serve a responsive poster preview with an initial budget of 200 KiB, subject to a legibility check. Mount the full-resolution image when the visitor opens the dialog. Verify zero requests for the original before opening it and check loading, close and focus restoration. [Riichi Open source](../pages/riichi-open/index.vue)

## 3. Get live information on screen sooner

- **Gatherings.** Render dates, venues and directions as soon as the event response arrives. Give attendees their own loading and retry states so a roster error leaves event details visible. Fetch autocomplete names when the sign-up form opens and fetch past rosters on expansion. Keep direct event links, sign-up and editing working with slow or failed requests. [Gatherings source](../pages/gatherings.vue)
- **Home.** Measure time to the next date independently of LCP. If the post-hydration request is a material delay, test earlier fetching and short-lived reuse of the public next-event response. Reserve room for loading, populated and unavailable states. Use Kuala Lumpur’s date boundary when checking freshness. [Home query](../pages/index.vue#L143)
- **Collection and Play History.** Measure the cold path that loads play history in sequential 500-row batches. If it dominates, give Collection a compact per-game summary with play count and last-played date. For Play History, test loading recent complete sessions first and fetching older sessions or all-time statistics as needed. Verify date and game filters against the existing results and show “No plays logged” only after the data supports it. [Shared history loader](../composables/usePlaylogData.js)

## 4. Trim shared startup work and check for regressions

- Use traces and the build manifest to attribute preloaded modules and CSS. Prototype deferring mobile drawer content and optional dialogs if they account for meaningful startup work. Check keyboard navigation and verify that the first tap on Menu and the first action on each affected page respond promptly. The public pages already ship prerendered HTML. [Shared layout](../layouts/default.vue) · [Nuxt configuration](../nuxt.config.ts)
- Re-run the same measurements after each change. Record mobile LCP, CLS, image bytes and time to event details, and trace the first menu tap, collection search and poster open. Where field data is available, use mobile 75th-percentile targets of LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1. After the baseline is repeatable, add deterministic image and initial asset size budgets to CI. Run `npm test` and `npm run generate` before merging. [Core Web Vitals thresholds](https://web.dev/articles/vitals) · [CI workflow](../.github/workflows/ci.yml)
