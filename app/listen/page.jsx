"use client";

import { useState } from "react";
import Link from "next/link";

function parseMusicLink(value) {
  let url;
  try { url = new URL(value.trim()); } catch { return { error: "Enter a valid HTTPS music link." }; }
  if (url.protocol !== "https:") return { error: "Only HTTPS music links are accepted." };

  const host = url.hostname.toLowerCase();
  const path = url.pathname.split("/").filter(Boolean);

  if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be"].includes(host)) {
    const videoId = host === "youtu.be" ? path[0] : url.searchParams.get("v");
    const playlistId = url.searchParams.get("list");
    if (playlistId && /^[\w-]{5,}$/.test(playlistId)) {
      return { provider: "YouTube", sourceUrl: url.href, embedUrl: `https://www.youtube-nocookie.com/embed?listType=playlist&list=${encodeURIComponent(playlistId)}&playsinline=1&rel=0` };
    }
    if (videoId && /^[\w-]{6,}$/.test(videoId)) {
      return { provider: "YouTube", sourceUrl: url.href, embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?playsinline=1&rel=0` };
    }
    return { error: "That YouTube link doesn't contain a recognizable video or playlist ID." };
  }

  if (host === "open.spotify.com") {
    const types = new Set(["track", "playlist", "album", "artist", "episode", "show"]);
    const index = path.findIndex((part) => types.has(part));
    const id = index >= 0 ? path[index + 1] : "";
    if (!id || !/^[\w-]+$/.test(id)) return { error: "Use a Spotify track, album, artist, episode, show, or playlist link." };
    const type = path[index];
    const height = ["track", "episode"].includes(type) ? 152 : 352;
    return { provider: "Spotify", sourceUrl: url.href, embedUrl: `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}?utm_source=generator`, height };
  }

  if (["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"].includes(host)) {
    if (!path.length) return { error: "Paste a SoundCloud track or playlist link." };
    return { provider: "SoundCloud", sourceUrl: url.href, embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.href)}&auto_play=false&hide_related=false&show_comments=true&show_user=true&visual=true`, height: 300 };
  }

  return { error: "Supported sources are YouTube / YouTube Music, Spotify, and SoundCloud. Paste a link to a specific item or playlist." };
}

export default function ListenPage() {
  const [input, setInput] = useState("");
  const [selection, setSelection] = useState(null);
  const [error, setError] = useState("");

  function loadLink(event) {
    event.preventDefault();
    const result = parseMusicLink(input);
    if (result.error) { setError(result.error); setSelection(null); return; }
    setError("");
    setSelection(result);
  }

  return <main className="music-tool-shell">
    <header className="tool-topbar">
      <Link className="brand tool-brand" href="/"><span className="brand-mark">p</span><span>Piko<span className="brand-light">Beats</span></span></Link>
      <div className="tool-top-actions"><Link href="/queue">Playlist queue</Link><Link href="/auth">Account</Link></div>
    </header>
    <section className="music-tool-content">
      <p className="eyebrow">LISTEN ONLINE</p>
      <h1>Bring your music in.</h1>
      <p className="muted tool-intro">Paste a music or playlist link and play it through the provider's official embedded player, right here in Piko Beats.</p>
      <form className="music-link-form" onSubmit={loadLink}>
        <label htmlFor="music-url">Music link</label>
        <div className="music-link-row"><input id="music-url" type="url" inputMode="url" placeholder="https://music.youtube.com/playlist?list=…" value={input} onChange={(event) => setInput(event.target.value)} required /><button className="primary-button" type="submit">Load player <span>→</span></button></div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
      {selection ? <section className="embed-card" aria-label={`${selection.provider} music player`}>
        <div className="embed-heading"><div><p className="eyebrow">NOW IN PIKO BEATS</p><h2>{selection.provider} player</h2></div><a href={selection.sourceUrl} target="_blank" rel="noopener noreferrer">Open source ↗</a></div>
        <iframe key={selection.embedUrl} title={`${selection.provider} embedded music player`} src={selection.embedUrl} height={selection.height || 315} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        <p className="embed-disclaimer">Playback availability, sign-in requirements, and any ads are controlled by the music service. Piko Beats does not remove provider ads or bypass download restrictions.</p>
      </section> : <section className="provider-grid">
        <article><span className="provider-icon">▶</span><h2>YouTube Music</h2><p>Paste a YouTube or YouTube Music video or playlist link. The official YouTube player handles playback.</p></article>
        <article><span className="provider-icon">◉</span><h2>Spotify</h2><p>Load a supported track, album, artist, show, episode, or playlist embed.</p></article>
        <article><span className="provider-icon">☁</span><h2>SoundCloud</h2><p>Load a track or playlist through the official SoundCloud player.</p></article>
      </section>}
      <div className="tool-info"><strong>Keep tasks for later</strong><span>Submit playlist links to your Supabase queue even while the Windows PC is off.</span><Link href="/queue">Open playlist queue →</Link></div>
    </section>
  </main>;
}
