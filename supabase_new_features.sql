
-- 🌿 1. AYURVEDA: Dosha Profiles
CREATE TABLE IF NOT EXISTS public.dosha_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vata INTEGER,
    pitta INTEGER,
    kapha INTEGER,
    type TEXT, -- e.g., 'Vata-Pitta'
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dosha_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dosha" ON public.dosha_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save dosha" ON public.dosha_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update dosha" ON public.dosha_profiles
    FOR UPDATE USING (auth.uid() = user_id);


-- 🌙 2. MOON JOURNAL: Mood Tracking
CREATE TABLE IF NOT EXISTS public.mood_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    mood TEXT,
    moon_phase TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mood entries" ON public.mood_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can log mood" ON public.mood_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 🔭 3. COSMIC SYNC: Synastry Reports
CREATE TABLE IF NOT EXISTS public.synastry_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_name TEXT,
    compatibility_score INTEGER,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.synastry_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own synastry" ON public.synastry_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save synastry" ON public.synastry_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);
