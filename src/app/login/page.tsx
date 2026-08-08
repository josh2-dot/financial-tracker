"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="mx-auto mt-20 max-w-sm">
      <h1 className="mb-2 text-2xl font-semibold">Finance Tracker</h1>
      <p className="mb-8 text-sm text-neutral-400">
        Sign in with a magic link.
      </p>
      {sent ? (
        <div className="card">
          <p className="text-sm">
            Check your inbox — sent a link to <b>{email}</b>.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
          />
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Sending..." : "Send magic link"}
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </form>
      )}
    </div>
  );
}
