-- A restrictive policy ensures other permissive policies cannot bypass MFA.
CREATE POLICY "Birthday reads require MFA" ON public.birthday_greetings
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (COALESCE(((SELECT auth.jwt()) ->> 'aal'), 'aal1') = 'aal2');

CREATE POLICY "Clocktower photo access requires MFA" ON storage.objects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    bucket_id <> 'botc-session-photos'
    OR COALESCE(((SELECT auth.jwt()) ->> 'aal'), 'aal1') = 'aal2'
  )
  WITH CHECK (
    bucket_id <> 'botc-session-photos'
    OR COALESCE(((SELECT auth.jwt()) ->> 'aal'), 'aal1') = 'aal2'
  );

-- Visitor-name RPCs run as SECURITY DEFINER and need their own assurance check.
CREATE OR REPLACE FUNCTION public.get_recent_named_visitors()
RETURNS TABLE (name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT DISTINCT ON (lower(btrim(v.name))) btrim(v.name) AS name
  FROM public.visitors AS v
  WHERE COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'birthday_admin'
    AND COALESCE(((SELECT auth.jwt()) ->> 'aal'), 'aal1') = 'aal2'
    AND v.name IS NOT NULL AND btrim(v.name) <> ''
    AND v.visited_at >= ((now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date - 6)::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur'
    AND v.visited_at < (((now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date + 1)::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')
  ORDER BY lower(btrim(v.name)), v.visited_at DESC
$$;

CREATE OR REPLACE FUNCTION visitor_private.get_recent_named_visitors_by_date()
RETURNS TABLE (name text, visited_on date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH named_visits AS (
    SELECT regexp_replace(v.name, '^[[:space:]]+|[[:space:]]+$', '', 'g') AS name,
      (v.visited_at AT TIME ZONE 'Asia/Kuala_Lumpur')::date AS visited_on, v.visited_at, v.id
    FROM public.visitors AS v
    WHERE (SELECT auth.uid()) IS NOT NULL
      AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'birthday_admin'
      AND COALESCE(((SELECT auth.jwt()) ->> 'aal'), 'aal1') = 'aal2'
      AND v.name IS NOT NULL
      AND v.visited_at >= (((now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date - 6)::timestamp AT TIME ZONE 'Asia/Kuala_Lumpur')
      AND v.visited_at <= now()
  )
  SELECT DISTINCT ON (v.visited_on, lower(v.name)) v.name, v.visited_on
  FROM named_visits AS v WHERE v.name <> ''
  ORDER BY v.visited_on, lower(v.name), v.visited_at DESC, v.id DESC
$$;
