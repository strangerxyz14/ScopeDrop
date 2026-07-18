import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Status = "idle" | "loading" | "ok" | "err";

export function NewsletterBlock() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("err");
      setMessage("Enter a valid email.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    const { error } = await supabase
      .from("subscribers")
      .insert({ email: trimmed, source: "home" });
    if (error) {
      const isDup = /duplicate|unique/i.test(error.message);
      setStatus(isDup ? "ok" : "err");
      setMessage(isDup ? "You're already on the list." : "Couldn't subscribe. Try again shortly.");
      return;
    }
    setStatus("ok");
    setMessage("Subscribed. First edition inbound.");
    setEmail("");
  }

  return (
    <section className="nl" id="nl" aria-labelledby="nl-title">
      <span className="lh">Newsletter · Get Your Scope</span>
      <h3 id="nl-title">The week, structured.</h3>
      <p>
        Every round, every acquisition, one new concept, and the three stories that mattered. Weekdays
        through the launch month. Weekly after that.
      </p>
      <form className="nl-form" onSubmit={onSubmit}>
        <label htmlFor="nl-email" className="sr-only" style={{ position: "absolute", left: -9999 }}>
          Email address
        </label>
        <input
          id="nl-email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === "loading"}
        />
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {message && (
        <div className={`nl-msg${status === "err" ? " err" : ""}`} role="status">
          {message}
        </div>
      )}
    </section>
  );
}
