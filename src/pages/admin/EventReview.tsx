// ============================================================
// EventReview: unlinked admin surface. Reachable only at
// /admin/events; server-side ADMIN_EMAIL check enforces access.
// Intentionally not linked from any nav, footer, or sitemap.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { BackToTop } from "@/components/home/BackToTop";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatEventDate } from "@/components/home/utils";
import "@/components/home/theme.css";

type Status = "pending" | "approved" | "rejected";

interface AdminEventRow {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  city: string | null;
  region: string | null;
  image_url: string | null;
  registration_url: string | null;
  source_url: string | null;
  source: string | null;
  status: Status;
  submitted_by_email: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

async function invokeAdmin(action: string, method: "GET" | "POST", body?: unknown): Promise<{ ok: boolean; rows?: AdminEventRow[]; updated?: unknown; error?: string; status: number }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, error: "not signed in", status: 401 };

  const url = `${(import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, "")}/functions/v1/admin-events?action=${encodeURIComponent(action)}${method === "GET" ? "" : ""}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ...json, status: res.status };
}

const EventReview = () => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState<Status>("pending");
  const [rows, setRows] = useState<AdminEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectionDrafts, setRejectionDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const url = `${(import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, "")}/functions/v1/admin-events?action=list&status=${statusFilter}`;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setLoading(false);
      setError("not signed in");
      return;
    }
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.status === 403) setError("This account is not authorized to review events.");
      else if (res.status === 401) setError("Session expired. Sign in again.");
      else if (res.status === 503) setError("Admin surface not configured yet (ADMIN_EMAIL unset).");
      else if (!json.ok) setError(json.error ?? "unknown error");
      else setRows(json.rows ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) void load();
  }, [authLoading, isAuthenticated, load]);

  async function approve(id: string) {
    setBusyId(id);
    const r = await invokeAdmin("approve", "POST", { id });
    setBusyId(null);
    if (!r.ok) alert(`Approve failed: ${r.error ?? "unknown"}`);
    else void load();
  }

  async function reject(id: string) {
    const reason = rejectionDrafts[id]?.trim() || null;
    setBusyId(id);
    const r = await invokeAdmin("reject", "POST", { id, rejection_reason: reason });
    setBusyId(null);
    if (!r.ok) alert(`Reject failed: ${r.error ?? "unknown"}`);
    else void load();
  }

  const authGate = useMemo(() => {
    if (authLoading) return "Loading…";
    if (!isAuthenticated) return "Sign in required. This page is not publicly reachable.";
    return null;
  }, [authLoading, isAuthenticated]);

  return (
    <div className="sdvg">
      <SEO
        title="Event review — ScopeDrop admin"
        description=""
        keywords={[]}
      />
      <SiteHeader />
      <main>
        <div className="masthead">
          <div className="wrap mh">
            <div className="l">
              <span>ADMIN · EVENT REVIEW</span>
            </div>
            <div className="r">
              <span className="mono">{user?.email ?? ""}</span>
            </div>
          </div>
        </div>

        <section className="ev-sec">
          <div className="wrap">
            {authGate ? (
              <div className="sd-empty">
                <span className="k">{authGate}</span>
              </div>
            ) : (
              <>
                <div className="sec-h">
                  <h3>
                    Submissions
                    <span className="geo" role="tablist">
                      {(["pending", "approved", "rejected"] as Status[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          role="tab"
                          aria-selected={s === statusFilter}
                          className={s === statusFilter ? "on" : ""}
                          onClick={() => setStatusFilter(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </span>
                  </h3>
                  <button
                    type="button"
                    className="more"
                    onClick={() => void load()}
                    style={{ background: "transparent", border: 0, cursor: "pointer" }}
                  >
                    Refresh →
                  </button>
                </div>

                {loading ? (
                  <div className="sd-empty" aria-busy="true">
                    <span className="k">Loading…</span>
                  </div>
                ) : error ? (
                  <div className="sd-empty">
                    <span className="k">Error</span>
                    <p>{error}</p>
                  </div>
                ) : rows.length === 0 ? (
                  <div className="sd-empty">
                    <span className="k">No {statusFilter} events</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {rows.map((r) => (
                      <div key={r.id} className="ev" style={{ padding: 24, cursor: "default" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
                          <div style={{ flex: 1 }}>
                            <div className="d">{formatEventDate(r.starts_at)}</div>
                            <h4 style={{ marginBottom: 8 }}>{r.title}</h4>
                            {r.description && (
                              <p style={{ color: "var(--fg-mute)", fontSize: 13.5, marginBottom: 10, lineHeight: 1.5 }}>
                                {r.description.length > 300 ? r.description.slice(0, 300) + "…" : r.description}
                              </p>
                            )}
                            <div className="loc" style={{ marginBottom: 8 }}>
                              {[r.city, r.location, r.source].filter(Boolean).join(" · ").toUpperCase()}
                            </div>
                            <div style={{ display: "flex", gap: 16, fontSize: 12, fontFamily: "'IBM Plex Mono', ui-monospace, monospace", color: "var(--fg-mute)" }}>
                              {r.submitted_by_email && <span>SUBMITTER: {r.submitted_by_email}</span>}
                              {r.submitted_at && <span>AT: {new Date(r.submitted_at).toLocaleString()}</span>}
                              {r.source_url && (
                                <a
                                  href={r.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: "var(--parrot)" }}
                                >
                                  SOURCE ↗
                                </a>
                              )}
                            </div>
                            {r.status === "rejected" && r.rejection_reason && (
                              <div style={{ marginTop: 10, fontSize: 12, color: "var(--amber)", fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                                REJECTED: {r.rejection_reason}
                              </div>
                            )}
                          </div>
                          {statusFilter === "pending" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
                              <button
                                type="button"
                                onClick={() => void approve(r.id)}
                                disabled={busyId === r.id}
                                style={{
                                  background: "var(--parrot)",
                                  color: "var(--ink)",
                                  border: 0,
                                  padding: "8px 16px",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                {busyId === r.id ? "…" : "Approve"}
                              </button>
                              <input
                                type="text"
                                placeholder="Reason (optional)"
                                value={rejectionDrafts[r.id] ?? ""}
                                onChange={(e) =>
                                  setRejectionDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))
                                }
                                style={{
                                  background: "var(--oxford)",
                                  border: "1px solid var(--line)",
                                  color: "var(--fg-2)",
                                  padding: "6px 10px",
                                  fontSize: 12,
                                  fontFamily: "inherit",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => void reject(r.id)}
                                disabled={busyId === r.id}
                                style={{
                                  background: "transparent",
                                  color: "var(--amber)",
                                  border: "1px solid var(--amber)",
                                  padding: "8px 16px",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                {busyId === r.id ? "…" : "Reject"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
};

export default EventReview;
