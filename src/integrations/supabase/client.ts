import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.",
  );
}

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

const tokenRole = decodeJwtRole(supabaseAnonKey);
if (tokenRole === "service_role") {
  throw new Error("Refusing to initialize Supabase client with service_role key in frontend.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);