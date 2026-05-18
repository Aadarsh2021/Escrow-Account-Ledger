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

const ADMIN_CREDENTIALS = {
  username: 'escrow.bms@gmail.com',
  password: 'escrow12345'
};

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('admin_authenticated') === 'true';
  });
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email === ADMIN_CREDENTIALS.username) {
          setIsAdminAuthenticated(true);
          localStorage.setItem('admin_authenticated', 'true');
        } else {
          // Keep local storage check if session is still loading or if they authenticated locally
          const cached = localStorage.getItem('admin_authenticated') === 'true';
          setIsAdminAuthenticated(cached);
        }
      } catch (error) {
        console.error('Error checking admin session:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email === ADMIN_CREDENTIALS.username) {
        setIsAdminAuthenticated(true);
        localStorage.setItem('admin_authenticated', 'true');
      } else {
        setIsAdminAuthenticated(false);
        localStorage.removeItem('admin_authenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: username,
          password: password,
        });

        if (error) throw error;
        if (data.user) {
          setIsAdminAuthenticated(true);
          localStorage.setItem('admin_authenticated', 'true');
          return true;
        }
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
    localStorage.removeItem('admin_authenticated');
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
