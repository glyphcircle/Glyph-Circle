
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
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
  isAdminVerified: boolean;
  isAdminLoading: boolean;
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
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [history, setHistory] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const dbHanging = useRef(false);

  const refreshUser = useCallback(async () => {
    // 🛡️ 1. RECOVERY/DEV BYPASS
    const recoverySession = localStorage.getItem('glyph_admin_session');
    if (recoverySession) {
      try {
        const sess = JSON.parse(recoverySession);
        if (sess.role === 'admin') {
          if (sess.method === 'Local Bypass') {
              setIsAdminVerified(true);
              setUser({ id: 'dev-bypass', email: 'dev@local', name: 'Dev Admin', role: 'admin', credits: 999, currency: 'INR', status: 'active', created_at: new Date().toISOString() });
              setIsLoading(false);
              return;
          }
        }
      } catch (e) {
        localStorage.removeItem('glyph_admin_session');
      }
    }

    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // 🚀 STEP A: Immediate Authentication (Non-blocking)
        const jwtRole = (session.user.app_metadata?.role as any) || 'seeker';
        
        const initialUser: User = { 
          id: session.user.id, 
          email: session.user.email!, 
          name: (session.user.user_metadata?.full_name as string) || 'Seeker', 
          role: jwtRole, 
          credits: (session.user.user_metadata?.credits as number) || 0, 
          currency: 'INR', 
          status: 'active',
          created_at: session.user.created_at,
          gamification: { karma: 0, streak: 0, readingsCount: 0, unlockedSigils: [] }
        };
        
        setUser(initialUser);
        setIsLoading(false); // UI is now "authenticated"

        // 🚀 STEP B: Sovereign Verification (Background)
        setIsAdminLoading(true);
        const verifiedAdmin = await dbService.checkIsAdmin();
        setIsAdminVerified(verifiedAdmin);
        setIsAdminLoading(false);

        // If server confirms admin, upgrade the role in state
        if (verifiedAdmin) {
            setUser(prev => prev ? { ...prev, role: 'admin' } : null);
        }

        // 🚀 STEP C: Profile Enrichment
        if (!dbHanging.current) {
            try {
                const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle();
                if (profile) {
                    setUser(prev => prev ? ({ ...prev, ...profile, role: verifiedAdmin ? 'admin' : (profile.role || jwtRole) }) : null);
                    const { data: readings } = await supabase.from('readings').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
                    setHistory(readings || []);
                }
            } catch (e) {
                dbHanging.current = true;
            }
        }
      } else {
        setUser(null);
        setIsAdminVerified(false);
        setIsLoading(false);
      }
    } catch (e) {
      console.error("Auth System Error:", e);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleBypass = () => setIsAdminVerified(true);
    window.addEventListener('glyph_dev_bypass_admin', handleBypass);
    return () => window.removeEventListener('glyph_dev_bypass_admin', handleBypass);
  }, []);

  useEffect(() => {
    refreshUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (['SIGNED_IN', 'TOKEN_REFRESHED'].includes(event)) {
        dbService.clearSecurityCache();
        await refreshUser();
      }
      if (event === 'SIGNED_OUT') { 
        setUser(null); 
        setHistory([]); 
        setIsAdminVerified(false);
        dbService.clearSecurityCache();
        dbHanging.current = false;
        localStorage.removeItem('glyph_admin_session');
      }
    });
    return () => subscription.unsubscribe();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    dbService.clearSecurityCache();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('glyph_admin_session');
    dbService.clearSecurityCache();
    setUser(null);
    setIsAdminVerified(false);
    setHistory([]);
    await supabase.auth.signOut();
  };

  const saveReading = useCallback(async (readingData: PendingReading) => {
    if (user) {
      try {
          const saved = await dbService.saveReading({ ...readingData, user_id: user.id });
          setHistory(prev => [saved, ...prev]);
      } catch (e) {}
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, isAdminVerified, isAdminLoading, credits: user?.credits || 0, isLoading, error, history,
      login, logout, refreshUser, saveReading,
      register: null, sendMagicLink: null, toggleFavorite: null, pendingReading: null,
      setPendingReading: null, commitPendingReading: null, awardKarma: () => {},
      newSigilUnlocked: null, clearSigilNotification: () => {}
    }}>
      {children}
    </AuthContext.Provider>
  );
};
