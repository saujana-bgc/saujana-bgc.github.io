# Supabase production alignment

Execution record updated 5 November 2026. Production project: `gjucszyfwcpsquirxooq`.

## Completed

### Attendance notifications paused

- Removed the `attendee-webhook` trigger and its trigger function from production. No attendee notification trigger remains.
- Deleted the hosted `attendance-update` function after preserving its source locally. Disabled `attendance-update` and `attendance-webhook` in local Supabase config; `attendance-webhook` has not been deployed.
- Confirmed there were zero queued `pg_net` requests at the time of the check. Other queues were not changed.
- Attendance policies remain enabled and use the Kuala Lumpur date cutoff. Local rollback-only SQL verifies anon sign-up, edit and delete continue to work without a notification trigger.
- Core hosted functions remain active: `public-gatherings` v2, `riichi-open-public` v13 and `riichi-open-admin` v8. The public function update preserves a receipt when confirmation is uncertain.

### Reproducible database baseline

- Added `supabase/migrations/20261105061903_production_schema_baseline.sql` from a schema-only production dump captured after notifications were paused. It contains 25 public tables and 27 functions, with no production row data, copied sequence values, attendance notification references or credentials.
- Moved the 22 historical migration files to `supabase/migrations_archive/`. Those original version IDs were marked reverted in the production migration ledger without rolling back their schema effects. The baseline version was marked applied because it snapshots the schema already present in production.
- Added `supabase/migrations/20261105084810_restore_storage_bucket_setup.sql` for both required buckets and the albums read policy; applied it to production. `supabase/seed.sql` now contains only clearly fake local event, Riichi Open and league fixtures. No attendee, birthday, receipt or registration rows were exported.
- Added `supabase/migrations/20261105085722_seed_riichi_open_event_configuration.sql` to create the required public event on fresh deployments while leaving an existing event untouched. The local seed replaces that row with fake development details. Applied to production.
- Normalized Supabase's local default ACLs in the baseline before restoring the production grants. Verified organiser RPCs and private table access are denied to `anon` and `authenticated` locally, matching production.
- Added `20261105062657_harden_function_search_paths_and_birthday_rls.sql`; it pins `enforce_riichi_capacity()` to an empty search path and wraps `auth.jwt()` in a scalar subquery in the birthday admin policy. Applied to production.
- Production now has the baseline, hardening, storage setup and event configuration migration versions in its ledger, matching the local migration directory. The production migration dry run reports up to date.

### Verification

- Clean local replay succeeds with the baseline, hardening and storage setup migration plus fake seed fixtures. A Windows reserved-port conflict can prevent the local Supabase Edge Runtime health check on port 54321; the database replay completed on a temporary local database port.
- `tests/sql/riichi-open-launch-smoke.sql` passes: reservation and finalisation retries, cancelled-registration recovery, capacity, rate-limit and expired-hold cases. All writes roll back.
- `tests/sql/attendance-write-smoke.sql` passes for attendee insert, update and delete as `anon`; all writes roll back.
- `tests/sql/security-and-league-smoke.sql` passes: non-admin birthday reads are hidden, `birthday_admin` can read, and public league submission works; all writes roll back.
- Production receipt check found 7 active registration receipt references and all 7 referenced storage objects. The event has 7 active registrations against capacity 16 and no active holds.
- Production Supabase advisor no longer reports mutable search path for `enforce_riichi_capacity()` or the birthday JWT init-plan warning.
- Under Node `26.13.0` and npm `12.2.2` (the versions pinned by `.nvmrc` and CI), `npm test` passed all 136 tests. `npm run generate` passed static generation and SEO checks (8 public pages).

## Remaining advisories and accepted behavior

- Supabase still warns about eight callable `SECURITY DEFINER` RPCs. The app intentionally uses them for public league submission/edit/deletion, attendance counts, confirmed attendee names and visitor aggregates. Their grants are preserved because revoking them would break current public flows. Revisit these routes if the product adds authentication.
- Thirteen Riichi Open tables have RLS enabled with no direct client policies; they are accessed through the service-role Edge Functions. Keep this restriction.
- Supabase reports 20 unindexed foreign keys as informational findings. No indexes were added without workload evidence.
- Leaked-password protection remains disabled in Supabase Auth and needs a dashboard configuration decision.
- The handler recovery tests cover lost responses, failed/empty confirmation lookups and competing receipt paths. They do not simulate simultaneous PostgreSQL transactions against real Storage uploads.

## Recreate attendance notifications later

Notifications remain paused by choice. Rebuild them independently from attendance writes:

1. Add a transactional outbox with stable event IDs and retry state.
2. Add an authenticated sender that consumes the outbox after commit; delivery failures must not block attendance writes.
3. Provision credentials in approved secret stores before enabling delivery. Keep secret values out of git and migration SQL.
4. Test formatting, authentication, retries, timeout handling, rate limits and duplicate delivery against a mocked Telegram service.
5. Deploy and verify the sender, then enable the worker. Use a real destination only when explicitly approved.
6. Keep a pause switch that stops delivery while retaining pending work.
