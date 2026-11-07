# Investigate missing visitor counts

Plan created 6 November 2026. Scope: diagnose why the footer visitor counts are absent, show dashes, or show incorrect numbers. Implementation is not part of this planning step.

## Evidence collected

- Production Supabase is responding: the same public API key and headers used by the app returned HTTP 200 for both count RPCs. At the check, `get_daily_visitor_count` returned 22 and `get_total_unique_visitors` returned 585. The database held 1,885 visit rows and had recent inserts.
- Anonymous users can execute both aggregate RPCs and insert visits. Direct anonymous SELECT on visitor rows remains denied as intended. No visitor names or identifiers were exported.
- The Supabase health advisor returned no findings.
- `components/VisitorCounter.vue` displays dashes until `useVisitorStats` supplies data.
- `composables/useVisitorStats.js` exits before reading counts on localhost, when `?skipStats=1` is present, or when the persistent `saujana_skip_visitor_stats` flag is set. These conditions therefore disable both recording and display loading. This is a confirmed code path, but the affected browser's flag has not been inspected.
- Some localStorage calls are unguarded. A storage exception rejects the load, and the shared `loadPromise` is never reset for retry. RPC errors are ignored and converted to zeros that can be cached for an hour. These are confirmed error-handling gaps; occurrence in the affected browser is unconfirmed.
- `layouts/default.vue` mounts the counter only when the footer is within 300px of the viewport. Its observer is installed once on layout mount. Starting on an admin route, where the footer does not exist, and then navigating to a public page may leave the counter unmounted; reproduce this before treating it as the cause.
- Plain HTTP fetching of the live home page succeeds. Its static HTML does not contain the counter, consistent with the current client-only design; this alone does not establish a rendering failure.

No live visit was inserted during this investigation. The existing unrelated change in `assets/css/main.css` is outside this work.

## 1. Establish the visible symptom

Record the affected route and browser, then distinguish:

- Entire Visits row absent: inspect mounting, footer visibility, lazy component loading and hydration errors.
- Dashes: inspect the tracking opt-out, storage exceptions and requests that never finish.
- Zeros or stale numbers: inspect failed aggregate requests, cached error values and cache age/day.

Use a browser with visitor tracking disabled for all live inspection, as required by `CODEX.md`. Do not clear the live opt-out to reproduce a write. Mock or intercept all visitor INSERT requests when testing tracking behaviour.

## 2. Reproduce the frontend paths

Use local fake API responses and controlled browser storage; use the production aggregate RPCs only for read-only comparison.

1. Scroll a public page to the footer and confirm that the counter mounts, the two count requests run, and known mocked counts render.
2. Repeat with the persistent opt-out flag and `?skipStats=1`; confirm whether the observed symptom matches the affected browser.
3. Simulate localStorage throwing during ID, last-visit and name reads; inspect the console and whether count requests still run.
4. Simulate one or both RPCs failing, then recovering. Verify that an error does not become a displayed/cached zero and that loading can retry.
5. Start on an admin route, navigate to a public route, and scroll to the footer. Also check direct public loads, page navigation and browsers without IntersectionObserver.
6. Check a cache saved before Kuala Lumpur midnight, an expired cache, malformed cache data, and repeat page visits. Compare the deployed client bundle with the current repository if behaviour differs.

## 3. Choose the smallest supported fix

Apply changes only after reproducing the cause:

- Separate recording from reading: the opt-out must prevent visitor INSERTs while allowing aggregate counts to display, including on localhost.
- Isolate browser storage and visit-recording failures from count loading. Handle unavailable storage without preventing the aggregate requests.
- Preserve errors as errors, retain a valid previous count when possible, and permit retry. Cache only valid successful results; make daily cache validity aware of the Kuala Lumpur date.
- If route reproduction confirms the observer issue, bind/disconnect the footer observer as the footer appears and the layout changes, or simplify mounting without reintroducing visitor writes during tests.
- If a deployed asset differs, fix the deployment/cache problem before changing working source logic.

Do not weaken visitor table privacy or broaden RLS/grants: production's aggregate read path already works.

## 4. Verify and deploy the selected fix

- Add focused tests for the reproduced failure and the separation between recording and display, using fake counts and a blocked/mock INSERT path.
- Verify admin-to-public navigation if that path is changed.
- Run relevant tests and static generation/SEO checks under the project's pinned Node/npm versions.
- Deploy through the existing GitHub Pages workflow when implementation is authorized. Inspect the live page with `?skipStats=1`, confirm visible counts and successful aggregate requests, and confirm no visitor INSERT was sent by the inspection browser.

## Completion criteria

- Public footer counts render with tracking opted out and with storage unavailable.
- A real zero is distinguishable from loading/failure; temporary failures can recover without a full browser restart.
- Normal public navigation reliably mounts the counter.
- Existing visitor data remains private, and testing does not inflate production counts.

## Intended count meaning

The current daily RPC counts visit rows for the Kuala Lumpur day; the all-time RPC counts distinct visitor IDs. Confirm these existing meanings are intended before changing labels or aggregate definitions. Counting methodology is separate from the display failure.
