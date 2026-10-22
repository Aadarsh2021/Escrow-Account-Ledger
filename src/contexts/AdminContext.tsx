import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AdminContextType {
  isAdminAuthenticated: boolean;
  isInitializing: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType>({
  isAdminAuthenticated: false,
  isInitializing: true,
  login: async () => false,
  logout: () => { },
});

export const ADMIN_EMAIL = 'escrow.bms@gmail.com';

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          const isAuthed = session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
          setIsAdminAuthenticated(isAuthed);
        }
      } catch (error) {
        console.error('Error checking admin session:', error);
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        const isAuthed = session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        setIsAdminAuthenticated(isAuthed);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const cleanEmail = username.trim().toLowerCase();
      if (cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
        return false;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) throw error;
      if (data.user && data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setIsAdminAuthenticated(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Admin login error:', err);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out admin:', err);
    }
    setIsAdminAuthenticated(false);
  };

  return (
    <AdminContext.Provider value={{ isAdminAuthenticated, isInitializing, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
