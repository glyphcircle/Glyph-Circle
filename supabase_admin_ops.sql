
-- 🔱 ADMINISTRATIVE SECURE OPS
-- Run this in your Supabase SQL Editor.

-- 1. Identity Verification (JWT-based)
-- This is used by Edge Functions to verify the caller is an admin without table recursion.
CREATE OR REPLACE FUNCTION public.is_jwt_admin()
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as owner
STABLE
AS $$
BEGIN
  -- Check the 'role' claim in the JWT app_metadata
  -- This is set by your Auth Trigger or manually in the auth.users table
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' 
      OR (auth.jwt() ->> 'email') = 'master@glyphcircle.com'; -- Hardcoded fallback for emergency
END;
$$;

-- 2. Atomic Batch Update Engine
-- This function can update any table by ID using a service-role context.
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
  -- 🛡️ Only allow updates to public schema tables for safety
  IF target_table NOT IN ('services', 'store_items', 'config', 'image_assets', 'users', 'report_formats', 'gemstones', 'readings', 'transactions', 'feedback') THEN
    RAISE EXCEPTION 'Table % is protected or not registered for batch operations.', target_table;
  END IF;

  FOR update_record IN SELECT * FROM jsonb_array_elements(updates) LOOP
    item_id := update_record->>'id';
    
    -- Construct SET clause dynamically from 'fields' object
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

-- 3. Grant Permissions
GRANT EXECUTE ON FUNCTION public.is_jwt_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_records_batch(text, jsonb) TO authenticated;
