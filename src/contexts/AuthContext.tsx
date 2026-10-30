import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { checkIsRegularUser, type AccountType } from '../utils/userType';

export interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  company_website: string | null;
  subscription_expires_at: string | null;
  plan_type: string | null;
  is_blocked: boolean | null;
  is_paid: boolean | null;
  account_type?: AccountType;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isRegularUser: boolean;
  accountType: AccountType;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const cached = localStorage.getItem('cached_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  
  // Synchronous loading check: if currently in an OAuth callback or if a token is in localStorage, show loader
  const [loading, setLoading] = useState(() => {
    try {
      // Check if we are returning from a Supabase OAuth flow (Google, GitHub, etc)
      const hasHashToken = window.location.hash.includes('access_token=') || window.location.hash.includes('id_token=') || window.location.hash.includes('error=');
      const hasQueryCode = window.location.search.includes('code=');
      if (hasHashToken || hasQueryCode) {
        return true;
      }

      const keys = Object.keys(localStorage);
      const hasToken = keys.some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      return hasToken;
    } catch {
      return true;
    }
  });

  const fetchProfile = async (userId: string, userEmail?: string, userFullName?: string, userMetadata?: any) => {
    try {
      // 5-second timeout for background profile fetches
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => 
        setTimeout(() => resolve({ data: null, error: new Error('Profile fetch timeout') }), 5000)
      );

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      let { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as { data: any, error: any };

      // Self-heal: If profile record is missing for this user, auto-create it
      if (error && error.code === 'PGRST116') {
        try {
          const { data: newProfile } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              full_name: userFullName || null,
              company_email: userEmail || null,
            })
            .select()
            .single();
          if (newProfile) {
            data = newProfile;
            error = null;
          }
        } catch {
          // ignore auto-creation fallback error
        }
      }

      if (error) {
        return null;
      }

      if (data) {
        // Resolve account_type from user_metadata, system_settings, or defaults
        let resolvedType: AccountType = (userMetadata?.account_type as any) || null;
        if (!resolvedType) {
          try {
            const { data: stData } = await supabase
              .from('system_settings')
              .select('*')
              .eq('key', 'user_account_types')
              .single();
            if (stData?.value && stData.value[userId]) {
              resolvedType = stData.value[userId] as AccountType;
            }
          } catch {
            // ignore settings fetch error
          }
        }
        if (!resolvedType) {
          resolvedType = checkIsRegularUser({ id: userId, email: userEmail }, data) ? 'regular' : 'ca';
        }
        (data as any).account_type = resolvedType;

        try {
          localStorage.setItem('cached_profile', JSON.stringify(data));
        } catch (e) {
          console.error('Error caching profile:', e);
        }
      }
      return data;
    } catch {
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const data = await fetchProfile(user.id, user.email, user.user_metadata?.full_name, user.user_metadata);
      setProfile(data);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setLoading(false);
        return { error };
      }

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        const profileData = await fetchProfile(data.user.id, data.user.email, data.user.user_metadata?.full_name, data.user.user_metadata);
        if (profileData) {
          setProfile(profileData);
        }
      }
      setLoading(false);
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err };
    }
  };

  useEffect(() => {
    let mounted = true;

    const finishLoading = () => {
      if (mounted) setLoading(false);
    };

    async function initializeAuth() {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          // Fetch profile in parallel in the background without awaiting it!
          fetchProfile(initialSession.user.id, initialSession.user.email, initialSession.user.user_metadata?.full_name, initialSession.user.user_metadata).then((profileData) => {
            if (mounted && profileData) setProfile(profileData);
          });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        finishLoading();
      }
    }

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser.email, currentUser.user_metadata?.full_name, currentUser.user_metadata).then((profileData) => {
          if (mounted && profileData) setProfile(profileData);
        });
      } else {
        setProfile(null);
        try {
          localStorage.removeItem('cached_profile');
        } catch {
          // ignore localStorage cleanup errors
        }
      }
      
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        finishLoading();
      }
    });

    // Safety timeout: Never stay loading longer than 1 second (5 seconds during OAuth callback to allow exchange)
    const isOAuth = window.location.hash.includes('access_token=') || window.location.hash.includes('id_token=') || window.location.search.includes('code=');
    const timeoutDuration = isOAuth ? 5000 : 1000;
    const timeout = setTimeout(finishLoading, timeoutDuration);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      try {
        localStorage.removeItem('cached_profile');
        localStorage.removeItem('cached_dashboard_company');
        localStorage.removeItem('cached_dashboard_stats');
        localStorage.removeItem('cached_parties');
        localStorage.removeItem('cached_balance_sheet');
        localStorage.removeItem('cached_parties_report');
      } catch {
        // ignore localStorage cleanup errors
      }
    } finally {
      setLoading(false);
    }
  };

  const isRegularUser = checkIsRegularUser(user, profile);
  const accountType: AccountType = isRegularUser ? 'regular' : 'ca';

  return (
    <AuthContext.Provider value={{ session, user, profile, isRegularUser, accountType, loading, signIn, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
