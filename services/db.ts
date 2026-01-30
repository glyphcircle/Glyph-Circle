import { supabase } from './supabaseClient';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'seeker' | 'admin';
  credits: number;
  currency: string;
  status: 'active' | 'inactive';
  created_at: string;
  gamification?: {
    karma: number;
    streak: number;
    readingsCount: number;
    unlockedSigils: string[];
  };
}

export interface Reading {
  id: string;
  user_id: string;
  type: 'tarot' | 'palmistry' | 'astrology' | 'numerology' | 'face-reading' | 'remedy' | 'matchmaking' | 'dream-analysis';
  title: string;
  subtitle?: string;
  content: string;
  image_url?: string;
  is_favorite?: boolean;
  timestamp: string;
  created_at: string;
  meta_data?: any;
}

export class SupabaseDatabase {
  async getAll(table: string) {
    console.log(`📡 [DB] Fetching all from: ${table}`);
    if (!supabase) throw new Error("Supabase is not defined.");
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return data || [];
  }

  async updateEntry(table: string, id: string | number, updates: any) {
    console.log('📡 [DB] PATCH START', { tableName: table, id, updatesKeys: Object.keys(updates) });

    if (!supabase) {
      console.error('❌ CRITICAL: supabase UNDEFINED');
      throw new Error('Supabase missing');
    }

    try {
      // ✅ CLEAN CALL - No .timeout(), no .throwOnError()
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select();

      if (error) {
        console.error('🚨 [DB] RLS ERROR:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error(`No records updated for ID: ${id}`);
      }

      console.log('✅ [DB] PATCH SUCCESS:', data[0]?.id || id);
      return data;

    } catch (error: any) {
      console.error('💥 [DB] PATCH FAILED:', error.message || error);
      throw error;
    }
  }


  async createEntry(table: string, payload: any) {
    console.log('📡 [DB] CREATE START', { tableName: table, payloadKeys: Object.keys(payload) })

    if (!supabase) {
      console.error('CRITICAL: supabase object is UNDEFINED')
      throw new Error('Supabase client failed to initialize.')
    }

    const { data, error } = await supabase
      .from(table)
      .insert([payload])
      .select()

    console.log('✅ [DB] CREATE RESPONSE:', data)

    if (error) {
      console.error('DB Create Error:', error.message)
      throw error
    }

    console.log('✅ [DB] Create Successful:', data)
    return data
  }

  async deleteEntry(table: string, id: any) {
    console.log('🗑️ [DB] DELETE START', { tableName: table, id })

    if (!supabase) {
      console.error('Supabase missing')
      throw new Error('Supabase missing')
    }

    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .select()

    console.log('✅ [DB] DELETE RESPONSE:', data)

    if (error) {
      console.error('DB Delete Error:', error.message)
      throw error
    }

    console.log('✅ [DB] Delete Successful for', id)
    return { success: true, deleted: data }
  }

  async checkIsAdmin(): Promise<boolean> {
    if (!supabase) return false;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const email = session.user.email?.toLowerCase();
    const ADMIN_ENTITIES = ['mitaakxi@glyphcircle.com', 'master@glyphcircle.com', 'admin@glyphcircle.com'];
    if (email && (ADMIN_ENTITIES.includes(email) || email.includes('admin@'))) return true;

    const { data } = await supabase.rpc('check_is_admin');
    return data === true;
  }

  async getStartupBundle() {
    try {
      console.log('📦 [DB] Fetching startup bundle...');

      // Fetch all tables in parallel
      const [servicesRes] = await Promise.all([
        supabase.from('services').select('*')
      ]);

      if (servicesRes.error) throw servicesRes.error;

      return {
        services: servicesRes.data || []
      };
    } catch (err) {
      console.warn('⚠️ [DB] Startup bundle failed, falling back to individual calls');
      return null;
    }
  }


  async getConfigValue(key: string): Promise<string | null> {
    if (!supabase) return null;
    const { data } = await supabase.from('config').select('value').eq('key', key).maybeSingle();
    return data?.value || null;
  }

  async invokeBatchUpdate(table: string, updates: any[]) {
    if (!supabase) throw new Error("Client missing");
    const { data, error } = await supabase.rpc('update_records_batch', { target_table: table, updates });
    if (error) throw error;
    return data;
  }

  async recordTransaction(data: any) { return supabase.from('transactions').insert(data); }
  async saveReading(data: any) { return supabase.from('readings').insert(data).select().single(); }
}

export const dbService = new SupabaseDatabase();