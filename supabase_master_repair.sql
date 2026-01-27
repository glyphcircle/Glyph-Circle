
-- 🔱 GLYPH CIRCLE: MASTER SYSTEM REPAIR (V30)
-- 1. Cache Refresh (Fixes the 404 Errors)
NOTIFY pgrst, 'reload schema';

-- 2. Robust Startup Bundle (Handles missing data and correct table names)
CREATE OR REPLACE FUNCTION public.get_mystic_startup_bundle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'config', (SELECT COALESCE(jsonb_agg(c), '[]'::jsonb) FROM (SELECT * FROM public.config WHERE status = 'active') c),
        'ui_themes', (SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (SELECT * FROM public.ui_themes WHERE status = 'active') t),
        'featured_content', (SELECT COALESCE(jsonb_agg(fc), '[]'::jsonb) FROM (SELECT * FROM public.featured_content WHERE status = 'active') fc),
        'payment_providers', (SELECT COALESCE(jsonb_agg(pp), '[]'::jsonb) FROM (SELECT * FROM public.payment_providers WHERE status = 'active') pp),
        'payment_methods', (SELECT COALESCE(jsonb_agg(pm), '[]'::jsonb) FROM (SELECT * FROM public.payment_methods WHERE status = 'active') pm),
        'report_formats', (SELECT COALESCE(jsonb_agg(rf), '[]'::jsonb) FROM (SELECT * FROM public.report_formats WHERE status = 'active') rf),
        'services', (SELECT COALESCE(jsonb_agg(s), '[]'::jsonb) FROM (SELECT * FROM public.services WHERE status = 'active') s)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- 3. The Sovereign CRUD Proxy (Enables updates)
CREATE OR REPLACE FUNCTION public.update_records_batch(target_table text, updates jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  update_record jsonb;
  set_clause text;
  result_list jsonb := '[]'::jsonb;
  rows_affected integer;
  item_id text;
BEGIN
  -- Security clearance check
  IF NOT (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') THEN
    RAISE EXCEPTION 'Access Denied: Sovereign clearance required.';
  END IF;

  FOR update_record IN SELECT * FROM jsonb_array_elements(updates) LOOP
    item_id := update_record->>'id';
    
    SELECT string_agg(format('%I = %L', key, value), ', ')
    INTO set_clause
    FROM jsonb_each(update_record->'fields');

    IF set_clause IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.%I SET %s WHERE id::text = %L',
        target_table,
        set_clause,
        item_id
      );
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      result_list := result_list || jsonb_build_object('id', item_id, 'result', rows_affected > 0);
    END IF;
  END LOOP;
  RETURN result_list;
END;
$$;

-- 4. Registry Permissions
GRANT EXECUTE ON FUNCTION public.get_mystic_startup_bundle() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_records_batch(text, jsonb) TO authenticated;
