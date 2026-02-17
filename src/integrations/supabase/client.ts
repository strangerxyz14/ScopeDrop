import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Avoid storing auth sessions in localStorage (tokens are sensitive).
// sessionStorage is still client-side storage, but it is non-persistent and reduces exposure.
const authStorage = {
  getItem: (key: string) => (typeof window !== "undefined" ? window.sessionStorage.getItem(key) : null),
  setItem: (key: string, value: string) => {
    if (typeof window !== "undefined") window.sessionStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(key);
  },
};

function decodeJwtRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded)) as { role?: string };
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

const tokenRole = supabaseAnonKey ? decodeJwtRole(supabaseAnonKey) : null;

export const supabaseConfig = {
  url: supabaseUrl ?? null,
  anonKeyPresent: Boolean(supabaseAnonKey),
  tokenRole,
  isServiceRoleKey: tokenRole === "service_role",
  isConfigured: Boolean(supabaseUrl && supabaseAnonKey && tokenRole !== "service_role"),
  problems: [
    ...(supabaseUrl ? [] : ["Missing VITE_SUPABASE_URL"]),
    ...(supabaseAnonKey ? [] : ["Missing VITE_SUPABASE_ANON_KEY"]),
    ...(tokenRole === "service_role"
      ? ["VITE_SUPABASE_ANON_KEY is a service_role key (frontend must use anon)."]
      : []),
  ],
} as const;

// Avoid throwing at module-import time (white-screen failure in production builds).
// When not configured, create a safe fallback client; call sites should render a visible empty state.
const FALLBACK_URL = "http://localhost:54321";
const FALLBACK_KEY = "anon-fallback-key";

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseConfig.isConfigured ? (supabaseUrl as string) : FALLBACK_URL,
  supabaseConfig.isConfigured ? (supabaseAnonKey as string) : FALLBACK_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: authStorage as any,
    },
  },
);