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

  async updateEntry(table: string, id: string | number, updates: any, signal?: AbortSignal) {
  console.log('📡 [DB] PATCH START', {tableName: table, id, updatesKeys: Object.keys(updates)})
  
  if (!supabase) throw new Error('Supabase client failed to initialize.')

  // FIX: Create dedicated internal controller to avoid type confusion between signal and controller.
  // This ensures .abort() and .signal properties are correctly accessed on an AbortController instance.
  const controller = new AbortController();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), 8000)  // 8s timeout

  try {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .abortSignal(controller.signal)

    clearTimeout(timeout)
    console.log('✅ [DB] UPDATE RESPONSE:', data)
    
    if (error) throw error
    console.log('✅ [DB] Update Successful for', id)
    return data
  } catch (error: any) {
    clearTimeout(timeout)
    console.log('❌ [DB] UPDATE ERROR:', error.message)
    if (error.name === 'AbortError') {
      console.log('⏰ [DB] Update TIMEOUT - too many rapid updates')
    }
    throw error
  }
}

  // 🔥 FIXED CREATE
  async createEntry(table: string, payload: any) {
    console.log('📡 [DB] CREATE START', {tableName: table, payloadKeys: Object.keys(payload)})
  
    if (!supabase) throw new Error('Supabase client failed to initialize.')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)  // 10s timeout

    try {
      const { data, error } = await supabase
        .from(table)
        .insert([payload])
        .select()
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)
      console.log('✅ [DB] CREATE RESPONSE:', data)
    
      if (error) throw error
      console.log('✅ [DB] Create Successful:', data[0]?.id)
      return data
    } catch (error: any) {
      clearTimeout(timeoutId)
      console.log('❌ [DB] CREATE ERROR:', error.message || error)
      if (error.name === 'AbortError') {
        console.log('⏰ CREATE TIMEOUT - retry in 2s')
      // Auto-retry once
        await new Promise(r => setTimeout(r, 2000))
        return this.createEntry(table, payload)  // Retry
      }
      throw error
    }
  }

  // 🔥 FIXED DELETE
  async deleteEntry(table: string, id: any) { 
   console.log(`🗑️ [DB] DELETE START`, {tableName: table, id})
  
   if (!supabase) {
     console.error('CRITICAL: supabase object is UNDEFINED')
     throw new Error('Supabase missing')
    }

    const { data, error } = await supabase  // ← ADD { data, error }
      .from(table)
      .delete()
      .eq('id', id)

    console.log('✅ [DB] DELETE RESPONSE:', data)
    console.log('❌ [DB] DELETE ERROR:', error)
  
    if (error) {
      console.error('DB Delete Error:', error.message)
      throw error
    }
  
    console.log('✅ [DB] Delete Successful for', id)
    return { success: true }
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

  async recordTransaction(data: any) { return supabase.from('transactions').insert(data); }
  async saveReading(data: any) { return supabase.from('readings').insert(data).select().single(); }
}

export const dbService = new SupabaseDatabase();