
import { supabase } from './supabaseClient';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  credits: number;
  created_at: string;
  currency?: string;
}

export interface Reading {
  id: string;
  user_id: string;
  type: 'tarot' | 'palmistry' | 'astrology' | 'numerology' | 'face-reading' | 'remedy';
  title: string;
  content: string;
  subtitle?: string;
  image_url?: string;
  timestamp: string;
  is_favorite: boolean;
  paid: boolean;
  meta_data?: any;
}

export interface Transaction {
    id: string;
    user_id: string;
    amount: number;
    description: string;
    status: 'success' | 'failed' | 'pending';
    created_at: string;
}

/**
 * 🛡️ TIMEOUT WRAPPER
 * Increased to 30s to allow for cold starts or slow networks.
 */
const withTimeout = async <T = any>(promise: Promise<T> | any, timeoutMs: number = 30000): Promise<T> => {
    return Promise.race([
        Promise.resolve(promise),
        new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(`Cosmic Timeout: Database unresponsive after ${timeoutMs/1000}s. Check network or Supabase RLS.`)), timeoutMs)
        )
    ]);
};

class SupabaseDatabase {
  
  constructor() {}

  // --- USER METHODS ---

  async getUserProfile(userId: string): Promise<User | null> {
      try {
          console.info(`🛰️ DB: Fetching profile for ${userId}`);
          const { data, error } = await withTimeout(supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .maybeSingle()); 
          
          if (error) throw error;
          return data;
      } catch (e) {
          console.error("DB Error (Profile):", e);
          return null;
      }
  }

  async createUserProfile(user: Partial<User>) {
      try {
          console.info(`🛰️ DB: Creating profile for ${user.email}`);
          const { data, error } = await withTimeout(supabase
              .from('users')
              .upsert([user], { onConflict: 'id' })
              .select()
              .single());
          
          if (error) throw error;
          return data;
      } catch (e: any) {
          console.error("DB Error (Create Profile):", e.message);
          throw e;
      }
  }

  // --- READINGS ---

  async getReadings(userId: string): Promise<Reading[]> {
      try {
          const { data, error } = await withTimeout(supabase
              .from('readings')
              .select('*')
              .eq('user_id', userId)
              .order('timestamp', { ascending: false }));

          if (error) return [];
          return data || [];
      } catch {
          return [];
      }
  }

  async saveReading(reading: Omit<Reading, 'id' | 'timestamp' | 'is_favorite'>): Promise<Reading> {
      console.info(`🛰️ DB: Saving reading "${reading.title}"`);
      const newReading = {
          ...reading,
          timestamp: new Date().toISOString(),
          is_favorite: false,
          meta_data: reading.meta_data || {}
      };

      const { data, error } = await withTimeout(supabase
          .from('readings')
          .insert([newReading])
          .select()
          .single());

      if (error) throw error;
      return data;
  }

  async toggleFavorite(readingId: string, currentStatus: boolean): Promise<boolean> {
      const { error } = await withTimeout(supabase
          .from('readings')
          .update({ is_favorite: !currentStatus })
          .eq('id', readingId));
          
      if (error) return currentStatus;
      return !currentStatus;
  }

  // --- CREDITS & TRANSACTIONS ---

  async addCredits(userId: string, amount: number): Promise<User> {
      const user = await this.getUserProfile(userId);
      if (!user) throw new Error("User not found");

      const newCredits = (user.credits || 0) + amount;

      const { data, error } = await withTimeout(supabase
          .from('users')
          .update({ credits: newCredits })
          .eq('id', userId)
          .select()
          .single());

      if (error) throw error;
      return data;
  }

  async recordTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
      const newTx = {
          ...transaction,
          created_at: new Date().toISOString()
      };

      const { data, error } = await withTimeout(supabase
          .from('transactions')
          .insert([newTx])
          .select()
          .single());

      if (error) throw error;
      return data;
  }

  // --- GENERIC ADMIN METHODS ---
  
  async getAll(table: string) {
      try {
          const { data, error } = await withTimeout(supabase.from(table).select('*'));
          if (error) throw error;
          return data || [];
      } catch (e: any) {
          console.error(`DB Error (${table}):`, e.message);
          throw e;
      }
  }

  /**
   * ⚡ Simplified Update
   * Removed .select() to avoid extra overhead and potential RLS issues during update.
   */
  async updateEntry(table: string, id: string | number, updates: any) {
      console.info(`🛰️ DB: Executing UPDATE on ${table} where id=${id}`, updates);
      
      const { error, status } = await withTimeout(supabase
          .from(table)
          .update(updates)
          .eq('id', id));

      if (error) {
          console.error(`❌ DB: Update failed with status ${status}:`, error);
          throw new Error(error.message || `Database error ${status}`);
      }
      
      console.info(`✅ DB: Update command accepted by server.`);
  }

  async createEntry(table: string, entry: any) {
      console.info(`🛰️ DB: Executing INSERT into ${table}...`);
      const { data, error } = await withTimeout(supabase.from(table).insert(entry).select());
      if (error) throw error;
      return data;
  }
}

export const dbService = new SupabaseDatabase();
