import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface VerifyJwtOptions {
  supabaseUrl?: string | null;
  serviceRoleKey?: string | null;
  anonKey?: string | null;
  corsHeaders: HeadersInit;
}

interface AuthContext {
  token: string;
  userId: string | null;
  role: string;
}

function unauthorized(message: string, corsHeaders: HeadersInit): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function parseBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

function decodeJwtRole(token: string): string | null {
  const segments = token.split(".");
  if (segments.length < 2) return null;

  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { role?: string };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export async function requireSupabaseJwt(
  req: Request,
  options: VerifyJwtOptions,
): Promise<AuthContext | Response> {
  const token = parseBearerToken(req);
  if (!token) {
    return unauthorized("Missing Bearer token in Authorization header.", options.corsHeaders);
  }

  if (options.serviceRoleKey && token === options.serviceRoleKey) {
    return { token, userId: null, role: "service_role" };
  }
  // The anon key is *not* a JWT. Do not accept it as a bearer token.
  // Use it only as the client key to verify real user JWTs via auth.getUser(token).
  if (!token.includes(".")) {
    return unauthorized("Expected a Supabase JWT (or service role key).", options.corsHeaders);
  }

  if (!options.supabaseUrl || (!options.serviceRoleKey && !options.anonKey)) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase credentials for JWT verification." }),
      { status: 500, headers: { ...options.corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authClient = createClient(
    options.supabaseUrl,
    options.serviceRoleKey ?? options.anonKey!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return unauthorized("Invalid or expired Supabase JWT.", options.corsHeaders);
  }

  return {
    token,
    userId: data.user.id,
    role: decodeJwtRole(token) ?? "authenticated",
  };
}
