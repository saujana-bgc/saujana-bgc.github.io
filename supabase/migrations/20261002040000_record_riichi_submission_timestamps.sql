-- Seeded historical results share one import timestamp, not their actual entry time.
-- Keep those records explicitly undated and timestamp future submissions via the column default.
alter table public.riichi_league_matches
  alter column submitted_at drop not null;

update public.riichi_league_matches
  set submitted_at = null;
