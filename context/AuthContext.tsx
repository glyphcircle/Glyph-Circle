
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { dbService, User, Reading } from '../services/db';
import { ACTION_POINTS, SIGILS, GameStats } from '../services/gamificationConfig';
import { biometricService } from '../services/biometricService';
import { LanguageContext, Currency } from './LanguageContext';

interface PendingReading {
  type: Reading['type'];
  title: string;
  content: string;
  subtitle?: string;
  image_url?: string;
  meta_data?: any;
}

interface GamifiedUser extends User {
  gamification?: {
    karma: number;
    streak: number;
    lastVisit: string;
    readingsCount: number;
    unlockedSigils: string[];
  };
}

interface AuthContextType {
  user: GamifiedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  history: Reading[];
  credits: number;
  login: (email: string, password: string) => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  loginWithPhone: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>;
  loginWithBiometrics: () => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  devLogin: (email: string, name: string) => Promise<void>; 
  logout: () => void;
  refreshUser: () => void;
  addCredits: (amount: number) => void;
  saveReading: (reading: PendingReading) => void;
  toggleFavorite: (readingId: string) => void;
  pendingReading: PendingReading | null;
  setPendingReading: (reading: PendingReading | null) => void;
  commitPendingReading: () => void;
  awardKarma: (amount: number, actionName?: string) => void;
  newSigilUnlocked: string | null; 
  clearSigilNotification: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = ['master@glyphcircle.com', 'admin@glyphcircle.com', 'admin@glyph.circle'];

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GamifiedUser | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingReading, setPendingReading] = useState<PendingReading | null>(null);
  const [newSigilUnlocked, setNewSigilUnlocked] = useState<string | null>(null);
  
  const langCtx = useContext(LanguageContext);

  const syncGamification = (dbUser: User): GamifiedUser => {
      const gamifyData = localStorage.getItem(`glyph_gamify_${dbUser.id}`);
      let fullUser: GamifiedUser = { ...dbUser };
      if (gamifyData) fullUser.gamification = JSON.parse(gamifyData);
      else fullUser.gamification = { karma: 0, streak: 1, lastVisit: new Date().toISOString(), readingsCount: 0, unlockedSigils: [] };
      return checkDailyStreak(fullUser);
  };

  const checkDailyStreak = (currentUser: GamifiedUser) => {
      const today = new Date().toDateString();
      const lastVisit = currentUser.gamification?.lastVisit ? new Date(currentUser.gamification.lastVisit).toDateString() : null;
      let newStreak = currentUser.gamification?.streak || 0;
      if (lastVisit !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          newStreak = (lastVisit === yesterday.toDateString()) ? newStreak + 1 : 1;
          if (currentUser.gamification) {
              currentUser.gamification.streak = newStreak;
              currentUser.gamification.lastVisit = new Date().toISOString();
              currentUser.gamification.karma += ACTION_POINTS.DAILY_LOGIN;
          }
      }
      return currentUser;
  };

  const checkSigils = (u: GamifiedUser) => {
      if (!u.gamification) return;
      const stats: GameStats = u.gamification;
      SIGILS.forEach(sigil => {
          if (!stats.unlockedSigils.includes(sigil.id) && sigil.condition(stats)) {
              stats.unlockedSigils.push(sigil.id);
              setNewSigilUnlocked(sigil.name);
          }
      });
  };

  const refreshUser = useCallback(async () => {
    if (!isSupabaseConfigured()) {
        setIsLoading(false);
        return;
    }

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
            let profile = await dbService.getUserProfile(session.user.id);

            if (!profile) {
                const isAdmin = ADMIN_EMAILS.includes(session.user.email || '');
                profile = await dbService.createUserProfile({
                    id: session.user.id,
                    email: session.user.email || '',
                    name: session.user.user_metadata.full_name || 'Seeker',
                    role: isAdmin ? 'admin' : 'user',
                    credits: 50 
                }) as User;
            }

            if (profile) {
                const gamifiedUser = syncGamification(profile);
                setUser(gamifiedUser);
                const readings = await dbService.getReadings(profile.id);
                setHistory(readings);
                
                if (profile.currency && langCtx) {
                    if (langCtx.currency !== profile.currency) {
                        langCtx.setCurrency(profile.currency as Currency);
                    }
                }
            }
        } else {
            const devSession = localStorage.getItem('glyph_dev_user');
            if (devSession) {
                const data = JSON.parse(devSession);
                setUser(syncGamification(data));
            } else {
                setUser(null);
                setHistory([]);
            }
        }
    } catch (err: any) {
        console.warn("Auth Sync:", err.message);
    } finally {
        setIsLoading(false);
    }
  }, [langCtx]);

  useEffect(() => {
    refreshUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔐 Auth Event: ${event}`);
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
            await refreshUser();
        }
        if (event === 'SIGNED_OUT') {
            setUser(null);
            setHistory([]);
        }
    });
    
    return () => {
        subscription.unsubscribe();
    };
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    } catch (e: any) {
        setError(e.message);
        setIsLoading(false);
        throw e;
    }
  };

  const sendMagicLink = async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
        // Fix: Use a robust redirect URL that includes the subfolder (e.g. /Glyph-Circle/)
        const redirectTo = window.location.origin + window.location.pathname;
        const { error } = await supabase.auth.signInWithOtp({ 
            email,
            options: {
                emailRedirectTo: redirectTo
            }
        });
        if (error) throw error;
    } catch (e: any) {
        setError(e.message);
        throw e;
    } finally {
        setIsLoading(false);
    }
  };

  const loginWithPhone = async (phone: string) => {
    setIsLoading(true);
    setError(null);
    try {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
    } catch (e: any) {
        setError(e.message);
        setIsLoading(false);
        throw e;
    } finally {
        setIsLoading(false);
    }
  };

  const verifyPhoneOtp = async (phone: string, token: string) => {
    setIsLoading(true);
    setError(null);
    try {
        const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
        if (error) throw error;
    } catch (e: any) {
        setError(e.message);
        setIsLoading(false);
        throw e;
    } finally {
        setIsLoading(false);
    }
  };

  const loginWithBiometrics = async (): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
          const isVerified = await biometricService.verify();
          if (!isVerified) {
              setIsLoading(false);
              return false;
          }
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
              await refreshUser();
              return true;
          }
          setIsLoading(false);
          return false;
      } catch (e: any) {
          setError("Biometric Auth Failed");
          setIsLoading(false);
          return false;
      }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
        // Fix: Ensure confirmation email redirects to the correct subfolder
        const redirectTo = window.location.origin + window.location.pathname;
        const { error } = await supabase.auth.signUp({ 
            email, password, options: { data: { full_name: name }, emailRedirectTo: redirectTo }
        });
        if (error) throw error;
    } catch (e: any) {
        setError(e.message);
        setIsLoading(false);
        throw e;
    }
  };

  const googleLogin = async () => {
      setError("OAuth redirects are restricted in this preview environment.");
  };

  const devLogin = async (email: string, name: string) => {
      setIsLoading(true);
      const isAdmin = ADMIN_EMAILS.includes(email);
      const mockUser: User = {
          id: 'dev_user_' + btoa(email).substring(0,8),
          email, name,
          role: isAdmin ? 'admin' : 'user',
          credits: 100,
          created_at: new Date().toISOString()
      };
      localStorage.setItem('glyph_dev_user', JSON.stringify(mockUser));
      setUser(syncGamification(mockUser));
      setIsLoading(false);
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    localStorage.removeItem('glyph_admin_session');
    localStorage.removeItem('glyph_dev_user');
    setUser(null);
    setHistory([]);
  };

  const addCredits = useCallback(async (amount: number) => {
    if (user) {
      const updated = await dbService.addCredits(user.id, amount);
      setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
    }
  }, [user]);

  const saveReading = useCallback(async (readingData: PendingReading) => {
    if (user) {
      const saved = await dbService.saveReading({ ...readingData, user_id: user.id, paid: true });
      setHistory(prev => [saved, ...prev]);
      awardKarma(ACTION_POINTS.READING_COMPLETE);
    }
  }, [user]);

  const commitPendingReading = useCallback(() => {
    if (pendingReading && user) {
      saveReading(pendingReading);
      setPendingReading(null);
    }
  }, [pendingReading, user, saveReading]);

  const toggleFavorite = useCallback(async (readingId: string) => {
    const reading = history.find(r => r.id === readingId);
    if (reading) {
        const newStatus = await dbService.toggleFavorite(readingId, reading.is_favorite);
        setHistory(prev => prev.map(r => r.id === readingId ? { ...r, is_favorite: newStatus } : r));
    }
  }, [history]);

  const awardKarma = useCallback((amount: number) => {
      if (!user) return;
      setUser(prev => {
          if (!prev) return null;
          const updated = { ...prev };
          if (!updated.gamification) updated.gamification = { karma: 0, streak: 1, lastVisit: new Date().toISOString(), readingsCount: 0, unlockedSigils: [] };
          updated.gamification.karma += amount;
          checkSigils(updated);
          localStorage.setItem(`glyph_gamify_${updated.id}`, JSON.stringify(updated.gamification));
          return updated;
      });
  }, [user]);

  const clearSigilNotification = () => setNewSigilUnlocked(null);

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, credits: user?.credits || 0, isLoading, error, history,
      login, sendMagicLink, loginWithPhone, verifyPhoneOtp, loginWithBiometrics, register, googleLogin, devLogin, logout, refreshUser, addCredits, saveReading,
      toggleFavorite, pendingReading, setPendingReading, commitPendingReading, awardKarma,
      newSigilUnlocked, clearSigilNotification
    }}>
      {children}
    </AuthContext.Provider>
  );
};
