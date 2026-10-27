# Riichi Open launch audit — 27 October 2026

This report records the findings from the pre-fix review on 27 October 2026. The six findings below have since been addressed in the local repository; the database migration and both Edge Functions are deployed. The event remains in registration with zero registrations, participants, rounds, publications and active holds.

Scope: `pages/admin/riichi-open.vue`, public registration and standings, shared admin authentication, tournament Edge Functions, database procedures, storage permissions and deployed backend versions.

## Findings

### 1. P1 — Qualifier 2 snake tables ignore penalties

Location: `supabase/migrations/20261015034420_create_riichi_open_i.sql:393` in `admin_prepare_riichi_open_round`.

The qualification tie check and published standings deduct penalties. The query that actually assigns Qualifier 2 tables ranks players by `sum(r.score)` without deducting their Qualifier 1 penalties. Consequently, the table draw can disagree with the certified standings and published event rules.

Reproduced against the deployed database in a transaction that was rolled back. With eight players and a 30-point penalty on the player who scored +27.3, the player belonged at Table 1 but was assigned Table 2. Two players had incorrect table assignments. Qualifier 1 raw-point fixtures were `[42300,35000,25000,17700]` and `[50000,33000,22000,15000]`.

Fix: use the same net score and tie-break metrics for standings, tie detection and snake assignment. Add a database regression test that includes penalties.

### 2. P1 — Anonymous holds have no application rate limit or bot check

Location: `supabase/functions/riichi-open-public/index.ts:28` and `reserve_riichi_open_place`.

Any caller can generate a fresh token and idempotency key repeatedly. There is no per-caller reservation limit, request throttling or verified challenge in the application. Sixteen distinct requests can occupy the entire event for the 30-minute hold duration; the same caller can repeat after expiry. The database capacity limit correctly prevents a seventeenth hold, but does not distinguish legitimate reservations from bulk holds. CORS does not prevent direct HTTP callers.

Evidence: reviewed the deployed public function and reservation procedure, and exercised the 16-place capacity boundary inside a rolled-back transaction. No live HTTP flooding was performed.

Fix: add server-enforced abuse protection before creating new holds while keeping authenticated restoration/idempotent retries available.

### 3. P2 — Private-note action is missing from the deployed admin function

Location: `pages/admin/riichi-open.vue:108`; local handler at `supabase/functions/riichi-open-admin/index.ts:60`.

The page calls `registration_note` to save a note without changing payment status. The local admin function implements this action, but deployed `riichi-open-admin` version 3 does not. A valid request to the deployed handler falls through to `Unknown organiser action.`

Evidence: compared the deployed function source retrieved through Supabase with the repository source. The deployed action list omits `registration_note`.

Fix: deploy the current admin function and verify saving a private note with an organiser session.

### 4. P2 — Roster reloads preserve stale, previously clean fields

Location: `pages/admin/riichi-open.vue:82` and `saveParticipant` at line 110.

`participantEdits[row.id] ??=` initialises each row only once. Later successful loads update `data.participants` but never refresh existing edit fields, even if the organiser has made no local changes. A change from another tab can therefore remain invisible, and pressing Save sends every stale field back to the server, overwriting the newer name, check-in or eligibility state. Server normalisation, such as disabling final eligibility for a substitute, also fails to update these controls.

Reproduced by compiling and executing the actual Vue page setup: after a second overview returned an updated name, checked-in state and final eligibility, the edit controls retained all three original values.

Fix: track saved participant values, refresh clean fields from the server, and protect conflicting edits rather than resubmitting an entire stale row.

### 5. P2 — Revision conflicts leave score entry stuck until a browser reload

Location: `pages/admin/riichi-open.vue:101` and `saveTable` at line 129.

After another tab saves a table or penalty, the server correctly rejects the old round revision. `act()` catches the error without loading the current overview. There is no reload control in the loaded workspace, so retrying continues sending the obsolete revision. A full browser reload is needed and discards unsaved work.

Reproduced through the actual page setup with a mocked revision-conflict response: zero overview requests followed the conflict, and the old draft revision remained in state.

Fix: provide an explicit conflict recovery action that reloads current revisions while preserving and reviewing local score edits.

### 6. P2 — Organiser export cannot map results back to players or rounds

Location: `supabase/functions/riichi-open-admin/index.ts:153`.

Exported results contain `participant_id`, `round_id` and `table_id`, but exported participants omit their IDs, and rounds/tables are not exported. The file therefore cannot independently identify which named player or hanchan a score belongs to. Penalties and unclaimed sticks are also omitted, so it cannot reconstruct the certified tournament totals.

Fix: export related IDs and round/table records, plus penalties, sticks and publication data needed to interpret the score history.

## Checks completed

- `npm test`: all 97 existing tests pass. These tests cover the calculator, not Riichi Open.
- `npx nuxt generate`: succeeds, including the public event and nested admin routes.
- Admin Vue template compiles without template errors.
- Live public summary returns HTTP 200 with the configured event and availability.
- Live registration and standings tabs render; direct admin access shows the sign-in gate.
- Anonymous access to the admin function returns HTTP 401.
- All 12 tournament tables have RLS enabled and no SELECT grant for anonymous or ordinary authenticated clients.
- All 12 tournament RPCs deny execution to anonymous and ordinary authenticated clients.
- Receipt bucket is private, limited to 5 MB, and allows JPEG, PNG and PDF.
- Deployed database integration fixture: reservation retry and finalisation retry return the same records; incomplete certification is blocked; eight players progress through Q1, Q2 and the final to completed; a four-way tied final is ordered by qualification seeds 1–4.
- Capacity fixture: the seventeenth place is rejected; an expired hold can be restored; late finalisation becomes a private `payment_exception`.
- Database fixtures deliberately raised a final exception to roll back all inserted records and event changes. Follow-up counts confirmed no test registrations, rounds or publications remained.

## Limits and remaining launch verification

No real payment or receipt was uploaded, and no authenticated organiser browser session was available. A complete browser journey covering receipt upload, organiser preview, verification and public status refresh therefore remains unverified. Database finalisation tests exercise the procedure after the storage-validation boundary; they do not establish that signed uploads and previews work end to end.

Concurrent last-place HTTP requests, mobile viewport layouts and the public random-draw workflow were not exercised. The database's event-row locking and permissions were reviewed, but the sequential capacity fixture is not a concurrency stress test.

## Remediation and verification

- Qualifier 2 rank and tie-check queries now deduct Qualifier 1 penalties before placing players in snake tables.
- New reservations are limited to four per network address per 30-minute window. Restoring an existing idempotency key does not consume another slot. The function returns HTTP 429 after the limit.
- Deployed `riichi-open-admin` includes the `registration_note` action.
- Roster edits now refresh clean fields, retain dirty fields, surface conflicting edits and require an explicit reload to discard local changes. Saves send only changed fields.
- A stale draft revision now reloads the round and presents explicit choices to keep local scores or use saved scores.
- Organiser exports now include linked IDs, round/table/seat data, unclaimed sticks and penalties while omitting receipt paths and private notes.
- The missing 21 October migration was applied with its finalizer updated to preserve the already-deployed idempotent retry behavior.
- Transactional database checks confirmed the fifth hold from one network is rejected, the same idempotency key returns the original hold, and the penalised Qualifier 2 test roster has zero table-assignment mismatches. All fixture rows were rolled back.
- `npm test` passes all 97 existing tests; `npx nuxt generate` succeeds; the page setup harness confirms roster conflict preservation and score-revision recovery.

The public static site has not been published from the changed repository yet. A real receipt upload and authenticated organiser browser smoke test remain outstanding.
