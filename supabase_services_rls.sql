-- 🔱 PROTOCOL V30: SECURE OFFERINGS RLS
-- Run this in Supabase SQL Editor to authorize Admin CRUD

BEGIN;

-- 1. Reset RLS on services
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 2. Clean existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.services;
DROP POLICY IF EXISTS "Admin full access" ON public.services;
DROP POLICY IF EXISTS "Public_View_Services" ON public.services;
DROP POLICY IF EXISTS "Admin_Manage_Services" ON public.services;

-- 3. Policy: PUBLIC READ (Active services only)
CREATE POLICY "Public_View_Services" 
ON public.services 
FOR SELECT 
USING (status = 'active');

-- 4. Policy: ADMIN CRUD (Uses JWT metadata to avoid table recursion/hangs)
CREATE POLICY "Admin_Sovereign_CRUD" 
ON public.services 
FOR ALL 
TO authenticated 
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' 
  OR (auth.jwt() ->> 'email') IN ('master@glyphcircle.com', 'admin@glyphcircle.com')
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- 5. Notify PostgREST to refresh cache
NOTIFY pgrst, 'reload schema';

COMMIT;

-- 🧪 TEST SCRIPT (Run manually in SQL editor)
-- INSERT INTO public.services (id, name, status, price) VALUES (gen_random_uuid(), 'test-ritual', 'active', 108);
-- SELECT * FROM public.services WHERE name = 'test-ritual';
