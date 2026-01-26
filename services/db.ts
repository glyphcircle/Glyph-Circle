
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

// --- 🔱 V37: STABLE CONNECTION WRAPPER 🔱 ---

async function withTimeout<T>(promise: Promise<T>, tableName: string, timeoutMs: number = 5000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
        reject(new Error(`Timeout on [${tableName}]`));
    }, timeoutMs);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

class SupabaseDatabase {
  async getUserProfile(userId: string): Promise<User | null> {
    const promise = supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(res => { if (res.error) throw res.error; return res.data; });
    return withTimeout(promise, 'users', 6000);
  }

  async createUserProfile(user: Partial<User>): Promise<User | null> {
    const promise = supabase
      .from('users')
      .insert([user])
      .select()
      .single()
      .then(res => { if (res.error) throw res.error; return res.data; });
    return withTimeout(promise, 'users-create', 8000);
  }

  async getReadings(userId: string): Promise<Reading[]> {
    const promise = supabase
      .from('readings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(res => { if (res.error) throw res.error; return res.data || []; });
    return withTimeout(promise, 'readings', 8000);
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

  async getAll(table: string) {
    const promise = supabase
      .from(table)
      .select('*')
      .then(res => { 
          if (res.error) throw res.error;
          return res.data || []; 
      });
    
    return await withTimeout(promise, table);
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
