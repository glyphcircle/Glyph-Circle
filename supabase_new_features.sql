
-- 🔱 SANCTUM V10: THE NUCLEAR REDESIGN
-- This script WIPES the legacy schema and implements a recursion-impossible, 
-- high-performance architecture using JWT Claims and Vault Isolation.

BEGIN;

-- ---------------------------------------------------------
-- PART 0: THE PURGE
-- ---------------------------------------------------------
DROP TABLE IF EXISTS public.readings, public.transactions, public.store_items, public.services, public.system_config, public.ui_themes, public.image_assets, public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.handle_role_sync() CASCADE;

-- ---------------------------------------------------------
-- PART 1: IDENTITY (Loop-Proof via JWT Claims)
-- ---------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  role text DEFAULT 'seeker' CHECK (role IN ('seeker', 'sage', 'admin')),
  credits integer DEFAULT 50,
  currency text DEFAULT 'INR',
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- INDEXES for Snappy lookups
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- THE LOOP BREAKER FUNCTION
-- Checks the JWT Claim directly from memory. Never queries a table.
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------
-- PART 2: CONTENT & CONFIG (Handle everything from here)
-- ---------------------------------------------------------

CREATE TABLE public.system_config (
  key text PRIMARY KEY,
  value text,
  description text,
  status text DEFAULT 'active'
);

CREATE TABLE public.services (
  id text PRIMARY KEY,
  name text NOT NULL,
  price real DEFAULT 49,
  path text,
  image text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_services_active ON public.services(status) WHERE status = 'active';

CREATE TABLE public.readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id text REFERENCES public.services(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text,
  content text,
  meta_data jsonb DEFAULT '{}'::jsonb,
  is_favorite boolean DEFAULT false,
  timestamp timestamptz DEFAULT now()
);
CREATE INDEX idx_readings_user_ordered ON public.readings(user_id, timestamp DESC);
CREATE INDEX idx_readings_gin_meta ON public.readings USING GIN (meta_data jsonb_path_ops);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount real NOT NULL,
  currency text DEFAULT 'INR',
  status text DEFAULT 'pending',
  idempotency_key text UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.image_assets (
  id text PRIMARY KEY,
  name text,
  path text NOT NULL,
  tags text[],
  status text DEFAULT 'active'
);

-- ---------------------------------------------------------
-- PART 3: SECURITY PROTOCOLS (Hardened RLS)
-- ---------------------------------------------------------

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin_Full_Control" ON public.profiles FOR ALL USING (public.is_admin());
CREATE POLICY "User_Own_Profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public_View_Services" ON public.services FOR SELECT USING (status = 'active');
CREATE POLICY "Admin_Manage_Services" ON public.services FOR ALL USING (public.is_admin());

-- Config
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public_View_Config" ON public.system_config FOR SELECT USING (true);
CREATE POLICY "Admin_Manage_Config" ON public.system_config FOR ALL USING (public.is_admin());

-- Readings
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User_Own_Readings" ON public.readings FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------
-- PART 4: THE JWT SYNC ENGINE (Crucial for recursion fix)
-- ---------------------------------------------------------

-- Automatically pushes role updates into the auth.users metadata
-- so the JWT token contains the role for the RLS check.
CREATE OR REPLACE FUNCTION public.handle_role_sync() 
RETURNS trigger AS $$
BEGIN
  UPDATE auth.users 
  SET raw_app_metadata = jsonb_set(
    COALESCE(raw_app_metadata, '{}'::jsonb),
    '{role}',
    format('"%s"', NEW.role)::jsonb
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public;

CREATE TRIGGER on_profile_role_update
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_role_sync();

-- ---------------------------------------------------------
-- PART 5: SEEDING
-- ---------------------------------------------------------
INSERT INTO public.system_config (key, value, description) VALUES 
('app_title', 'Glyph Circle', 'The main brand title'),
('admin_gate_code', 'admin@admin', 'Master override code'),
('maintenance_mode', 'false', 'Global switch');

INSERT INTO public.services (id, name, price, path, status) VALUES 
('tarot', 'Imperial Tarot', 49, '/tarot', 'active'),
('astrology', 'Celestial Natal Chart', 99, '/astrology', 'active'),
('palmistry', 'AI Line Analysis', 49, '/palmistry', 'active');

COMMIT;
