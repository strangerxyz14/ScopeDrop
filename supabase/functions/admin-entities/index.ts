// ============================================================
// admin-entities: review queue for company matches the enrichment
// rules could not prove (enrichment_status unconfirmed / ambiguous).
// Actions:
//   list     GET   rows awaiting review, with their candidates and the
//                  news that introduced them
//   confirm  POST  {id, source: "wikidata" | "yc", candidate_id}
//                  records the decision and requeues the row; the next
//                  enrich-entities run fills the profile from it
//   reject   POST  {id, candidates: [{source, id}, …]}
//                  never offers these candidates for this entity again
// The decision lives in entities.enrichment.review; enrich-entities
// applies it, so the matching rules stay in one place.
// Authentication: same as admin-events — the caller's JWT must belong
// to the user whose email matches the ADMIN_EMAIL function secret.
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

const LIST_LIMIT = 100;
const SOURCES = new Set(['wikidata', 'yc']);

interface Candidate {
  source: 'wikidata' | 'yc';
  id: string;
}

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

function isCandidate(x: unknown): x is Candidate {
  const c = x as Candidate;
  return !!c && typeof c.id === 'string' && c.id.length > 0 && c.id.length < 64 && SOURCES.has(c.source);
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const admin = await requireAdmin(req, corsHeaders);
  if (admin instanceof Response) return admin;

  const url = new URL(req.url);
  const action = url.searchParams.get('action') ?? 'list';

  try {
    if (action === 'list') {
      const { data: rows, error } = await serviceClient
        .from('entities')
        .select('id, name, entity_type, enrichment_status, enrichment, enriched_at')
        .in('enrichment_status', ['unconfirmed', 'ambiguous'])
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT);
      if (error) throw error;
      // Rows already confirmed are waiting for the next enrichment run.
      // deno-lint-ignore no-explicit-any
      const pending = (rows ?? []).filter((r: any) => !r.enrichment?.review?.confirm);

      // The news that introduced each entity, so the reviewer can judge.
      const ids = pending.map((r) => r.id);
      const news = new Map<string, { one_liner: string | null; source_url: string | null; announced_at: string | null }>();
      if (ids.length > 0) {
        const cols = 'one_liner, source_url, announced_at, primary_entity_id, counterparty_entity_id';
        const [asPrimary, asCounterparty] = await Promise.all([
          serviceClient.from('capital_events').select(cols).in('primary_entity_id', ids).order('announced_at', { ascending: false }),
          serviceClient.from('capital_events').select(cols).in('counterparty_entity_id', ids).order('announced_at', { ascending: false }),
        ]);
        for (const e of [...(asPrimary.data ?? []), ...(asCounterparty.data ?? [])]) {
          for (const id of [e.primary_entity_id, e.counterparty_entity_id]) {
            if (id && ids.includes(id) && !news.has(id)) news.set(id, e);
          }
        }
      }
      return json({ ok: true, rows: pending.map((r) => ({ ...r, news: news.get(r.id) ?? null })) });
    }

    if (req.method !== 'POST') return json({ ok: false, error: 'POST required' }, 405);
    const body = await req.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return json({ ok: false, error: 'id required' }, 400);

    const { data: row, error: rowErr } = await serviceClient
      .from('entities')
      .select('id, enrichment')
      .eq('id', id)
      .maybeSingle();
    if (rowErr) throw rowErr;
    if (!row) return json({ ok: false, error: 'not found' }, 404);
    const enrichment = (row.enrichment ?? {}) as Record<string, unknown> & { review?: { rejected?: Candidate[] } };
    const rejected: Candidate[] = Array.isArray(enrichment.review?.rejected) ? enrichment.review!.rejected! : [];
    const reviewedBy = admin.email;
    const reviewedAt = new Date().toISOString();

    if (action === 'confirm') {
      const candidate = { source: body.source, id: body.candidate_id };
      if (!isCandidate(candidate)) return json({ ok: false, error: 'source and candidate_id required' }, 400);
      const { error } = await serviceClient.from('entities').update({
        enrichment: { ...enrichment, review: { confirm: candidate, rejected, reviewed_by: reviewedBy, reviewed_at: reviewedAt } },
        // Requeue: enrich-entities takes never-enriched rows first.
        enriched_at: null,
      }).eq('id', id);
      if (error) throw error;
      return json({ ok: true, updated: id });
    }

    if (action === 'reject') {
      const candidates = Array.isArray(body.candidates) ? body.candidates.filter(isCandidate) : [];
      if (candidates.length === 0) return json({ ok: false, error: 'candidates required' }, 400);
      const merged = [...rejected];
      for (const c of candidates) {
        if (!merged.some((r) => r.source === c.source && r.id === c.id)) merged.push({ source: c.source, id: c.id });
      }
      const { error } = await serviceClient.from('entities').update({
        enrichment: { ...enrichment, review: { confirm: null, rejected: merged, reviewed_by: reviewedBy, reviewed_at: reviewedAt } },
        enrichment_status: 'no_match',
        enriched_at: reviewedAt,
      }).eq('id', id);
      if (error) throw error;
      return json({ ok: true, updated: id });
    }

    return json({ ok: false, error: `unknown action: ${action}` }, 400);
  } catch (e) {
    console.error('admin-entities error:', e);
    const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e);
    return json({ ok: false, error: message }, 500);
  }
});
