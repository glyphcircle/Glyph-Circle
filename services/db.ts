
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

/**
 * 🔱 SECURE DATABASE SERVICE
 * Implements Sovereign Admin Verification with Promise Deduplication and Caching.
 */
class SupabaseDatabase {
  private adminCheckCache: { value: boolean; timestamp: number } | null = null;
  private pendingAdminCheck: Promise<boolean> | null = null;
  private readonly CACHE_TTL = 120000; // 2 minutes in-memory cache

  /**
   * SOVEREIGN ADMIN VERIFICATION
   * - Deduplicates concurrent calls
   * - Short-lived memory cache
   * - Distinguishes 401 vs False
   */
  async checkIsAdmin(): Promise<boolean> {
    // 1. Check in-memory cache first
    if (this.adminCheckCache && (Date.now() - this.adminCheckCache.timestamp < this.CACHE_TTL)) {
      return this.adminCheckCache.value;
    }

    // 2. Deduplicate ongoing requests
    if (this.pendingAdminCheck) return this.pendingAdminCheck;

    this.pendingAdminCheck = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return false;

        // Call secure RPC
        const { data, error, status } = await supabase.rpc('check_is_admin');
        
        if (error) {
          // Handle 401 Unauthorized (Expired Session)
          if (status === 401) {
            console.warn("🔐 Session expired during admin check. Refreshing...");
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData.session) return this.checkIsAdmin(); // Retry once
          }
          
          this.logSecurityEvent('verification_error', { error: error.message, status });
          return false;
        }

        const is_admin = Boolean(data);
        
        // Update cache
        this.adminCheckCache = { value: is_admin, timestamp: Date.now() };
        
        if (!is_admin) {
            this.logSecurityEvent('access_denied', { userId: session.user.id });
        }

        return is_admin;
      } catch (e) {
        return false;
      } finally {
        this.pendingAdminCheck = null;
      }
    })();

    return this.pendingAdminCheck;
  }

  /**
   * Clear security cache (call on Logout or Login)
   */
  clearSecurityCache() {
    this.adminCheckCache = null;
    this.pendingAdminCheck = null;
  }

  private logSecurityEvent(event: string, details: any) {
      console.info(`[Security Metrics] ${new Date().toISOString()} | EVENT: ${event}`, details);
      // In production, send to Axiom/Datadog/Sentry
  }

  private async handleDbError(error: any, operation: string, table: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (error.code === '42501' || error.status === 403) {
      this.logSecurityEvent('unauthorized_write_attempt', { 
          userId: user?.id, 
          operation, 
          table,
          errorCode: error.code 
      });
      alert("Admin permission required. Operation blocked by server-side RLS.");
      // Force UI re-sync to rollback any optimistic local state
      window.dispatchEvent(new CustomEvent('glyph_db_sync_required', { detail: { table } }));
    } else {
      console.error(`❌ DB Error [${operation}]:`, error.message);
    }
    throw error;
  }

  // --- 📦 DIRECT CRUD ---

  async getAll(table: string) {
    const { data, error }: any = await supabase.from(table).select('*');
    if (error) {
        if (error.code === '42501') return [];
        return [];
    }
    return data || [];
  }

  async createEntry(table: string, entry: any) {
    const { data, error } = await supabase.from(table).insert([entry]).select();
    if (error) return this.handleDbError(error, 'CREATE', table);
    return data;
  }

  async updateEntry(table: string, id: string | number, updates: any) {
    const { data, error } = await supabase.from(table).update(updates).eq('id', id).select();
    if (error) return this.handleDbError(error, 'UPDATE', table);
    return data;
  }

  async deleteEntry(table: string, id: string | number) {
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
