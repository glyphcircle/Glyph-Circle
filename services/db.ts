
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

class SupabaseDatabase {
  
  constructor() {}

  // --- USER METHODS ---

  async getUserProfile(userId: string): Promise<User | null> {
      try {
          const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .maybeSingle(); 
          
          if (error) {
              const msg = error.message?.toLowerCase() || '';
              if (msg.includes('infinite recursion') || msg.includes('policy')) {
                  console.error("🛡️ Supabase Security Error (Infinite Recursion): Check RLS policies on 'users' table.");
                  return null;
              }
              return null;
          }
          return data;
      } catch (e) {
          return null;
      }
  }

  async createUserProfile(user: Partial<User>) {
      try {
          const { data, error } = await supabase
              .from('users')
              .upsert([user], { onConflict: 'id' })
              .select()
              .single();
          
          if (error) {
              const msg = error.message?.toLowerCase() || '';
              // Gracefully handle specific constraint violations
              if (msg.includes('foreign key constraint') && msg.includes('users_id_fkey')) {
                  throw new Error("🛡️ Identity Link Blocked: The authentication record for this ID is not yet confirmed. Please verify your email first or use SQL God Mode to force-confirm.");
              }
              if (msg.includes('infinite recursion') || msg.includes('policy')) {
                  console.warn("🛡️ Profile Sync deferred: Database security policy recursion detected.");
                  return user as User;
              }
              throw new Error(error.message);
          }
          return data;
      } catch (e: any) {
          console.error("Supabase Profile Sync Error:", e.message);
          throw e;
      }
  }

  // --- READINGS ---

  async getReadings(userId: string): Promise<Reading[]> {
      try {
          const { data, error } = await supabase
              .from('readings')
              .select('*')
              .eq('user_id', userId)
              .order('timestamp', { ascending: false });

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

      const { data, error } = await supabase
          .from('readings')
          .insert([newReading])
          .select()
          .single();

      if (error) throw error;
      return data;
  }

  async toggleFavorite(readingId: string, currentStatus: boolean): Promise<boolean> {
      const { error } = await supabase
          .from('readings')
          .update({ is_favorite: !currentStatus })
          .eq('id', readingId);
          
      if (error) return currentStatus;
      return !currentStatus;
  }

  // --- CREDITS & TRANSACTIONS ---

  async addCredits(userId: string, amount: number): Promise<User> {
      const user = await this.getUserProfile(userId);
      if (!user) throw new Error("User not found");

      const newCredits = (user.credits || 0) + amount;

      const { data, error } = await supabase
          .from('users')
          .update({ credits: newCredits })
          .eq('id', userId)
          .select()
          .single();

      if (error) throw error;
      return data;
  }

  async recordTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
      const newTx = {
          ...transaction,
          created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
          .from('transactions')
          .insert([newTx])
          .select()
          .single();

      if (error) throw error;
      return data;
  }

  // --- GENERIC ADMIN METHODS ---
  
  async getAll(table: string) {
      try {
          const { data, error } = await supabase.from(table).select('*');
          if (error) {
              if (error.message.includes('infinite recursion')) {
                  throw new Error("Infinite recursion detected in table policies.");
              }
              return [];
          }
          return data || [];
      } catch (e: any) {
          console.error(`DB Error (${table}):`, e.message);
          throw e;
      }
  }

  async updateEntry(table: string, id: string | number, updates: any) {
      const { data, error } = await supabase
          .from(table)
          .update(updates)
          .eq('id', id)
          .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
          throw new Error(`Update blocked: No rows modified. Check RLS policies for table '${table}'.`);
      }
  }

  async createEntry(table: string, entry: any) {
      const { data, error } = await supabase.from(table).insert(entry).select();
      if (error) throw error;
      return data;
  }
}

export const dbService = new SupabaseDatabase();
