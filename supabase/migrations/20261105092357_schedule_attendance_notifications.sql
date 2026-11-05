-- Install the hosted scheduler and prepare its worker job, initially inactive.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'attendance-notification-worker',
  '* * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'ATTENDANCE_FUNCTION_URL'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ATTENDANCE_WORKER_SECRET')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 20000
    );
  $$
);

select cron.alter_job(jobid, active := false)
from cron.job
where jobname = 'attendance-notification-worker';
