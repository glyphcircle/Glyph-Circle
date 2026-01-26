
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
 * 🔱 SUPABASE DATABASE SERVICE (METHOD A)
 * Optimized to work with private schema isolation and JWT metadata.
 */
class SupabaseDatabase {
  
  // --- 🪄 CLEARANCE HANDLERS ---
  
  /**
   * Checks admin status without causing RLS recursion.
   * 1. First checks the JWT metadata (Fastest/Safe)
   * 2. Fallback to a public RPC wrapper if needed.
   */
  async checkIsAdmin(): Promise<boolean> {
    try {
      // Step A: Check JWT Claims (Loop-Proof)
      const { data: { session } } = await supabase.auth.getSession();
      const jwtRole = session?.user?.app_metadata?.role;
      if (jwtRole === 'admin') return true;

      // Step B: Call Public Wrapper (If metadata hasn't synced yet)
      const { data, error } = await supabase.rpc('check_is_admin');
      if (error) {
        // If "function not found", it means we only have the private logic.
        // We trust the JWT in that case.
        return false;
      }
      return Boolean(data);
    } catch (e) {
      return false;
    }
  }

  async createMoodEntry(mood: string, notes: string) {
    const { data, error } = await supabase.rpc('create_mood_entry', { 
      _mood: mood, 
      _notes: notes 
    });
    if (error) throw error;
    return data;
  }

  // --- 📦 DIRECT CRUD (Method A: Recommended for JS Client) ---

  async getAll(table: string) {
    const { data, error } = await supabase
      .from(table)
      .select('*');
    
    if (error) {
      // Graceful handling of locked tables
      if (error.message.includes('permission denied')) {
          console.warn(`🔒 Access Restricted on ${table}. Ensure RLS policies use 'private._is_admin_direct'.`);
          return [];
      }
      throw error;
    }
    return data || [];
  }

  async createEntry(table: string, entry: any) {
    const { data, error } = await supabase
      .from(table)
      .insert([entry])
      .select();
    if (error) throw error;
    return data;
  }

  async updateEntry(table: string, id: string | number, updates: any) {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data;
  }

  async deleteEntry(table: string, id: string | number) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async saveReading(reading: any): Promise<Reading> {
    const { data, error } = await supabase
      .from('readings')
      .insert([reading])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async recordTransaction(transaction: any) {
    const { error } = await supabase
      .from('transactions')
      .insert([transaction]);
    if (error) throw error;
  }

  /**
   * Triggers the admin data extraction edge function.
   */
  async exportUserData(userId: string) {
    const { data, error } = await supabase.functions.invoke('admin-export-user-data', {
      body: { user_id: userId }
    });
    if (error) throw error;
    return data as { fileKey: string; signedUrl: string; expiresIn: number };
  }
}

export const dbService = new SupabaseDatabase();
