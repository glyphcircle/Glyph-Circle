
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
 * Increased to 30s to prevent early failures during database recovery.
 */
const withTimeout = async <T = any>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`Cosmic Timeout: Database unresponsive. This indicates an RLS recursion loop in your Supabase policies or a hung trigger. Please run the SQL Repair tool in Admin Config.`));
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
          // Step 1: Get base profile from 'users' table (safe due to simple RLS)
          const { data: baseProfile, error: profileError } = await withTimeout(supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .maybeSingle()); 
          
          if (profileError) throw profileError;
          if (!baseProfile) return null;

          // Step 2: Get authoritative role from 'user_roles' table to align with RLS fix
          const { data: roleData, error: roleError } = await withTimeout(supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userId)
              .maybeSingle());
          
          if (roleError) {
              console.warn("Could not fetch from user_roles, falling back to users.role", roleError.message);
          }

          // Step 3: Merge and return, giving precedence to user_roles
          const finalProfile: User = {
              ...baseProfile,
              role: roleData?.role || baseProfile.role, // Override role if available from the helper table
          };

          return finalProfile;
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
   * Strips immutable keys and logs payload size to help debug recursion/hang issues.
   */
  async updateEntry(table: string, id: string | number, updates: any) {
      console.info(`🛰️ DB: Initiating Update on ${table}/${id}`);
      
      const { id: _, created_at: __, updated_at: ___, ...cleanUpdates } = updates;
      
      if (Object.keys(cleanUpdates).length === 0) {
          console.warn("🛰️ DB: Empty payload, update aborted.");
          return;
      }

      // Debug logging for specific large payloads (like the Google Drive URL)
      const payloadString = JSON.stringify(cleanUpdates);
      console.debug(`🛰️ DB: Payload Size: ${payloadString.length} chars`);
      if (payloadString.length > 500) {
          console.warn("🛰️ DB: Large update payload detected. Checking for recursion risks...");
      }

      const { error, status } = await withTimeout(supabase
          .from(table)
          .update(cleanUpdates)
          .eq('id', id));

      if (error) {
          console.error(`❌ DB Error [${status}]:`, error);
          throw new Error(error.message || `Database update failed with status ${status}`);
      }
      
      console.info(`✅ DB Update Successful.`);
  }

  async createEntry(table: string, entry: any) {
      const { data, error } = await withTimeout(supabase.from(table).insert(entry).select());
      if (error) throw error;
      return data;
  }
}

export const dbService = new SupabaseDatabase();
