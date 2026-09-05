import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] || '';
  }
  return '';
};

const supabaseUrl =
  getEnv('NEXT_PUBLIC_SUPABASE_URL') ||
  getEnv('SUPABASE_URL') ||
  '';

const supabasePublishableKey =
  getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  getEnv('SUPABASE_ANON_KEY') ||
  '';

// Security check: Ensure secret/service_role keys are NEVER exposed to browser
const isServiceRoleKey = (key: string): boolean => {
  if (!key) return false;
  // Supabase service_role keys typically have role "service_role" in JWT or are prefixed/named so
  return key.toLowerCase().includes('service_role');
};

if (isServiceRoleKey(supabasePublishableKey)) {
  console.error(
    '[Supabase Security Alert] service_role key must NEVER be used on the client-side! Client initialization halted.'
  );
}

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
    supabasePublishableKey &&
    !isServiceRoleKey(supabasePublishableKey)
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
