REVOKE EXECUTE ON FUNCTION public.effective_plan(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.effective_plan(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.effective_plan(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.effective_plan(uuid) TO service_role;