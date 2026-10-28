# Riichi Open browser production-readiness plan

Prepared 28 October 2026. Completed checks and their limits are recorded below; cases without recorded evidence remain untested. Earlier checks are recorded in `riichi-open-preannouncement-review-2026-10-28.md`.

## Execution record · 28 October 2026

This section records the safe local execution of selected journeys. The full release matrix remains incomplete.

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Automated suite | Pass | `npm test`: 132 passed, zero failed. |
| Production build | Pass | `npm run build`: complete; prerendered `/riichi-open` and `/admin/riichi-open`. |
| Live public registration page | Pass | Opened with `?skipStats=1`; registration open, one verified registration, zero active holds, 15 of 16 places free. No reservation submitted. |
| Live tournament guide | Pass | Guide and 18-section navigation loaded in browser. |
| Live organiser gate | Pass | Direct route showed common organiser sign-in; no login or private data was accessed. |
| Production database baseline | Pass, read-only | Registration stage/open, one capacity-counting registration, zero active holds, zero rounds, zero publications. No writes made by this execution. |
| Dedicated Supabase branch | Blocked | Connected account exposes only the production project and no existing branches. Branch creation reports that branching requires the Pro plan. |
| Local Supabase stack | Pass | Started the local Supabase stack after Docker became available. Local frontend and Edge Functions were pointed at `127.0.0.1`; synthetic writes were confined to the local database/storage. |
| Repeatable local browser setup | Pass after correction | The first generated app had an empty Supabase URL: PowerShell retained the quotes in CLI `--output env` values, so the browser posted `/functions/v1/...` to the static server, which returned 501. Trimming the quotes, rebuilding with the local API URL and publishable key, and opening a fresh browser tab loaded local registration details and 16/16 availability. Direct summary and CORS preflight also returned 200. No entrant or race fixture was created in this attempt. |
| Concurrent last-place browser check | Inconclusive | Reduced the local event capacity to four and seeded three synthetic active holds. One fresh browser tab claimed the last place; a second tab was an older context with stale saved hold state, so the two requests were not a valid independent race. A fresh tab then saw the event full. Read-only DB check showed 4 active holds for capacity 4 and zero registrations. This confirms the fixture counts and full state, but does not pass the synchronized race case; repeat with two fresh contexts and a request barrier. |
| Concurrent reservation endpoint check | Pass, API level only | With three synthetic holds against capacity four, two parallel calls to the public reservation function returned one 200 grant and one 400 full-capacity response. A database check showed capacity 4 and four active holds. This checks the server race but is not the planned synchronized browser race. |
| Reservation retry | Pass, same-key replay | Replaying the reservation request with the same token and idempotency key returned the same hold ID. The client response was read, so a dropped-response recovery case remains untested. |
| JPEG/PDF storage and finalisation | Pass, local API fixture | Synthetic JPEG and PDF bytes each received an upload grant, uploaded, and finalised successfully (200). Direct unsigned requests to both stored object paths returned 400. This was an API integration check; browser file selection, preview and open-in-new-tab behaviour remain untested. |
| Receipt grant validation | Pass, local API | JPEG, PNG and PDF grants at exactly 5 MiB returned 200; a 5 MiB + 1 byte file and a mismatched entrant token returned 400. |
| Anonymous organiser gateway check | Pass, local endpoint | A local request to the admin function without a JWT returned 401. |
| Local organiser JWT and app-role check | Pass, local production configuration | With normal JWT verification enabled and the local anon key in the `apikey` header, a synthetic user whose editable `user_metadata.role` claimed organiser access received 401 and no overview. A separate user with `app_metadata.role = birthday_admin` received 200 and an overview. This exercises the local gateway and function together; deployed-host verification remains a separate smoke check. |
| Lost finalisation response and retry | Pass, local API integration | Uploaded a synthetic JPEG, finalised it, discarded the first result as if the response were lost, then repeated finalisation. Both calls returned 200; status lookup returned the same pending registration ID and the retry returned a reference. Browser reload recovery after a dropped response remains untested. |
| Production DB logical backup | Pass with limits | Created verified logical dumps under `.data/supabase-backups/riichi-open-2026-10-28` (`schema-full.sql`, `data-full.sql`, `roles.sql`, `manifest.json`). SHA-256 hashes and restore caveats are recorded in the manifest. Storage object binaries are not included; schema/data dumps are separate, non-atomic calls; `pg_dump` noted circular Riichi Open foreign keys. This is a locally stored SQL backup, not a Supabase PITR/restore point. |
| Entrant hold → PNG receipt → organiser preview/note/verify → public status | Pass, local synthetic fixture | Empty-name validation, hold recovery on reload, PNG upload, pending status, private receipt preview, private note persistence, verification and one associated participant were exercised. The note did not appear publicly. A temporary local URL rewrite was needed because the local Edge Runtime emitted an internal `kong` hostname. JPEG/PDF and entrant-side post-verification refresh were not exercised. |
| Four-player full tournament | Pass, local synthetic fixture | Q1 and Q2, score validation, certification/publication, qualification standings and a four-way final tie were exercised. Public completion and seed-based ordering matched the fixture. |
| 16-player / four-table full tournament | Pass, local synthetic fixture | Sixteen synthetic entrants were checked in; Q1 and Q2 each used four tables and 16 saved scores; certification advanced the event through Final to Completed. A 30,000-each final tie produced four 0.0 results and seed-based 1st–4th places. Public refresh showed Completed, champion and final order. Q1/Q2 fixtures used tied table results, so this did not independently prove every exact snake-rank grouping. |
| Local cleanup | Pass | Ran `npx supabase db reset --local` with the temporary bootstrap migration present, then removed that migration, restored both Edge Function sources, reverted the generated `public/version.json` timestamp and stopped the Supabase stack. Synthetic local auth/database/storage data was cleared. |
| Simultaneous last-place reservations | Inconclusive; repeat required | A browser attempt was contaminated by a stale tab identity and did not use a synchronization barrier. It is not counted as a pass. |
| Physical Safari/iPhone/Android testing | Not run | No physical device run was performed. |

**Execution decision:** selected desktop Chromium journeys passed against local Supabase, with no production writes. The later repeat initially failed due to quoted CLI environment values in the local build script; trimming those values fixed the setup, and the public browser page then loaded local event and capacity data. The targeted fault/security/format cases have not yet been run. This is not production-readiness sign-off: interruption/concurrency, JPEG/PDF, access-denial, responsive/accessibility and physical-device cases remain untested. The local frontend used a generated static build because `npm run dev` repeatedly returned bundling/503 errors; any local signed-URL routing adapter or bootstrap migration is test scaffolding and must not ship.

## Next execution: close the remaining release gaps

This is the next work plan, not a record of additional passes. Execute the stages below in order. Any defect gets a focused fix, a regression check and a repeat of its affected browser journey. Track other unexecuted cases in Sections 3–6 separately; completing these targeted checks does not silently mark the broader matrix passed.

### A. Make the isolated test setup reproducible

1. Record the Git commit, working changes, generated frontend build hash, Edge Function hashes, applied migrations, CLI version and browser versions. When parsing `supabase status --output env` in PowerShell, trim the surrounding quotes from each value before setting Nuxt environment variables. Use the generated static frontend to match deployment; retain the earlier development-server bundling/503 issue as a separate tooling finding.
2. Start local Supabase with synthetic data only. Account for the missing historical `visitors` schema with documented, local-only bootstrap tooling in a disposable test workspace. Verify relevant schema, receipt bucket settings and authorisation match the deployed configuration.
3. Resolve the local internal `kong` signed-URL hostname through documented test infrastructure or supported runtime configuration. Keep release function sources intact; record any environment-only URL adapter and the remaining hosted-origin limitation.
4. Explicitly configure the frontend's local backend URL/key, then assert the observed API and upload hosts are local before every write suite. Configure organiser JWT verification as in production (`verify_jwt = true`); a run with global `--no-verify-jwt` cannot pass the production gateway checks.
5. Prepare independent entrant browser contexts A and B, organiser and ordinary-user accounts, and valid PNG/JPEG/PDF fixtures. Keep tokens out of saved evidence. Record baseline row and object counts and a cleanup manifest.
6. Add a narrowly scoped local fault harness using supported browser request interception, or a local proxy if interception is unavailable. It must be able to pause two requests at a barrier, fail selected requests and forward a request while dropping only its response. Confirm the intended server commit with a read-only database check. Merely toggling offline mode does not prove a post-commit lost response.

Deliverable: repeatable setup/reset commands, fixture manifest and a capability check for the fault harness. If any environment difference prevents a meaningful check, label that case blocked with the specific difference.

### B. Prove capacity and registration recovery

| ID | Fixture and exercise | Pass criteria |
| --- | --- | --- |
| CAP-1 | Seed 15 capacity-counting registrations and no active holds in a 16-place event. Synchronise A and B's actual `reserve` requests at a barrier, then release both. Reset and repeat ten independent races, alternating the release order. Keep the reservation network limiter from masking the race; exercise its limit separately. | Exactly one successful hold per race, one clear full-capacity response, and database usage exactly 16 throughout. Neither browser promises a second place. |
| CAP-2 | Drop the winning reservation response after the server commits; reload/retry the same identity. Release that hold, repeat release, then let the losing entrant retry. | Recovery returns the original hold/expiry; repeated release frees one place once; the other entrant can then claim it. Counts agree in both browsers and the database. |
| REC-1 | Fail before upload, during the storage request, after object storage succeeds but before `finalize`, and after `finalize` commits but before its response reaches the browser. At each boundary retry, reload and navigate away/back. | One recoverable registration and reference; no duplicate capacity or participant rows. Existing uploaded receipts remain usable. Account for every extra object and verify its supported cleanup path. |
| REC-2 | Double-submit/retry finalisation, then test hold expiry and registration closure between upload and finalisation. | Retries converge on the same registration. Late submissions follow the documented exception-review status and do not overbook or promise a guaranteed place. UI busy/error states clear and offer the correct next action. |
| REC-3 | Verify payment while the entrant page is open; exercise explicit refresh, the next foreground poll and returning from a background tab. | Entrant status becomes verified, the reference stays unchanged, and organiser/public counts agree. No duplicate participant is created. |

For each run save redacted request timing/status, the injected failure boundary, browser outcome and before/after database/object counts. A UI-only result cannot pass CAP-1 or the post-commit recovery cases.

### C. Prove access controls through the real endpoints

| ID | Exercise | Pass criteria |
| --- | --- | --- |
| SEC-1 | Anonymous, expired/invalid-token and ordinary signed-in callers request organiser overview, receipt URL and representative mutations. Also try user-editable metadata claiming the organiser role. | Gateway/application rejects access, returns no private overview or receipt grant and makes no database changes. Only the intended `app_metadata.role = birthday_admin` account succeeds. |
| SEC-2 | Use A's hold/registration IDs with B's token or a random token for status, receipt grant, cancellation, restart and finalisation. Attempt direct Data API/RPC access as anonymous and ordinary authenticated users. | No unauthorised state change, private response or receipt access. Responses do not expose another entrant's sensitive data. Public summary remains usable. |
| SEC-3 | Request a known receipt object without a signed grant; issue a legitimate organiser preview grant, then test a fresh uncached request after its 90-second expiry. Inspect public responses and organiser export. | Unsigned/expired access is denied, reopening as an authorised organiser works, and public/export responses omit private notes, receipt paths and credentials. An already issued URL may remain valid until expiry. |
| SEC-4 | Sign out with another organiser tab open; return to that tab and try a save or preview. Repeat a save with an expired session. | Private UI clears or gates appropriately on revalidation, unauthorised requests fail, and the UI accurately states whether edits saved and how to recover them. |

Run the Supabase auth/RLS/storage review alongside these endpoint checks. Static review or a hidden admin route alone cannot establish access denial.

### D. Finish receipt formats and practical usability

1. Complete entrant → upload → pending → organiser preview → private note → verify → entrant refresh separately for JPEG and PDF. PDF must have a working open-in-new-tab fallback. Recheck PNG on the same final candidate.
2. Exercise zero bytes, unsupported content, MIME/content mismatch, a valid file exactly 5,242,880 bytes and a file one byte larger. Rejected files must preserve a usable hold and clear recovery guidance; invalid content cannot complete registration. Remove/reselect and retry a failed upload.
3. Check registration, file selection, receipt preview, standings search, roster, score entry and certification dialogs at 360/390 CSS pixels, desktop width, landscape and 200% zoom. Verify keyboard focus, labels, dialog focus/close/return and status announcements. Record simulated viewport results separately from device results.
4. Run the entrant journey on physical iPhone/Safari and Android/Chrome when available, and desktop Firefox if installed. If devices are unavailable, leave these cases explicitly untested; do not claim mobile sign-off. Review any unsupported-browser limitation before choosing a launch verdict.

### E. Fix, rerun and decide

1. Prioritise any overbooking, lost/duplicate registration, private-data exposure, wrong score or unrecoverable saved work as a launch blocker. Fix the cause and add a focused meaningful regression test; run the relevant existing tests and a production build.
2. Repeat the affected fault/access case, then run one uninterrupted receipt-to-verification journey and a complete tournament on the final candidate. Include the remaining exact 16-rank snake-group, penalty/sticks, organiser conflict and export checks from Sections 4–5 before claiming full matrix completion.
3. Produce a case-by-case pass/fail/blocked/untested ledger with redacted evidence. Reconcile local rows, auth users and storage objects, clear test sessions, remove test scaffolding and stop the local services.
4. Give an explicit announcement recommendation. Approval requires all critical registration, recovery and security cases passing, no unresolved blocker, and named acceptance of any remaining browser/device limitations. Do not infer acceptance from missing devices or elapsed time.
5. After the candidate is deployed, confirm the deployed build/functions/migrations and run a read-only public smoke check for event details, capacity, guide, assets, CORS and organiser gate. Record any behaviour still dependent on the hosted environment.

## Objective and release decision

Prove that an entrant can reserve, submit a receipt and recover from interruptions; that an organiser can manage payments and complete the tournament; and that public information stays accurate throughout. Produce evidence for a release decision, including failures and anything that could not be exercised.

Release criteria:

- Every critical case below passes on the release candidate against the isolated backend.
- No unresolved defect involving lost registrations, duplicate submissions, overbooking, wrong scores/rankings, private-data exposure or unrecoverable organiser work.
- Receipt upload, private preview, verification and entrant status refresh work in one continuous browser journey.
- Both an ordinary tournament and the scoring/tie fixtures finish correctly.
- No unexplained browser errors or failed requests during the successful journeys.
- The deployed candidate passes the limited production smoke check after publication.
- Untested browsers, devices or failure modes are explicitly recorded as untested. A viewport simulation does not count as testing a physical phone or Safari.

## 1. Prepare an isolated environment

1. Identify the exact source revision to test and record the generated frontend build, function versions and database migration versions.
2. Use an existing dedicated test project or a development branch approved for any applicable cost. Match production migrations, Edge Functions, receipt-bucket privacy/MIME/size settings, auth roles and runtime configuration. Use synthetic identities and test-only receipts. Copy no real entrants, private notes or payment receipts.
3. Explicitly point the frontend at that test backend. Confirm the actual outgoing API/storage host before permitting any write. The default config points at production; localhost alone is insufficient. The event slug is fixed, so creating another event in the production database is not an isolation mechanism.
4. Confirm CORS and authentication on the test origin. Supply an organiser session with the same intended role and a normal signed-in account for access-denial checks. Credentials remain outside saved reports, screenshots and source files.
5. Use independent entrant sessions A and B and organiser tabs A and B. Check storage sharing when choosing contexts: opening another tab is not necessarily an independent identity.
6. Establish a baseline of event state, row counts and receipt object inventory. Prepare reset/cleanup scoped to the disposable environment. Keep manifests of generated records and uploads. Do not reset the real event or bulk-delete the real receipt bucket.
7. For production read-only visits, use `?skipStats=1` so checks do not increment visitor statistics.

## 2. First critical journey: entrant → receipt → organiser → public status

Run this before the broader matrix; stop and fix any failure before expanding coverage.

| Step | Browser action | Required result |
| --- | --- | --- |
| 1 | Entrant opens registration and enters a public name | Event details and capacity load; empty/whitespace names cannot proceed |
| 2 | Reserve a place; immediately try another click | One hold is created; availability drops by one; payment details and countdown are correct |
| 3 | Reload that tab and navigate away/back | The same hold returns with its original expiry; no new hold or extended timer |
| 4 | Select a valid test PNG and submit | Preview works; one receipt upload and registration succeed; reference and pending status appear |
| 5 | Reload entrant page | The same reference and pending status return; the public list contains one entry |
| 6 | Organiser signs in, opens receipt and saves a private note | Correct image is readable; note persists after reload and is absent from public responses/UI |
| 7 | Organiser verifies payment | One verified registration and one associated participant; no duplicate roster row |
| 8 | Entrant refreshes, then repeats using automatic polling/tab focus | Verified status appears and counts agree across entrant, organiser and public list |
| 9 | Repeat receipt journey with JPEG and PDF | Each accepted type uploads and previews correctly; PDF has a usable open-in-new-tab fallback |

Use files clearly labelled as test receipts. No money transfer is needed to test receipt processing.

## 3. Registration, storage and payment matrix

| Case | Required result |
| --- | --- |
| Names: empty, spaces, Unicode, apostrophes, 80 characters and longer input | Clear validation; accepted names render safely and consistently |
| No file, zero-byte file, unsupported format, valid file at 5 MiB, file over 5 MiB, misleading MIME/contents | Accepted boundaries work; rejected files explain recovery; invalid contents never create a completed registration |
| Remove/reselect receipt; retry after upload failure | Preview and selected filename stay consistent; retry completes the same registration once |
| Release unpaid reservation; repeat release after lost response | Capacity returns once and the browser can start again |
| Attempt release after receipt upload | Follow the server's receipt-protection rule; no misleading success or inaccessible payment |
| Expire a hold with the tab visible, backgrounded and suspended | Countdown catches up to absolute time; capacity is accurate on refresh |
| Submit a receipt after hold expiry or registration closure | Receipt enters the supported exception-review path; no guaranteed place is promised |
| Close/reopen the tab, use a new browser, clear storage | Establish actual recovery limits of session storage; no accidental account/identity sharing or false promise of durable recovery |
| Block storage; corrupt saved JSON; remove some saved fields | Public details remain available; recoverable credentials are preserved; unrecoverable local state has a clear next action |
| Close/reopen registration from organiser | Public controls and counts update; existing holds follow the documented expiry/late-payment rules |
| Clarification, rejection and cancellation | Entrant messaging and public-list inclusion agree with each status |
| Restart cancelled entry; reload mid-restart; release replacement; restart again | Correct linked reservation returns; old reference remains recoverable; released replacement is not reused |
| Try to reactivate original while replacement holds/uses capacity | Server rejects the conflicting claim; totals remain correct |

Measure that explicit refresh updates promptly and foreground polling updates by the next configured poll, allowing normal request latency. Hidden-tab polling should not create unnecessary requests; returning to the tab should refresh.

## 4. Interruptions and simultaneous use

Use browser/network tooling with supported request control, or controlled failures in the isolated environment. Record the method. Never claim a fault case passed merely because the page showed a generic error.

- Interrupt reservation after the server accepts it but before the response reaches the browser. Reconnect/reload and confirm the original hold is restored.
- Interrupt before upload, during upload, after upload but before finalisation, and after finalisation commits but before its response arrives. Every retry must converge to one registration and a usable reference. Inspect uploaded objects for leftovers.
- Fail summary refresh and guide loading. Verify last-known information is labelled appropriately, retry works and busy states clear.
- Start with one place remaining and synchronise reservations from two independent sessions. Exactly one obtains it. Verify the final database state as well as both browser messages. Ordinary rapid sequential clicks do not establish this case.
- Exercise the network reservation limit and idempotent retries. Four new holds per network window and a rejected fifth should match the configured rule; restoring an existing hold should not consume another slot. Check the practical experience for entrants sharing Wi-Fi.
- Edit the same participant and private note from two organiser tabs. Preserve newer saved data, preserve local edits and offer a clear conflict resolution.
- Edit a table in two organiser tabs, including rapid edits during an in-flight autosave. Verify revisions, recovery choices and the final saved values.
- Record a penalty while score saving fails. The penalty must not proceed on the failed flush; retry must not duplicate it.
- Expire the organiser session during a save and receipt preview. Reauthentication must lead to a clear, accurate result without silent data loss or duplicate mutations.
- Fail seating publication after preparation. The retry control must publish the same prepared round without generating another draw or stage.
- Repeat certification after a lost response. Verify the actual state before retrying: no duplicate publication or extra stage advancement; an already-certified response must be recoverable by reloading.

## 5. Full tournament rehearsal

Run a small four-player tournament first, then a 16-player tournament with four tables. Use the browser for organiser actions and an independent public viewer to observe every stage. Supplement UI evidence with read-only database checks. Set up additional fixtures only in the disposable backend.

1. Register/verify entrants and check them in. Verify first draw is unavailable with too few eligible checked-in players or a count not divisible by four. Include an unverified entrant, unchecked entrant, inactive entrant and substitute in focused eligibility fixtures.
2. Draw Qualifier 1. Every intended player appears once, every table has four distinct winds, and public seating matches organiser seating. The playing roster locks.
3. Enter incomplete, unbalanced, noninteger and non-100-point scores; attempt early certification. Invalid drafts cannot become certified. Then save every valid table and confirm draft scores stay private.
4. Record penalties and unclaimed sticks. Compare saved results and public certified totals against independent calculations, not only the UI preview.
5. Cancel the certification dialog, reopen it and certify. The whole round locks, one publication appears, and the next stage becomes available.
6. Prepare Qualifier 2. Rank using net scores and the published tie-breakers. With 16 ranked players, expected table groups are `{1,8,9,16}`, `{2,7,10,15}`, `{3,6,11,14}`, `{4,5,12,13}`; winds are random. Include a Q1 penalty that changes the table assignment.
7. Complete and certify Q2. Check qualification uses both rounds and qualifying penalties once. Substitutes/ineligible players cannot occupy a final place.
8. Include ties affecting Q2 tables and Top 4/seeds. A recorded random order must contain each tied player once and survive retries; do not assert a predetermined random order. Check it does not leak into public draw lists contrary to the guide.
9. Prepare the final. It has exactly the four eligible qualifiers, assigned one seat each, with qualification seeds retained. Scores restart from 30,000; qualifying scores/penalties do not carry into final scores.
10. Complete the final with a final-stage penalty and tied scores. Check champion, places 2–4 and seed-based tie-breaking, including an all-four tie. Certify and verify completed state and editing locks.
11. Search standings, reload a direct `?tab=standings` link and open from a fresh browser. Published seating/results and final standings must agree.
12. Download organiser export. Reconstruct named players, rounds, tables, results, sticks and penalties from exported IDs. Confirm private notes, receipt paths and access tokens are absent.

Independent scoring oracles:

| Raw points / sticks | Expected hanchan scores before penalties |
| --- | --- |
| 40,000 / 33,000 / 27,000 / 20,000; no sticks | +25.0 / +8.0 / −8.0 / −25.0 |
| 39,000 / 33,000 / 27,000 / 20,000; one unclaimed stick | +24.0 / +8.0 / −8.0 / −25.0; scores total −1.0 |
| 40,000 / 40,000 / 20,000 / 20,000; no sticks | +20.0 / +20.0 / −20.0 / −20.0; shared uma |
| 30,000 each; no sticks | 0.0 each; final finishing order follows qualification seeds |

A 30.0 tournament-point penalty subtracts from the relevant tournament total once, without changing raw points or placement uma.

## 6. Browser, usability and access checks

- Run the main entrant journey and organiser score entry on desktop Chromium. Repeat the entrant journey in Firefox and actual Safari/iPhone if available. Run physical Android Chrome receipt selection where available. Record missing devices as untested.
- Inspect narrow layouts around 360–390 CSS pixels and desktop width, landscape, 200% zoom and reduced motion. Check receipt chooser, PDF preview, standings, roster, score inputs, dialogs and errors.
- Use keyboard-only navigation: visible focus, labelled inputs, Enter/Space actions, dialog focus containment, Escape/close and return focus. Status/error messages must be announced without repeated polling noise.
- Verify poster, guide table of contents, external rule links, payment number/copy fallback, direct links, Back/Forward and reloads on the static host. Assess announcement preview metadata against the existing P3 finding.
- As anonymous and normal signed-in users, attempt admin routes and actions. Check both the visible gate and denied server request. A denied request must reveal no private overview.
- Use entrant A's browser with entrant B's hold ID and the wrong token. No receipt grant, cancellation, status details or restart should be authorised.
- Attempt to load a receipt directly without its signed grant. It stays private. Signed URLs may remain usable until expiry; do not assume sign-out revokes an already-issued URL. Check expiry and re-open behaviour against the configured policy.
- Sign out of admin and check other open admin tabs, navigation and pending responses. Cached private UI must not reappear as though the session remains valid.

## 7. Evidence, cleanup and production smoke

For each case record: ID, revision/build, backend, browser/device, initial fixture state, steps, expected result, actual result, pass/fail/blocked status, and relevant screenshot/console/request evidence. Redact tokens, signed receipt URLs and private payment material. Label checks supported only by database inspection or mocks; they are not browser passes.

For each failure record severity and reproduction, fix it, repeat that case and the affected journey. Run the existing automated tests/build for source fixes. Finish with a clean complete rehearsal on the final candidate, rather than assembling a pass from runs of different revisions.

Reset only the disposable environment and compare row/object inventories against its baseline. Verify no outstanding active holds, fixture receipts or leaked sessions remain. Identity sequence gaps are not fixture rows and need not be reset.

After the approved release is published, check the actual public route, details, capacity, guide, assets, standings, CORS and admin sign-in gate. Confirm the live build/functions/migrations are the tested versions. A production registration/upload smoke test, if required, must have a specifically agreed test identity and cleanup plan; it is separate from the isolated tournament rehearsal.

Final handover: concise release verdict, completed matrix, unresolved defects, untested cases, evidence locations, cleanup confirmation and exact tested/deployed versions.
