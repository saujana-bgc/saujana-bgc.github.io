-- Keep delivered and discarded job metadata for 30 days, then purge it daily.
select cron.schedule(
  'attendance-notification-retention',
  '0 3 * * *',
  'select public.attendance_notifications_purge();'
);
