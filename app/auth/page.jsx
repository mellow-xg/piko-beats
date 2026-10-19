"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    if (!supabase) {
      setMessage("Supabase is not configured yet. Add the public environment variables and restart the app.");
      return;
    }
    setBusy(true);
    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined } });
      if (result.error) throw result.error;
      setMessage(mode === "signin" ? "Signed in. You can return to Piko Beats." : "Account created. Check your email if confirmation is enabled.");
    } catch (error) {
      setMessage(error.message || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell"><section className="auth-card">
    <Link className="brand auth-brand" href="/"><span className="brand-mark">p</span><span>Piko<span className="brand-light">Beats</span></span></Link>
    <p className="eyebrow">YOUR SOUND, YOUR SPACE</p>
    <h1>{mode === "signin" ? "Welcome back." : "Make it yours."}</h1>
    <p className="muted">Sign in to keep your music library connected across devices.</p>
    <form onSubmit={submit} className="auth-form">
      <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required /></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} required /></label>
      <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
    </form>
    {message && <p className="auth-message" role="status">{message}</p>}
    <button className="text-button auth-switch" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setMessage("");}}>{mode==="signin" ? "New to Piko Beats? Create an account" : "Already have an account? Sign in"}</button>
    <Link className="auth-back" href="/">← Back to Piko Beats</Link>
  </section></main>;
}
