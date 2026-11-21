import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
}

interface AuthContextValue {
  authUser: AuthUser | null;
  isSupabaseConfigured: boolean;
  authLoading: boolean;
  authBusy: boolean;
  authError: string | null;
  authNotice: string | null;
  clearAuthError: () => void;
  clearAuthNotice: () => void;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<boolean>;
  signOutUser: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

function mapSupabaseUser(user: SupabaseUser | null): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const displayName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    user.email?.split('@')[0] ||
    'Store Owner';

  return {
    uid: user.id,
    email: user.email || '',
    displayName,
  };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isSupabaseConfigured);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthUser(mapSupabaseUser(data.session?.user ?? null));
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthUser(mapSupabaseUser(session?.user ?? null));
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const clearAuthNotice = useCallback(() => {
    setAuthNotice(null);
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    if (!supabase) {
      setAuthError(
        'Supabase कॉन्फ़िगर नहीं है। .env में VITE_SUPABASE_URL और VITE_SUPABASE_ANON_KEY सेट करें।'
      );
      return false;
    }

    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        setAuthError(error.message || 'Google लॉगिन शुरू करने में समस्या आई।');
        return false;
      }
      return true;
    } catch {
      setAuthError('Google लॉगिन में समस्या आई। कृपया पुनः प्रयास करें।');
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (!supabase) {
        setAuthError(
          'Supabase कॉन्फ़िगर नहीं है। .env में VITE_SUPABASE_URL और VITE_SUPABASE_ANON_KEY सेट करें।'
        );
        return false;
      }

      setAuthBusy(true);
      setAuthError(null);
      setAuthNotice(null);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setAuthError(error.message || 'ईमेल या पासवर्ड गलत है।');
          return false;
        }
        setAuthUser(mapSupabaseUser(data.user));
        return true;
      } catch {
        setAuthError('साइन-इन करने में समस्या आई। कृपया पुनः प्रयास करें।');
        return false;
      } finally {
        setAuthBusy(false);
      }
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName?: string): Promise<boolean> => {
      if (!supabase) {
        setAuthError(
          'Supabase कॉन्फ़िगर नहीं है। .env में VITE_SUPABASE_URL और VITE_SUPABASE_ANON_KEY सेट करें।'
        );
        return false;
      }

      setAuthBusy(true);
      setAuthError(null);
      setAuthNotice(null);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName?.trim() || undefined,
            },
          },
        });
        if (error) {
          setAuthError(error.message || 'अकाउंट बनाने में समस्या आई।');
          return false;
        }
        if (data.session) {
          setAuthUser(mapSupabaseUser(data.user));
          setAuthNotice('Supabase अकाउंट सफलतापूर्वक लॉगिन हो गया!');
        } else {
          setAuthNotice(
            'खाता बनाया गया! कृपया अपने ईमेल पर आए वेरिफिकेशन लिंक को कन्फर्म करें।'
          );
        }
        return true;
      } catch {
        setAuthError('अकाउंट बनाने में समस्या आई। कृपया पुनः प्रयास करें।');
        return false;
      } finally {
        setAuthBusy(false);
      }
    },
    []
  );

  const signOutUser = useCallback(async (): Promise<void> => {
    if (!supabase) return;
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      await supabase.auth.signOut();
      setAuthUser(null);
    } catch {
      setAuthError('साइन-आउट करने में समस्या आई।');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      return {};
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authUser,
        isSupabaseConfigured,
        authLoading,
        authBusy,
        authError,
        authNotice,
        clearAuthError,
        clearAuthNotice,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOutUser,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
