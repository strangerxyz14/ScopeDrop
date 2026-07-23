import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabaseLegacyAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Supabase supports two key formats: the legacy JWT anon key (starts with `eyJ`) and the new
 * `sb_publishable_...` key. Edge functions on this project have been switched to reject the
 * legacy JWT, so we prefer the new format when it's present. Both formats work for PostgREST
 * queries; only the new format works for edge function invocations.
 */
function pickClientKey(): string | undefined {
  const preferred = supabasePublishableKey?.startsWith("sb_publishable_")
    ? supabasePublishableKey
    : undefined;
  return preferred ?? supabasePublishableKey ?? supabaseLegacyAnonKey;
}

const clientKey = pickClientKey();

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

// Only decode role from legacy JWTs; new sb_publishable_ keys are opaque strings.
const tokenRole = clientKey && clientKey.startsWith("eyJ") ? decodeJwtRole(clientKey) : null;

export const supabaseConfig = {
  url: supabaseUrl ?? null,
  anonKeyPresent: Boolean(clientKey),
  keyFormat: clientKey?.startsWith("sb_publishable_") ? "publishable" : clientKey?.startsWith("eyJ") ? "legacy_jwt" : null,
  tokenRole,
  isServiceRoleKey: tokenRole === "service_role",
  isConfigured: Boolean(supabaseUrl && clientKey && tokenRole !== "service_role"),
  problems: [
    ...(supabaseUrl ? [] : ["Missing VITE_SUPABASE_URL"]),
    ...(clientKey ? [] : ["Missing VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)"]),
    ...(tokenRole === "service_role"
      ? ["Supabase key is a service_role key (frontend must use anon/publishable)."]
      : []),
  ],
} as const;

// Avoid throwing at module-import time (white-screen failure in production builds).
// When not configured, create a safe fallback client; call sites should render a visible empty state.
const FALLBACK_URL = "http://localhost:54321";
const FALLBACK_KEY = "anon-fallback-key";

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseConfig.isConfigured ? (supabaseUrl as string) : FALLBACK_URL,
  supabaseConfig.isConfigured ? (clientKey as string) : FALLBACK_KEY,
);