import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// DEPRECATED: This function has been replaced by ingest-signals (Groq pipeline).
// Kept as a stub to prevent 404s from any lingering cron jobs.
serve(async () => {
  return new Response(
    JSON.stringify({
      deprecated: true,
      message: "scout-engine has been replaced by ingest-signals. Update your cron jobs.",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
