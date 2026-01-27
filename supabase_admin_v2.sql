
-- 🔱 GLYPH CIRCLE: ADMINISTRATIVE COMMAND & CONTROL (V2)
-- Run this in your Supabase SQL Editor.

-- 1. Identity Verification (JWT-based)
CREATE OR REPLACE FUNCTION public.is_jwt_admin()
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' 
      OR (auth.jwt() ->> 'email') = 'master@glyphcircle.com';
END;
$$;

-- 2. Performance Bundle (Fixes the 404 error)
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
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 3. The Batch Update Engine (The CRUD Powerhouse)
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
  -- 🛡️ Security Check
  IF NOT public.is_jwt_admin() THEN
    RAISE EXCEPTION 'Access Denied: Sovereign clearance required.';
  END IF;

  FOR update_record IN SELECT * FROM jsonb_array_elements(updates) LOOP
    item_id := update_record->>'id';
    
    -- Dynamically build the update clause from 'fields'
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
      
      result_list := result_list || jsonb_build_object(
        'id', item_id,
        'result', rows_affected > 0,
        'status', CASE WHEN rows_affected > 0 THEN 'updated' ELSE 'not_found' END
      );
    END IF;
  END LOOP;

  RETURN result_list;
END;
$$;

-- 4. Permissions
GRANT EXECUTE ON FUNCTION public.is_jwt_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_mystic_startup_bundle() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_records_batch(text, jsonb) TO authenticated;
