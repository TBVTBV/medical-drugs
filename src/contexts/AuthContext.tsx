'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '@/lib/types';

interface AuthContextType {
  supabaseUser: SupabaseUser | null;
  dbUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSupabaseUser(user);
      if (user) {
        await fetchOrCreateDbUser(user);
      }
      setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setSupabaseUser(user);
      if (user) {
        await fetchOrCreateDbUser(user);
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchOrCreateDbUser(user: SupabaseUser) {
    // Look up by email
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (existingUser) {
      // Check Temp_Admin expiration
      if (
        existingUser.system_role === 'Temp_Admin' &&
        existingUser.role_expiration_date &&
        new Date(existingUser.role_expiration_date) < new Date()
      ) {
        await supabase
          .from('users')
          .update({ system_role: 'General', role_expiration_date: null })
          .eq('id', existingUser.id);
        existingUser.system_role = 'General';
        existingUser.role_expiration_date = null;
      }
      setDbUser(existingUser);
      return;
    }

    // First user to log in becomes Admin
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const isFirstUser = (count ?? 0) === 0;

    const { data: newUser } = await supabase
      .from('users')
      .insert({
        military_id: Math.floor(1000000 + Math.random() * 9000000),
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New User',
        rank: 'Rabat',
        job: 'Other',
        phone_number: '0500000000',
        system_role: isFirstUser ? 'Admin' : 'General',
        email: user.email,
      })
      .select()
      .single();

    setDbUser(newUser);
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setDbUser(null);
    setSupabaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ supabaseUser, dbUser, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
