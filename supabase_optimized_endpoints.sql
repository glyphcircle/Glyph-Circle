
-- 🔱 PERFORMANCE PROTOCOL V4
-- Run this in Supabase SQL Editor to enable bundled fetching.

BEGIN;

-- 1. Optimized Service View (Joins Images)
CREATE OR REPLACE VIEW public.vw_services_full AS
SELECT 
    s.*,
    ia.path as resolved_image_path,
    ia.tags as image_tags
FROM public.services s
LEFT JOIN public.image_assets ia ON ia.id = s.image;

-- 2. Optimized Store View (Joins Images + Logic)
CREATE OR REPLACE VIEW public.vw_store_full AS
SELECT 
    si.*,
    ia.path as resolved_image_path,
    CASE WHEN si.stock < 5 THEN true ELSE false END as is_low_stock
FROM public.store_items si
LEFT JOIN public.image_assets ia ON ia.id = si.image_url;

-- 3. THE MASTER STARTUP BUNDLE (Atomic Fetch)
-- Fetches all static/config data in a single network round-trip.
CREATE OR REPLACE FUNCTION public.get_mystic_startup_bundle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'config', (SELECT jsonb_agg(c) FROM (SELECT * FROM public.config WHERE status = 'active') c),
        'ui_themes', (SELECT jsonb_agg(t) FROM (SELECT * FROM public.ui_themes WHERE status = 'active') t),
        'featured_content', (SELECT jsonb_agg(fc) FROM (SELECT * FROM public.featured_content WHERE status = 'active') fc),
        'payment_providers', (SELECT jsonb_agg(pp) FROM (SELECT * FROM public.payment_providers WHERE status = 'active') pp),
        'payment_methods', (SELECT jsonb_agg(pm) FROM (SELECT * FROM public.payment_methods WHERE status = 'active') pm),
        'report_formats', (SELECT jsonb_agg(rf) FROM (SELECT * FROM public.report_formats WHERE status = 'active') rf)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_mystic_startup_bundle() TO anon, authenticated;

COMMIT;
