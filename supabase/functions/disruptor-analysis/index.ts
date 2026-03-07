import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// DEPRECATED: This function has been replaced by generate-content (Groq pipeline).
// Kept as a stub to prevent 404s from any lingering cron jobs.
serve(async () => {
  return new Response(
    JSON.stringify({
      deprecated: true,
      message: "disruptor-analysis has been replaced by generate-content. Update your cron jobs.",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
