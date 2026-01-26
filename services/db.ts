
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

  async checkIsAdmin(): Promise<boolean> {
    if (this.adminCheckCache && (Date.now() - this.adminCheckCache.timestamp < this.CACHE_TTL)) {
      return this.adminCheckCache.value;
    }

    if (this.pendingAdminCheck) return this.pendingAdminCheck;

    this.pendingAdminCheck = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return false;

        const { data, error, status } = await supabase.rpc('check_is_admin');
        
        if (error) {
          if (status === 403 || error.code === '42501') {
            console.error("🚫 SECURITY 403: Permission Denied on 'check_is_admin'.");
            window.dispatchEvent(new CustomEvent('glyph_security_alert', { 
                detail: { code: 403, message: 'RPC Permission Denied (403)' } 
            }));
            return false;
          }
          return false;
        }

        const is_admin = Boolean(data);
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

  async getConfigValue(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('config')
        .select('value')
        .eq('key', key)
        .eq('status', 'active')
        .maybeSingle();
      
      if (error) return null;
      return data?.value || null;
    } catch (e) {
      return null;
    }
  }

  clearSecurityCache() {
    this.adminCheckCache = null;
    this.pendingAdminCheck = null;
  }

  private async ensureSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Unauthorized: No active session detected.");
      return session;
  }

  private async handleDbError(error: any, operation: string, table: string) {
    console.error(`DB Error [${operation}] on [${table}]:`, error);
    if (error.code === '42501' || error.status === 403) {
      window.dispatchEvent(new CustomEvent('glyph_security_alert', { 
          detail: { code: 403, message: `Permission Denied on ${table}. Contact owner.` } 
      }));
    }
    throw error;
  }

  async getAll(table: string) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
        console.warn(`Fetch error on ${table}:`, error.message);
        return [];
    }
    return data || [];
  }

  async createEntry(table: string, entry: any) {
    await this.ensureSession();
    const { data, error } = await supabase.from(table).insert([entry]).select();
    if (error) return this.handleDbError(error, 'CREATE', table);
    return data;
  }

  async updateEntry(table: string, id: string | number, updates: any) {
    await this.ensureSession();
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select();

    if (error) return this.handleDbError(error, 'UPDATE', table);
    return data;
  }

  async deleteEntry(table: string, id: string | number) {
    await this.ensureSession();
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return this.handleDbError(error, 'DELETE', table);
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
