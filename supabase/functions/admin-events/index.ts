// ============================================================
// admin-events: dormant-until-live admin surface.
// Actions: list, approve, reject.
// Authentication: caller's JWT must belong to a user whose email
// matches the ADMIN_EMAIL function secret. Uses service role
// internally to bypass RLS on pending/rejected rows.
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin =
    origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.pages.dev') || origin.endsWith('.workers.dev'))
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const adminEmail = (Deno.env.get('ADMIN_EMAIL') ?? '').trim().toLowerCase();

const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

async function requireAdmin(req: Request, corsHeaders: HeadersInit): Promise<{ email: string } | Response> {
  if (!adminEmail) {
    return new Response(
      JSON.stringify({ ok: false, error: 'admin surface is not configured (ADMIN_EMAIL unset)' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  if (!bearer) {
    return new Response(
      JSON.stringify({ ok: false, error: 'unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  const { data, error } = await authClient.auth.getUser(bearer);
  if (error || !data.user?.email) {
    return new Response(
      JSON.stringify({ ok: false, error: 'unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (data.user.email.trim().toLowerCase() !== adminEmail) {
    return new Response(
      JSON.stringify({ ok: false, error: 'forbidden' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  return { email: data.user.email };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const admin = await requireAdmin(req, corsHeaders);
  if (admin instanceof Response) return admin;

  const url = new URL(req.url);
  const action = url.searchParams.get('action') ?? 'list';

  try {
    if (action === 'list') {
      const status = url.searchParams.get('status') ?? 'pending';
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'invalid status filter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const { data, error } = await serviceClient
        .from('scheduled_events')
        .select('id, slug, title, description, starts_at, ends_at, location, city, region, image_url, registration_url, source_url, source, status, submitted_by_email, submitted_at, reviewed_at, rejection_reason')
        .eq('status', status)
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return new Response(
        JSON.stringify({ ok: true, rows: data ?? [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    if (action === 'approve' || action === 'reject') {
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ ok: false, error: 'POST required' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const body = await req.json().catch(() => ({} as Record<string, unknown>));
      const id = typeof body.id === 'string' ? body.id : null;
      if (!id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const nowIso = new Date().toISOString();
      const update: Record<string, unknown> = {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_at: nowIso,
      };
      if (action === 'reject') {
        update.rejection_reason = typeof body.rejection_reason === 'string' ? body.rejection_reason : null;
      } else {
        update.rejection_reason = null;
      }
      const { data, error } = await serviceClient
        .from('scheduled_events')
        .update(update)
        .eq('id', id)
        .select('id, status, reviewed_at, rejection_reason')
        .single();
      if (error) throw error;
      return new Response(
        JSON.stringify({ ok: true, updated: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: `unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('admin-events error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
