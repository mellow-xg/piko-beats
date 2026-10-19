"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

function validateSource(value) {
  let url;
  try { url = new URL(value.trim()); } catch { return { error: "Enter a valid playlist or music URL." }; }
  if (url.protocol !== "https:") return { error: "Only HTTPS links are accepted." };
  const host = url.hostname.toLowerCase();
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(host)) {
    if (!url.searchParams.has("list") && !url.searchParams.has("v") && host !== "youtu.be") return { error: "The YouTube link needs a video or playlist ID." };
    if (host === "youtu.be" && !url.pathname.split("/").filter(Boolean)[0]) return { error: "The YouTube link needs a video ID." };
    return { provider: "youtube", url: url.href };
  }
  if (host === "open.spotify.com") {
    if (!url.pathname.split("/").filter(Boolean).some((part) => ["track", "playlist", "album", "artist", "episode", "show"].includes(part))) return { error: "Paste a Spotify track, playlist, album, artist, episode, or show link." };
    return { provider: "spotify", url: url.href };
  }
  if (["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"].includes(host) && url.pathname.split("/").filter(Boolean).length >= 1) return { provider: "soundcloud", url: url.href };
  return { error: "Supported sources: YouTube / YouTube Music, Spotify, and SoundCloud." };
}

function statusLabel(status) {
  return ({ queued: "Waiting for PC", claimed: "Processing", completed: "Completed", failed: "Failed", cancelled: "Cancelled" })[status] || status;
}

export default function QueuePage() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [url, setUrl] = useState("");
  const [tasks, setTasks] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadTasks = useCallback(async (userId) => {
    if (!supabase || !userId) { setTasks([]); return; }
    const { data, error: queryError } = await supabase.from("processing_tasks")
      .select("id,task_type,status,payload,created_at,error_message")
      .eq("owner_id", userId).order("created_at", { ascending: false }).limit(25);
    if (queryError) { setError(queryError.message); return; }
    setTasks(data || []);
  }, []);

  useEffect(() => {
    let active = true;
    if (!supabase) { setChecking(false); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const currentUser = data.session?.user || null;
      setUser(currentUser);
      if (currentUser) await loadTasks(currentUser.id);
      if (active) setChecking(false);
    }).catch(() => { if (active) setChecking(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) void loadTasks(session.user.id);
      else setTasks([]);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [loadTasks]);

  async function submit(event) {
    event.preventDefault();
    setMessage(""); setError("");
    if (!supabase) { setError("Supabase is not configured in the app environment."); return; }
    const parsed = validateSource(url);
    if (parsed.error) { setError(parsed.error); return; }
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) { setError("Please sign in before submitting a playlist."); return; }
    setBusy(true);
    const { error: insertError } = await supabase.from("processing_tasks").insert({
      owner_id: authData.user.id,
      task_type: "sync_playlist_metadata",
      payload: { source_url: parsed.url, source_provider: parsed.provider, submitted_from: "piko_beats_android", task_intent: "metadata_only" }
    });
    setBusy(false);
    if (insertError) { setError(insertError.message); return; }
    setUrl("");
    setMessage("Playlist task saved. It will remain queued while your PC is off; processing starts when a compatible PC agent is running.");
    await loadTasks(authData.user.id);
  }

  async function cancelTask(taskId) {
    if (!supabase || !user) return;
    setError(""); setMessage("");
    const { error: updateError } = await supabase.from("processing_tasks").update({ status: "cancelled" }).eq("id", taskId).eq("owner_id", user.id).eq("status", "queued");
    if (updateError) { setError(updateError.message); return; }
    setMessage("Cancellation requested.");
    await loadTasks(user.id);
  }

  return <main className="music-tool-shell">
    <header className="tool-topbar"><Link className="brand tool-brand" href="/"><span className="brand-mark">p</span><span>Piko<span className="brand-light">Beats</span></span></Link><div className="tool-top-actions"><Link href="/listen">Listen online</Link><Link href="/auth?next=%2Fqueue">{user ? "Account" : "Sign in"}</Link></div></header>
    <section className="music-tool-content">
      <p className="eyebrow">YOUR CLOUD TASKS</p><h1>Playlist queue.</h1>
      <p className="muted tool-intro">Save playlist links now. Supabase holds each task until your Windows PC agent is running. This page queues metadata tasks only; it does not download protected audio.</p>
      {!supabase && <div className="inline-alert">Supabase is not configured. Set the public URL and publishable key in your deployment environment.</div>}
      {checking ? <div className="queue-empty">Checking your session…</div> : !user ? <div className="auth-required"><h2>Sign in to use your queue</h2><p>Your tasks are private to your account.</p><Link className="primary-button" href="/auth?next=%2Fqueue">Sign in / create account →</Link></div> : <>
        <form className="music-link-form queue-form" onSubmit={submit}>
          <label htmlFor="queue-url">Playlist or track link</label>
          <div className="music-link-row"><input id="queue-url" type="url" inputMode="url" placeholder="Paste a YouTube Music, Spotify, or SoundCloud link" value={url} onChange={(event) => setUrl(event.target.value)} required /><button className="primary-button" type="submit" disabled={busy || !supabase}>{busy ? "Saving…" : "Add to queue"} <span>＋</span></button></div>
          <p className="muted queue-hint">The PC does not need to stay on. Downloading is limited to files and sources you are authorized to download.</p>
        </form>
        {message && <p className="queue-message" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <section className="queue-section"><div className="embed-heading"><div><p className="eyebrow">LAST 25 TASKS</p><h2>Processing history</h2></div><button className="text-button" onClick={() => user && loadTasks(user.id)}>Refresh ↻</button></div>
          {tasks.length ? <div className="task-list">{tasks.map((task) => <article className="task-row" key={task.id}><div className="task-symbol">{task.status === "completed" ? "✓" : task.status === "failed" ? "!" : "♫"}</div><div className="task-details"><strong>{task.payload?.source_provider ? task.payload.source_provider[0].toUpperCase()+task.payload.source_provider.slice(1) : "Playlist"} task</strong><span>{task.payload?.source_url || task.task_type}</span><small>{new Date(task.created_at).toLocaleString()}</small>{task.error_message && <small className="form-error">{task.error_message}</small>}</div><div className={`task-status task-${task.status}`}>{statusLabel(task.status)}</div>{task.status === "queued" && <button className="cancel-task" onClick={() => cancelTask(task.id)}>Cancel</button>}</article>)}</div> : <div className="queue-empty">No tasks yet. Paste a playlist link above to create your first task.</div>}
        </section>
      </>}
      <div className="tool-info"><strong>PC agent status: not connected yet</strong><span>Cloud queueing works independently of the PC. A secure Windows agent still needs to be built before these tasks will run automatically.</span></div>
    </section>
  </main>;
}
