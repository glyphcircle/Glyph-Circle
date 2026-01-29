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
    const updateCount = typeof updates === 'object' ? Object.keys(updates).length : 0;
    console.log('🚩 HIT updateEntry:', { table, id, updateCount });
    
    if (!supabase) {
        console.error("❌ CRITICAL: supabase object is UNDEFINED in dbService");
        throw new Error("Supabase client failed to initialize.");
    }

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error(`❌ [DB] Supabase Error:`, error.message);
      throw error;
    }
    
    console.log(`✅ [DB] Update successful:`, data);
    return data;
  }

  async createEntry(table: string, payload: any) {
    console.log(`📡 [DB] Creating record in ${table}`);
    if (!supabase) throw new Error("Supabase is not defined.");
    const { data, error } = await supabase.from(table).insert([payload]).select();
    if (error) throw error;
    return data;
  }

  async checkIsAdmin(): Promise<boolean> {
    if (!supabase) return false;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    if (session.user.email?.includes('admin@')) return true;
    const { data } = await supabase.rpc('check_is_admin');
    return data === true;
  }

  async getStartupBundle() {
    try {
        if (!supabase) throw new Error("Client missing");
        const { data, error } = await supabase.rpc('get_mystic_startup_bundle');
        if (error) throw error;
        return data;
    } catch (e) {
        return { services: await this.getAll('services') };
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

  async deleteEntry(table: string, id: any) { 
    console.log(`📡 [DB] Deleting ${table}:${id}`);
    if (!supabase) throw new Error("Supabase missing");
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  }

  async recordTransaction(data: any) { return supabase.from('transactions').insert(data); }
  async saveReading(data: any) { return supabase.from('readings').insert(data).select().single(); }
}

export const dbService = new SupabaseDatabase();