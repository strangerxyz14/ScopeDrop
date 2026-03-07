import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// DEPRECATED: This function has been replaced by ingest-signals + generate-content (Groq pipeline).
// Kept as a stub to prevent 404s from any lingering references.
serve(async () => {
  return new Response(
    JSON.stringify({
      deprecated: true,
      message: "content-orchestrator-v2 has been replaced by ingest-signals and generate-content.",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
