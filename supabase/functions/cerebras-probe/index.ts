// Temporary diagnostic: list Cerebras models available on this account.
// Delete this function once we've corrected the model IDs in _shared/llm.ts.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  const key = Deno.env.get("CEREBRAS_API_KEY") ?? "";
  const res = await fetch("https://api.cerebras.ai/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});
