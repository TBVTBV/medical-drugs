'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function SettingsTab() {
  const { theme, setTheme } = useTheme();
  const { signOut, dbUser } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="space-y-6">
      {/* User info */}
      {dbUser && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h2 className="text-sm font-medium text-muted mb-2">Logged in as</h2>
          <p className="text-foreground font-medium">{dbUser.full_name}</p>
          <p className="text-sm text-muted">{dbUser.email}</p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-2 ${
            dbUser.system_role === 'Admin'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            {dbUser.system_role.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Theme Selection */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">Theme</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
              theme === 'light'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-card-border text-muted hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-card-border text-muted hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            Dark
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
      >
        Logout
      </button>
    </div>
  );
}
