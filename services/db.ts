
import { supabase } from './supabaseClient';
import { GameStats } from './gamificationConfig';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'seeker' | 'sage' | 'admin';
  credits: number;
  currency: string;
  status: string;
  created_at: string;
  gamification?: GameStats;
}

export interface Reading {
  id: string;
  user_id: string;
  type: 'tarot' | 'palmistry' | 'face-reading' | 'numerology' | 'astrology' | 'matchmaking' | 'dream-analysis' | 'remedy';
  title: string;
  subtitle?: string;
  content: string;
  timestamp: string;
  created_at: string;
  is_favorite?: boolean;
  meta_data?: any;
  image_url?: string;
}

class SupabaseDatabase {
  private adminCheckCache: { value: boolean; timestamp: number } | null = null;
  private pendingAdminCheck: Promise<boolean> | null = null;
  private readonly CACHE_TTL = 120000; 

  private async withTimeout<T = any>(queryPromise: PromiseLike<T>, ms: number = 15000, context: string = 'Operation'): Promise<T> {
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`${context} timed out after ${ms}ms`)), ms)
    );
    return Promise.race([Promise.resolve(queryPromise), timeout]);
  }

  async checkIsAdmin(): Promise<boolean> {
    if (this.adminCheckCache && (Date.now() - this.adminCheckCache.timestamp < this.CACHE_TTL)) {
      return this.adminCheckCache.value;
    }
    if (this.pendingAdminCheck) return this.pendingAdminCheck;

    this.pendingAdminCheck = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return false;

        const { data, error } = await this.withTimeout(
          supabase.rpc('is_jwt_admin'),
          8000,
          'Admin Check'
        );

        if (error) return false;

        // RPC may return boolean or single-row object; normalize both shapes
        let is_admin = false;
        if (Array.isArray(data)) {
          if (data.length > 0) {
            const first = data[0];
            is_admin = first === true || first?.is_jwt_admin === true;
          }
        } else {
          is_admin = data === true || data?.is_jwt_admin === true;
        }

        this.adminCheckCache = { value: is_admin, timestamp: Date.now() };
        return is_admin;
      } catch (e) {
        return false;
      } finally {
        this.pendingAdminCheck = null;
      }
    })();
    return this.pendingAdminCheck;
  }

  async getStartupBundle(): Promise<Record<string, any>> {
    try {
        const { data, error } = await this.withTimeout(supabase.rpc('get_mystic_startup_bundle'), 10000, 'Startup Bundle');
        if (error) {
            console.warn("Startup Bundle RPC failure. Falling back to individual fetches.");
            return {};
        }
        return data || {};
    } catch (e) {
        return {};
    }
  }

  async getConfigValue(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.from('config').select('value').eq('key', key).eq('status', 'active').maybeSingle();
      return error ? null : data?.value || null;
    } catch (e) {
      return null;
    }
  }

  clearSecurityCache() {
    this.adminCheckCache = null;
    this.pendingAdminCheck = null;
  }

  private async ensureFreshSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && (session.expires_at! - Math.floor(Date.now() / 1000) > 300)) return session;
      try {
          const { data: { session: refreshed }, error } = await this.withTimeout(supabase.auth.refreshSession(), 5000, 'Auth Refresh');
          if (error || !refreshed) throw new Error("Auth Refresh Failed");
          return refreshed;
      } catch (e) {
          if (session) return session;
          throw new Error("Unauthorized: No valid session.");
      }
  }

  async getAll(table: string) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) return [];
    return data || [];
  }

  async createEntry(table: string, entry: any) {
    await this.ensureFreshSession();
    const { data, error } = await this.withTimeout(
        supabase.from(table).insert([entry]).select().single(),
        12000,
        `Create in ${table}`
    );
    if (error) throw error;
    return data;
  }

  async updateEntry(table: string, id: string | number, updates: any) {
    if (!table || !id) throw new Error(`Update Failed: Missing table or id`);
    await this.ensureFreshSession();
    
    // Redirect admin tables through optimized RPC for reliability and clearance
    const adminTables = ['services', 'store_items', 'config', 'image_assets', 'report_formats', 'gemstones'];
    if (adminTables.includes(table)) {
        return this.callSecureAdminUpdate(table, id, updates);
    }

    const { data, error } = await this.withTimeout(
        supabase.from(table).update(updates).eq('id', id).select().single(),
        12000,
        `Update in ${table}`
    );
    if (error) throw error;
    return data;
  }

  async invokeBatchUpdate(table: string, updates: {id: string | number, fields: any}[], onProgress?: (percent: number) => void) {
      if (!table || updates.length === 0) return [];
      await this.ensureFreshSession();

      const { data, error } = await this.withTimeout(
          supabase.rpc('update_records_batch', {
              target_table: table,
              updates: updates
          }),
          20000,
          'Batch Update RPC'
      );

      if (error) throw error;
      if (onProgress) onProgress(100);
      return data;
  }

  async callSecureAdminUpdate(table: string, id: string | number, fields: any) {
    await this.ensureFreshSession();
    
    // Build normalized payload for update_records_batch
    const updates = [{ id: String(id), fields }];
    
    const { data, error } = await this.withTimeout(
        supabase.rpc('update_records_batch', { 
            target_table: table, 
            updates 
        }),
        12000,
        'Secure Admin RPC'
    );

    if (error) {
        console.error("Secure RPC Error:", error);
        throw error;
    }
    
    return data;
  }

  async deleteEntry(table: string, id: string | number) {
    await this.ensureFreshSession();
    const { error } = await this.withTimeout(
        supabase.from(table).delete().eq('id', id),
        10000,
        `Delete from ${table}`
    );
    if (error) throw error;
  }

  async saveReading(reading: any): Promise<Reading> {
    const { data, error } = await supabase.from('readings').insert([reading]).select().single();
    if (error) throw error;
    return data;
  }

  async recordTransaction(transaction: any) {
    const { error } = await supabase.from('transactions').insert([transaction]);
    if (error) throw error;
  }
}

export const dbService = new SupabaseDatabase();
