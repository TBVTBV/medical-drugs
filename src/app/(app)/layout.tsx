'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BottomNav from '@/components/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabaseUser, dbUser, loading, authError, signOut } = useAuth();
  const router = useRouter();
  const [showSlow, setShowSlow] = useState(false);

  useEffect(() => {
    if (!loading && !supabaseUser) {
      router.push('/login');
    }
  }, [supabaseUser, loading, router]);

  // Show a hint after 3 seconds if still loading
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setShowSlow(true), 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-pulse text-muted">Loading...</div>
          {showSlow && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted">Taking longer than expected...</p>
              <button
                onClick={() => router.push('/login')}
                className="text-xs px-3 py-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors text-foreground"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
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
