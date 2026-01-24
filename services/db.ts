
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
 * Prevents UI hanging when RLS policies or network issues cause infinite waits.
 */
const withTimeout = async <T = any>(promise: Promise<T>, timeoutMs: number = 25000): Promise<T> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`Cosmic Timeout: Database unresponsive after ${timeoutMs/1000}s. This is almost certainly an RLS Infinite Recursion loop in Supabase.`));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

class SupabaseDatabase {
  
  constructor() {}

  // --- USER METHODS ---

  async getUserProfile(userId: string): Promise<User | null> {
      try {
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
   * ⚡ SECURE UPDATE
   * Strips immutable keys from the update object to prevent Postgres Primary Key mutation hangs.
   */
  async updateEntry(table: string, id: string | number, updates: any) {
      console.info(`🛰️ DB: Updating ${table}/${id}... Payload:`, updates);
      
      // 🛡️ CRITICAL: Remove PK and system fields. 
      // Including the ID or timestamps in the body of an update can cause RLS/Postgres to hang.
      const { id: _, created_at: __, updated_at: ___, ...cleanUpdates } = updates;
      
      // Prevent empty updates which can cause some PostgREST versions to hang
      if (Object.keys(cleanUpdates).length === 0) {
          console.warn("🛰️ DB: No changes detected, skipping update.");
          return;
      }

      const { error, status } = await withTimeout(supabase
          .from(table)
          .update(cleanUpdates)
          .eq('id', id));

      if (error) {
          console.error(`❌ DB Failure [${status}]:`, error);
          throw new Error(error.message || `Server responded with status ${status}`);
      }
      
      console.info(`✅ DB Update Success.`);
  }

  async createEntry(table: string, entry: any) {
      const { data, error } = await withTimeout(supabase.from(table).insert(entry).select());
      if (error) throw error;
      return data;
  }
}

export const dbService = new SupabaseDatabase();
