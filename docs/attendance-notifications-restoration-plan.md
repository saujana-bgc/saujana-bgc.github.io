# Restore attendance notifications

Plan dated 5 November 2026 for Supabase project `gjucszyfwcpsquirxooq`.

## Implementation status

Updated after execution on 5 November 2026.

- Production migrations `20261105092025_restore_attendance_notification_outbox`, `20261105092357_schedule_attendance_notifications` and `20261105092749_schedule_attendance_notification_retention` are applied. The attendee trigger is installed and both capture and delivery switches are enabled.
- Production has `pg_cron` 1.6.4. The `attendance-notification-worker` job is active every minute. A separate `attendance-notification-retention` job purges delivered/discarded records older than 30 days at 03:00 UTC daily.
- `attendance-notifications` Edge Function v1 is deployed with JWT verification disabled and its own shared-secret check. An unauthenticated request returned HTTP 401.
- The existing `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are reused. Following the user's request to restore delivery to the existing chat, a clearly labelled test was delivered successfully: Telegram message ID 748, outbox job `98ad78a4-f6ca-4ec7-94de-a5a1c5544c07`. No attendee row was changed for this test, and its payload was cleared after delivery.
- A fresh random `ATTENDANCE_WORKER_SECRET` is configured in Edge Function secrets and Vault, and Vault contains `ATTENDANCE_FUNCTION_URL`. An authorized empty worker run passed before the delivery test. No secret values were printed or written to repository files.
- Local SQL smoke checks passed for insert/update/no-op/delete capture, delete snapshots, anonymous access denial, disabled delivery, and the existing attendance, league and Riichi Open flows. All 140 app tests pass. Production migration dry run reports up to date.
- The old direct sender code and deployment entries were removed from `supabase/functions/`; the new worker preserves the message wording and emojis and sends plain text.

### Activation and pause controls

Production activation is complete. A previous setup command was rejected with “blocked by policy”; after the user confirmed they wanted the existing Telegram delivery restored, credential setup completed successfully without temporary secret files.

To resume after a deliberate pause, inspect the backlog first, then use `select public.attendance_notifications_set_switches(true, true);` and `select cron.alter_job(jobid, active := true) from cron.job where jobname = 'attendance-notification-worker';`.

To pause delivery, set the switches to `false` and deactivate only `attendance-notification-worker`. Pending jobs remain queued; retention can continue.

## Intended behavior

Restore Telegram notifications for inserts, meaningful updates and deletes on `public.attendees`. Preserve the existing gathering title/date, attendee name, ETA, amount spent, games and notes. Keep the existing attendance date policies.

The attendance transaction will write a durable notification job. A separate worker will contact Telegram after commit. Telegram outages, missing delivery credentials and rate limits must not reject attendance changes. The outbox write remains part of the database transaction, so an attendance change and its job commit together.

Start notification capture when the feature is enabled. Do not backfill changes made during the notification outage.

## State before implementation

- Attendance has no active notification trigger. The former hosted `attendance-update` sender was deleted.
- Formatting is preserved in `supabase/functions/attendance-update/index.ts`. The prepared `attendance-webhook` source validates a shared secret, but still sends directly from a supplied webhook payload; it needs to become a worker.
- Production has `pg_net` 0.20.3 and Vault 0.3.1. `pg_cron` is not enabled yet.
- The old notification function directories and config must be consolidated so local function discovery cannot accidentally serve a legacy sender.

## 1. Add the durable outbox and trigger

Create new Supabase CLI migrations; leave applied baseline/history files intact.

- Put the outbox and operational settings in a private, non-exposed schema. Explicitly revoke access from `PUBLIC`, `anon` and `authenticated`; enable RLS as defense in depth.
- Store a generated job ID, operation, attendee ID, gathering ID, timestamp, a minimal snapshot needed for the message, attempt count, next attempt time, lease expiry, status and delivery metadata.
- Snapshot gathering title/date and attendee details when enqueuing, so deletion or later edits cannot change an older message.
- Use an `AFTER INSERT OR UPDATE OR DELETE` trigger on `public.attendees`. Use `OLD` for deletions and skip updates when the notification fields have not changed. No HTTP requests or secret lookups belong in this trigger.
- Give the enqueue function a fixed empty search path, fully qualified references and only the privileges needed to insert jobs. Revoke public execution of privileged helpers explicitly.
- Add separate capture and delivery switches. Initial migrations leave capture and delivery disabled.

## 2. Build the sender worker

Rework the prepared handler as one `attendance-notifications` Edge Function. It should accept a wake-up request and fetch authorized jobs itself; callers must not supply arbitrary Telegram messages or destinations.

- Use `verify_jwt = false` with explicit validation of a dedicated shared secret in `x-webhook-secret`. Reject missing/invalid secrets before querying the database or Telegram.
- Claim a bounded batch through service-role-only RPCs using row locks and leases. Prevent overlapping workers from claiming the same job, and reclaim abandoned leases.
- Preserve ordering for each attendee: an update or deletion must wait for earlier jobs for that attendee to finish or be explicitly discarded. A failed job must not block unrelated attendees.
- Preserve the existing wording and emojis. Send plain text without Telegram Markdown parsing so names and notes containing underscores, brackets or asterisks cannot break delivery. Split messages that exceed Telegram's current message limit without dropping fields.
- Apply an HTTP timeout. Check Telegram's HTTP response and JSON `ok` value; store the returned message ID on success.
- Retry network errors and temporary server failures with backoff; honor Telegram's `retry_after` for rate limits. After a bounded number of attempts, mark the job failed for manual inspection/retry. Do not retry permanent validation errors indefinitely.
- Record job IDs and sanitized failure categories in logs. Keep message payloads and credentials out of logs. Remove successful payload snapshots promptly and purge old delivery records on a documented schedule.

Delivery is at least once. A crash after Telegram accepts a message but before the database acknowledges it can produce a duplicate. Stable job IDs and leases reduce duplicates but cannot guarantee exactly-once delivery through Telegram.

## 3. Provision credentials and scheduling

- Verify the existing `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` secret names and destination. Do not export their values into git or SQL files.
- Provision a dedicated `ATTENDANCE_WORKER_SECRET` in Edge Function secrets and Vault. Store the function URL in operational configuration; migration SQL contains secret names only.
- Enable `pg_cron`, then create a uniquely named, initially inactive job to invoke the worker through `pg_net` every minute. This gives normal delivery a delay of roughly a minute plus processing time. Include the worker secret from Vault at dispatch time.
- Missing configuration should leave jobs pending and produce a sanitized operational signal; it must not affect attendance writes.
- Secret provisioning was rejected by automatic approval review earlier in this chat. If it is rejected again during implementation, retain the disabled state and provide the exact manual setup steps before activation.

## 4. Verify locally

Use a mocked Telegram endpoint and fake attendance rows. Resolve the documented Windows port conflict with temporary free local ports when needed.

- Verify INSERT, real UPDATE, no-op UPDATE and DELETE capture; rollback must remove both the attendance change and its job.
- Verify anonymous attendance edits still obey the Kuala Lumpur date cutoff and cannot read or modify the outbox or invoke privileged queue RPCs.
- Verify missing/invalid authentication, missing credentials, timeouts, malformed Telegram responses, rate limits, retries, lease expiry and two competing workers.
- Verify per-attendee ordering, delete snapshots, text containing markup, long messages, pause/resume and manual retry.
- Run a fresh migration replay, compare effective grants with intended production permissions, and run the existing attendance/league/Riichi Open SQL smoke checks and relevant app tests.

## 5. Deploy and enable

1. Deploy outbox/settings/RPC migrations with capture and delivery disabled.
2. Provision credentials and deploy the worker; verify unauthorized requests are rejected and an authorized empty run makes no Telegram request.
3. Verify scheduling, grants, secret availability and the pause controls. Obtain explicit approval of the test destination before any synthetic Telegram message.
4. Enable capture and delivery, then activate the named cron job. Watch the first real attendance notification and confirm delivery acknowledgement.
5. Confirm the new migration ledger matches the repository and the migration dry run is clean. Record the worker version, job name and operational commands.

## 6. Pause and recovery

- Pause delivery by disabling its setting and cron job. Retain pending jobs and continue capture if desired. An in-flight Telegram request may finish during the pause.
- Resume pending jobs deliberately, with a backlog count and age check to avoid a burst of stale messages.
- Allow private inspection of failure counts, oldest pending age and delivery latency, plus manual retry/discard by job ID.
- For complete rollback, disable capture and delivery, deactivate only this cron job and drop only the new attendance trigger. Leave attendance tables, policies and user rows intact.
- Archive legacy sender code outside `supabase/functions/` once the new worker is active; preserve formatting history and remove obsolete deployment entries.

## Completion criteria

- New attendance changes produce the expected Telegram messages.
- External delivery failures do not reject attendance changes.
- Retries, ordering, authentication, pause/resume and effective database permissions are verified.
- Fresh database rebuilds reproduce the queue and trigger without live credentials or test messages.

## References

- [Supabase scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
- [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart)
- [pg_net behavior and limitations](https://supabase.com/docs/guides/database/extensions/pg_net)
