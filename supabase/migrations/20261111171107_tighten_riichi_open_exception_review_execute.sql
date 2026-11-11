REVOKE ALL ON FUNCTION public.admin_review_riichi_open_payment_exception(uuid,text,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_riichi_open_payment_exception(uuid,text,text,uuid)
  TO service_role;
