import { createBrowserClient } from '@supabase/ssr';

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  cached = createBrowserClient(url, key, {
    isSingleton: false,
    auth: {
      // Bypass Navigator LockManager which can time out in some environments
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => {
        return await fn();
      },
    },
  });

  return cached;
}
