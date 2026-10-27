# Riichi Open public-flow review · 27 October 2026

This pass reviewed public registration, saved reservation recovery, receipt submission, status refresh, standings, and the associated public Edge Function. The findings below are fixed in the local repository.

## Findings and fixes

### P2 — A failed availability query advertised extra places

The summary handler discarded the error from its active-hold count and returned `active_holds: 0`. When that query failed while the other queries succeeded, the page could display places as available even though active reservations occupied them. Database reservation limits still enforced capacity, but the public availability was misleading.

The handler now rejects the summary if either the registration query or hold-count query fails. Regression tests execute the actual handler with successful zero/nonzero counts and a failed count query.

### P2 — Saved reservation recovery could leave no usable next action

A saved hold with its ID and ownership token but no idempotency key failed validation before the release option was enabled. Release also read only the hold key while restoration accepted a draft fallback. Malformed saved JSON left users with an ineffective restore button and no way to clear unrecoverable details.

Recovery now evaluates release credentials separately from restore credentials, releases from the same saved source, and offers an explicit local reset when neither action is possible. Network failures preserve valid credentials and do not offer that reset. The reset explains that an existing reservation will expire and directs entrants who have already paid to the organiser. Successful draft restoration saves the hold before removing the obsolete draft.

### P2 — Navigation during initial loading could leave polling running

The async mount callback installed its refresh interval and focus listener after awaiting initial requests. If the page unmounted during a request, cleanup ran before those resources existed; the resumed callback then installed them on the abandoned page.

A disposal guard now prevents that late setup. Polling also skips hidden tabs, and visibility/focus refreshes update the absolute-time countdown immediately. Regression coverage exercises unmounting during a pending summary, background polling, visible-tab recovery, and cleanup.

### P2 — Blocked browser storage prevented public details from loading

Startup read session storage before requesting the public summary. If browser policy denied storage access, error cleanup could throw as well and stop initialization, leaving event details and standings unavailable.

Storage failures are now isolated from public initialization. Availability and standings still load, while registration explains that storage must be enabled or another browser used. Reservation submission is blocked in that state so no inaccessible reservation is created.

### P3 — Redundant reservation requests and empty receipts

`reservePlace` did not guard against an already active operation, so repeated submissions could send multiple requests. Server idempotency protected the reservation record, but the requests and local completion work were duplicated. Empty files with an accepted MIME type also passed client checks and failed only at the server.

The page now ignores repeat submissions while busy and rejects zero-byte receipts before upload.

## Validation and deployment

- Twelve new regression tests cover the public page and handler. Nine cases failed against the original implementation in the initial regression run; the browser-storage check was added with its fix.
- `npm test`: all 118 tests pass.
- `npm run build`: passes, including the Riichi Open route.
- `git diff --check`: passes.

Tests use the compiled Vue page and actual Edge Function handler with mocked browser storage, network, and database responses. A real signed receipt upload and authenticated organiser review remain outside this verification.

The source changes are local. The public site must be published and `riichi-open-public` deployed for the corresponding fixes to reach visitors. No database migration is needed.
