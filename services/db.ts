
import { supabase } from './supabaseClient';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'seeker' | 'sage' | 'admin';
  credits: number;
  currency: string;
  created_at: string;
}

export interface Reading {
  id: string;
  user_id: string;
  type: 'tarot' | 'palmistry' | 'face-reading' | 'numerology' | 'astrology' | 'matchmaking' | 'dream-analysis' | 'remedy';
  title: string;
  subtitle?: string;
  content: string;
  image_url?: string;
  meta_data?: any;
  is_favorite: boolean;
  paid: boolean;
  timestamp: string;
  created_at: string;
}

/**
 * ⚡ ATOMIC TIMEOUT WRAPPER
 * If a request takes > 12s, we assume it's an RLS loop and return a fallback.
 */
async function withTimeout<T>(promise: Promise<T>, tableName: string, timeoutMs: number = 12000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
        const error = new Error(`Latency Timeout (12s) on [${tableName}]. Check RLS recursion.`);
        // @ts-ignore
        error.isTimeout = true;
        reject(error);
    }, timeoutMs);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  clearTimeout(timeoutId);
  return result;
}

class SupabaseDatabase {
  async getUserProfile(userId: string): Promise<User | null> {
    const promise = supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(res => { if (res.error) throw res.error; return res.data; });
    return withTimeout(promise, 'users');
  }

  async createUserProfile(user: Partial<User>): Promise<User | null> {
    const promise = supabase
      .from('users')
      .insert([user])
      .select()
      .single()
      .then(res => { if (res.error) throw res.error; return res.data; });
    return withTimeout(promise, 'users-create');
  }

  async getReadings(userId: string): Promise<Reading[]> {
    const promise = supabase
      .from('readings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(res => { if (res.error) throw res.error; return res.data || []; });
    return withTimeout(promise, 'readings');
  }

  async saveReading(reading: any): Promise<Reading> {
    const promise = supabase
      .from('readings')
      .insert([reading])
      .select()
      .single()
      .then(res => { if (res.error) throw res.error; return res.data; });
    return withTimeout(promise, 'readings-save');
  }

  async toggleFavorite(readingId: string, currentStatus: boolean): Promise<boolean> {
    const newStatus = !currentStatus;
    const promise = supabase
      .from('readings')
      .update({ is_favorite: newStatus })
      .eq('id', readingId)
      .then(res => { if (res.error) throw res.error; return newStatus; });
    return withTimeout(promise, 'readings-fav');
  }

  async addCredits(userId: string, amount: number) {
    const { data: user } = await supabase.from('users').select('credits').eq('id', userId).single();
    const newCredits = (user?.credits || 0) + amount;
    const promise = supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', userId)
      .select()
      .single()
      .then(res => { if (res.error) throw res.error; return res.data; });
    return withTimeout(promise, 'users-credits');
  }

  async getAll(table: string) {
    const promise = supabase
      .from(table)
      .select('*')
      .then(res => { 
          if (res.error) {
              console.error(`Supabase Error [${table}]:`, res.error);
              if (res.error.code === 'PGRST116' || res.error.message.includes('not found')) {
                  return [];
              }
              throw res.error;
          }
          return res.data || []; 
      });
    
    try {
        return await withTimeout(promise, table);
    } catch (e: any) {
        if (e.isTimeout) {
            console.warn(`⚠️ Table [${table}] is looping. UI will show cached or empty data.`);
            return []; // Fail silent for non-critical UI data
        }
        throw e;
    }
  }

  async updateEntry(table: string, id: string | number, updates: any) {
    const promise = supabase.from(table).update(updates).eq('id', id).then(res => { if (res.error) throw res.error; });
    return withTimeout(promise, table);
  }

  async createEntry(table: string, entry: any) {
    const promise = supabase.from(table).insert(entry).select().then(res => { if (res.error) throw res.error; return res.data; });
    return withTimeout(promise, table);
  }

  async recordTransaction(transaction: any) {
    const promise = supabase.from('transactions').insert([transaction]).then(res => { if (res.error) throw res.error; });
    return withTimeout(promise, 'transactions');
  }
}

export const dbService = new SupabaseDatabase();
