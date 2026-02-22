/**
 * Supabase client for Auth, Database, and Realtime.
 * Uses EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY from env.
 * Client is created lazily only when configured, so the app runs without env vars.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './database.types';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

let clientInstance: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (clientInstance) return clientInstance;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('supabaseUrl is required.');
  }
  clientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return clientInstance;
}

/**
 * Singleton Supabase client. Created only when URL and key are set; access only when isSupabaseConfigured() is true.
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return (getClient() as Record<string, unknown>)[prop as string];
  },
});

/** Whether Supabase is configured (URL and key non-empty). */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
