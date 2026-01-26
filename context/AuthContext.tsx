
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { dbService, User, Reading } from '../services/db';

interface PendingReading {
  type: Reading['type'];
  title: string;
  content: string;
  subtitle?: string;
  image_url?: string;
  meta_data?: any;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  history: Reading[];
  credits: number;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
  saveReading: (reading: PendingReading) => void;
  register: any; sendMagicLink: any; toggleFavorite: any; pendingReading: any; setPendingReading: any; commitPendingReading: any; awardKarma: any; newSigilUnlocked: any; clearSigilNotification: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    // 🛡️ RECOVERY BYPASS: Priority 1
    const recoverySession = localStorage.getItem('system_admin_recovery') || localStorage.getItem('glyph_admin_session');
    if (recoverySession) {
      try {
        const sess = JSON.parse(recoverySession);
        if (sess.active || sess.role === 'admin') {
          setUser({
            id: sess.uid || '6a1e9c31-cb23-46ee-8ffd-95ff6c1ea7f1',
            email: sess.email || sess.user || 'mitaakxi@glyphcircle.com',
            name: 'System Administrator',
            role: 'admin',
            credits: 999999,
            currency: 'INR',
            status: 'active',
            created_at: new Date().toISOString(),
            // Added default gamification for admin recovery
            gamification: { karma: 10000, streak: 99, readingsCount: 150, unlockedSigils: ['awakening', 'consistent_soul', 'dedicated_devotee', 'tarot_master', 'high_priest'] }
          });
          setIsLoading(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem('system_admin_recovery');
      }
    }

    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // --- ⚡ SOVEREIGN PROFILE FETCH ⚡ ---
        // We fetch with a timeout. If the public.users table hangs due to RLS recursion, 
        // we use the JWT claims from the session itself as a source of truth.
        const fetchProfile = async () => {
           const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
           if (error) throw error;
           return data;
        };

        const timeout = new Promise((_, r) => setTimeout(() => r(new Error('Profile Timeout')), 5000));
        
        try {
            const profile: any = await Promise.race([fetchProfile(), timeout]);
            if (profile) {
                setUser({
                    ...profile,
                    status: profile.status || 'active',
                    // Ensure gamification is present even if null in DB
                    gamification: profile.gamification || { karma: 0, streak: 0, readingsCount: 0, unlockedSigils: [] }
                });
                const { data: readings } = await supabase
                  .from('readings')
                  .select('*')
                  .eq('user_id', profile.id)
                  .order('created_at', { ascending: false });
                setHistory(readings || []);
            } else if (session.user.email === 'mitaakxi@glyphcircle.com') {
                // Fallback identity for master
                setUser({ 
                   id: session.user.id, 
                   email: session.user.email!, 
                   name: 'Master Admin', 
                   role: 'admin', 
                   credits: 999999, 
                   currency: 'INR', 
                   status: 'active',
                   created_at: new Date().toISOString(),
                   // Default gamification for master admin
                   gamification: { karma: 10000, streak: 99, readingsCount: 150, unlockedSigils: ['awakening', 'consistent_soul', 'dedicated_devotee', 'tarot_master', 'high_priest'] }
                });
            }
        } catch (e) {
            console.warn("DB Hang Detected during Auth. Recovering via JWT Helix...");
            // DETERMINISTIC FALLBACK: Determine role from session app_metadata (Synced by SQL V16)
            const role = session.user.app_metadata?.role || 'seeker';
            setUser({ 
                id: session.user.id, 
                email: session.user.email!, 
                name: (session.user.user_metadata?.full_name as string) || 'Seeker', 
                role: role as any, 
                credits: (session.user.user_metadata?.credits as number) || 0, 
                currency: 'INR', 
                status: 'active',
                created_at: session.user.created_at,
                // Default gamification for fallback user
                gamification: { karma: 0, streak: 0, readingsCount: 0, unlockedSigils: [] }
            });
        }
      }
    } catch (e) {
      console.error("Auth Refresh Failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (['SIGNED_IN', 'USER_UPDATED', 'TOKEN_REFRESHED'].includes(event)) await refreshUser();
      if (event === 'SIGNED_OUT') { 
        setUser(null); 
        setHistory([]); 
      }
    });
    return () => subscription.unsubscribe();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await refreshUser();
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('system_admin_recovery');
    localStorage.removeItem('glyph_admin_session');
    setUser(null);
    setHistory([]);
    await supabase.auth.signOut();
    window.location.hash = '#/login';
  };

  const saveReading = useCallback(async (readingData: PendingReading) => {
    if (user) {
      const saved = await dbService.saveReading({ ...readingData, user_id: user.id, paid: true });
      setHistory(prev => [saved, ...prev]);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, credits: user?.credits || 0, isLoading, error, history,
      login, logout, refreshUser, saveReading,
      register: null, sendMagicLink: null, toggleFavorite: null, pendingReading: null,
      setPendingReading: null, commitPendingReading: null, awardKarma: () => {},
      newSigilUnlocked: null, clearSigilNotification: () => {}
    }}>
      {children}
    </AuthContext.Provider>
  );
};
