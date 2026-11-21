import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface VerifiedAuthUser {
  uid: string;
  email: string;
  displayName: string | null;
}

function getSupabaseServerConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return { url, anonKey, serviceRoleKey };
}

export function isSupabaseServerConfigured(): boolean {
  const { url, anonKey, serviceRoleKey } = getSupabaseServerConfig();
  return Boolean(url && (anonKey || serviceRoleKey));
}

export function createSupabaseAuthVerifier(): SupabaseClient | null {
  const { url, anonKey, serviceRoleKey } = getSupabaseServerConfig();
  const key = serviceRoleKey || anonKey;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createUserSupabaseClient(accessToken: string): SupabaseClient {
  const { url, anonKey, serviceRoleKey } = getSupabaseServerConfig();
  const key = anonKey || serviceRoleKey;
  if (!url || !key) {
    throw new Error('Supabase server environment variables are not configured.');
  }

  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function verifySupabaseToken(
  accessToken: string
): Promise<VerifiedAuthUser> {
  const client = createSupabaseAuthVerifier();
  if (!client) {
    throw new Error('Supabase authentication is not configured on the server.');
  }

  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error('Invalid or expired Supabase session token.');
  }

  const meta = data.user.user_metadata || {};
  const displayName =
    typeof meta.full_name === 'string'
      ? meta.full_name
      : typeof meta.name === 'string'
      ? meta.name
      : null;

  return {
    uid: data.user.id,
    email: data.user.email || `${data.user.id}@users.vyaparpos.local`,
    displayName,
  };
}
