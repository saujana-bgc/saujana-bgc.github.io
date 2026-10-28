# Riichi Open pre-announcement review · 28 October 2026

No new functional launch blocker was reproduced in this pass. Public registration availability, the guide, standings navigation, organiser access controls and transactional reservation/restart checks passed. One minor sharing issue remains below.

## Findings

### P3 — Shared links receive generic site metadata

The live initial HTML at `/riichi-open/` contains the title `Saujana Board Game Community` and the site's general description. It contains no Open Graph or Twitter card tags. The event-specific `useHead` call updates the browser after JavaScript runs, but the site is generated with `ssr: false`, so that event metadata is absent from the generated HTML.

Link preview services that read the initial HTML may show a generic community preview without the event poster. This does not prevent registration. Event-specific metadata in the static route HTML would improve the announcement preview. No production code change was made for this cosmetic finding.

### Corrected regression-test expectation

The initial `npm test` run passed 129 of 130 tests. The failure expected a cancelled registration's saved confirmation to be removed after starting a replacement reservation. The latest recovery change intentionally keeps that confirmation so releasing the replacement can return to the previous cancellation and permit another attempt.

Updated that expectation and added two behaviour tests: releasing a replacement restores the old reference and creates a fresh idempotency key on the next attempt; reloading with both the old confirmation and a replacement hold resumes the replacement payment step.

## Verification

- `npm test`: **132 passed, zero failed**.
- `npm run generate`: passed; prerender output includes `/riichi-open` and `/admin/riichi-open`. Its generated version-file change was reverted after verification.
- `git diff --check`: passed.
- Live public summary: HTTP 200, registration open, capacity 16, one verified public registration, zero active holds, 15 places available. The allowed CORS origin matches the public site.
- Live browser: registration details, poster asset, tournament guide, standings tab and return-to-registration action work. Narrow mobile viewport inspection found no horizontal page overflow or broken images. Captured browser warning/error logs were empty.
- Direct organiser-page navigation presents the sign-in gate. An anonymous request to the organiser function returns HTTP 401.
- Deployed public function version 8 and organiser function version 7 match the respective repository source files. The recovery-chain migration is present on the deployed database.
- All 18 public-schema Riichi Open functions deny execution to `anon` and ordinary `authenticated` roles.

## Transactional database smoke test

Executed `tests/sql/riichi-open-launch-smoke.sql` against the connected project. It checks reservation and finalisation idempotency, capacity rejection, cancellation/restart/release/retry, recovery of a submitted restart, prevention of ancestor reactivation while a replacement holds or uses a place, expired-payment exception handling and rejection of a fifth reservation from one network fingerprint.

All assertions passed. A deliberately caught exception rolls back every fixture write; further assertions verify original hold, registration, participant and audit counts and event capacity. A follow-up query confirmed zero fixture registrations, one verified and one cancelled real registration, zero active holds, one active participant, zero rounds and zero publications.

The fixture calls finalisation directly with synthetic receipt metadata. It does **not** upload a storage object or test the Edge Function's file-validation boundary.

## Verification limits

No real receipt was submitted and no authenticated organiser browser session was available for payment preview, verification and public-status refresh as one continuous journey. Concurrent HTTP requests for the last place were not stress-tested. Browser link-preview rendering was not exercised in a messaging application; the sharing finding is based on the live initial HTML.

This pass changes tests and review documentation only. No site or Edge Function deployment is needed for those changes.
