import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { GlobalLoader } from '../components/ui/GlobalLoader';

interface Profile {
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
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
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

  const fetchProfile = async (userId: string) => {
    try {
      // 1-second timeout for quick background profile fetches
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => 
        setTimeout(() => resolve({ data: null, error: new Error('Profile fetch timeout') }), 1000)
      );

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as { data: any, error: any };

      if (error) {
        console.warn('Profile fetch handled:', error.message);
        return null;
      }
      
      if (data) {
        try {
          localStorage.setItem('cached_profile', JSON.stringify(data));
        } catch (e) {
          console.error('Error caching profile:', e);
        }
      }
      return data;
    } catch (err) {
      console.error('Profile fetch exception:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const data = await fetchProfile(user.id);
      setProfile(data);
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
          fetchProfile(initialSession.user.id).then((profileData) => {
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
        fetchProfile(currentUser.id).then((profileData) => {
          if (mounted && profileData) setProfile(profileData);
        });
      } else {
        setProfile(null);
        try {
          localStorage.removeItem('cached_profile');
        } catch {}
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
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, refreshProfile, signOut }}>
      {!loading ? children : <GlobalLoader fullScreen={true} />}
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
