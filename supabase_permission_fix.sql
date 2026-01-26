
-- 🔱 PROTOCOL V28: THE FINAL RECURSION KILLER
-- Run this in your Supabase SQL Editor. 
-- It is designed to stop the "DB Hang" by separating the 'Check' from the 'Table'.

-- 1. Create a isolated private schema for security logic
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Create the Roles Table in the PRIVATE schema (No RLS allowed here)
CREATE TABLE IF NOT EXISTS private.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'seeker'
);

-- 3. Sync existing data to the loop-proof table
INSERT INTO private.user_roles (user_id, role)
SELECT id, role FROM public.users
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- 4. Create the "Direct" function that NEVER uses RLS
-- SECURITY DEFINER makes this run as the database owner, bypassing all loops.
CREATE OR REPLACE FUNCTION private._is_admin_direct(uid uuid) 
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = uid AND role = 'admin'
  );
$$;

-- 5. Update PUBLIC.USERS RLS (The most common cause of the hang)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin_Full_Control" ON public.users;
CREATE POLICY "Admin_Full_Control" ON public.users 
FOR ALL TO authenticated 
USING (private._is_admin_direct(auth.uid()));

DROP POLICY IF EXISTS "Users_View_Own" ON public.users;
CREATE POLICY "Users_View_Own" ON public.users 
FOR SELECT TO authenticated 
USING (auth.uid() = id);

-- 6. Update the Public RPC that the frontend calls
CREATE OR REPLACE FUNCTION public.check_is_admin() 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, private
AS $$
BEGIN
  RETURN private._is_admin_direct(auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_is_admin() TO anon, authenticated;

-- 7. Fix the Auth Sync Trigger to ensure JWT claims are always updated
CREATE OR REPLACE FUNCTION public.handle_role_sync() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = auth, public, private
AS $$
BEGIN
  -- Update the loop-proof table
  INSERT INTO private.user_roles (user_id, role)
  VALUES (NEW.id, NEW.role)
  ON CONFLICT (user_id) DO UPDATE SET role = NEW.role;

  -- Update the JWT Metadata
  UPDATE auth.users 
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    format('"%s"', NEW.role)::jsonb
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Re-attach the trigger
DROP TRIGGER IF EXISTS on_profile_role_update ON public.users;
CREATE TRIGGER on_profile_role_update
AFTER INSERT OR UPDATE OF role ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_role_sync();
