'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import BottomNav from '@/components/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabaseUser, dbUser, loading, authError, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !supabaseUser) {
      router.push('/login');
    }
  }, [supabaseUser, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-foreground mb-2">Setup Error</h1>
          <p className="text-muted text-sm mb-4">{authError}</p>
          <p className="text-muted text-xs mb-6">
            Make sure the database tables are created. Check the browser console for details.
          </p>
          <button
            onClick={async () => { await signOut(); router.push('/login'); }}
            className="px-4 py-2 text-sm bg-stone-200 dark:bg-stone-700 rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors text-foreground"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!supabaseUser || !dbUser) {
    return null;
  }

  const isAdmin = dbUser.system_role === 'Admin' || dbUser.system_role === 'Temp_Admin';

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted text-sm">You do not have admin privileges to access this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="max-w-4xl mx-auto px-4 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
