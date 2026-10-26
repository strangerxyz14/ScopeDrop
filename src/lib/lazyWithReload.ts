import { lazy, type ComponentType } from "react";

// Every deploy replaces the hashed chunks in dist/assets, and the Worker's SPA
// fallback answers a missing chunk with index.html (200, text/html). A tab that
// was open across a deploy therefore fails its next lazy import with
// "Failed to fetch dynamically imported module", which the ErrorBoundary shows
// as a crash. Reloading once picks up the new index.html and its new chunks.
const RELOAD_KEY = "scopedrop_chunk_reload_at";
const RELOAD_GUARD_MS = 10_000;

/** Reload the page to recover from a stale chunk; false if we just tried that. */
export function reloadForStaleChunk(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage blocked: still reload once; a loop is unlikely since a fresh
    // index.html points at chunks that exist.
  }
  window.location.reload();
  return true;
}

export function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch((err) => {
      // Keep Suspense showing its fallback while the page reloads.
      if (reloadForStaleChunk()) return new Promise<{ default: T }>(() => {});
      throw err;
    }),
  );
}
