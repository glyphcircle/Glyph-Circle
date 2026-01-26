
-- 🔱 PUBLIC WRAPPER FOR PRIVATE LOGIC
-- Run this to allow the frontend to call 'rpc("check_is_admin")' safely.

-- 1. Create a safe public entry point
-- This calls the server-side logic 'private._is_admin_direct'
CREATE OR REPLACE FUNCTION public.check_is_admin() 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, private
AS $$
BEGIN
  -- We call the direct helper created by the Supabase AI
  -- This bypasses RLS on user_roles for the check itself.
  RETURN private._is_admin_direct(auth.uid());
EXCEPTION WHEN OTHERS THEN
  -- Fallback to JWT check if private function isn't reachable
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
END;
$$;

-- 2. Explicitly Grant access to the public wrapper
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;

-- 3. Cleanup: If there was a legacy 'is_admin' function causing issues, 
-- we can redirect it or drop it.
-- DROP FUNCTION IF EXISTS public.is_admin();
