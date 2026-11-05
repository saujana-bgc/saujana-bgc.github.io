-- Attendance edits must never depend on an external notification service.
drop trigger if exists "attendee-webhook" on public.attendees;
drop function if exists public.send_attendance_webhook();
