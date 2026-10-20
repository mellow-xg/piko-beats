"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./listen-enhancements.css";

function parseMusicLink(value) {
  let url;
  try { url = new URL(value.trim()); } catch { return { error: "Enter a valid HTTPS music link." }; }
  if (url.protocol !== "https:") return { error: "Only HTTPS music links are accepted." };
  const host = url.hostname.toLowerCase();
  const path = url.pathname.split("/").filter(Boolean);

  if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be"].includes(host)) {
    const videoId = host === "youtu.be" ? path[0] : url.searchParams.get("v");
    const playlistId = url.searchParams.get("list");
    if (playlistId && /^[\w-]{5,}$/.test(playlistId)) return { provider: "YouTube / YouTube Music", sourceUrl: url.href, embedUrl: `https://www.youtube-nocookie.com/embed?listType=playlist&list=${encodeURIComponent(playlistId)}&playsinline=1&rel=0` };
    if (videoId && /^[\w-]{6,}$/.test(videoId)) return { provider: "YouTube / YouTube Music", sourceUrl: url.href, embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?playsinline=1&rel=0` };
    return { error: "That YouTube link doesn't contain a recognizable video or playlist ID." };
  }
  if (host === "open.spotify.com") {
    const types = new Set(["track", "playlist", "album", "artist", "episode", "show"]);
    const index = path.findIndex((part) => types.has(part));
    const id = index >= 0 ? path[index + 1] : "";
    if (!id || !/^[\w-]+$/.test(id)) return { error: "Use a Spotify track, album, artist, episode, show, or playlist link." };
    const type = path[index];
    return { provider: "Spotify", sourceUrl: url.href, embedUrl: `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}?utm_source=generator`, height: ["track", "episode"].includes(type) ? 152 : 352 };
  }
  if (["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"].includes(host)) {
    if (!path.length) return { error: "Paste a SoundCloud track or playlist link." };
    return { provider: "SoundCloud", sourceUrl: url.href, embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.href)}&auto_play=false&hide_related=false&show_comments=true&show_user=true&visual=true`, height: 300 };
  }
  return { error: "Supported sources are YouTube / YouTube Music, Spotify, and SoundCloud. Paste a link to a specific item or playlist." };
}

const recentKey = "piko-beats-recent-online-links";

export default function ListenPage() {
  const [input, setInput] = useState("");
  const [selection, setSelection] = useState(null);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem(recentKey) || "[]").slice(0, 4)); } catch { setRecent([]); }
  }, []);

  function loadLink(event) {
    event.preventDefault();
    const result = parseMusicLink(input);
    if (result.error) { setError(result.error); setSelection(null); return; }
    setError("");
    setSelection(result);
    const next = [{ provider: result.provider, sourceUrl: result.sourceUrl }, ...recent.filter((item) => item.sourceUrl !== result.sourceUrl)].slice(0, 4);
    setRecent(next);
    try { localStorage.setItem(recentKey, JSON.stringify(next)); } catch {}
  }

  function useRecent(item) { setInput(item.sourceUrl); setError(""); inputRef.current?.focus(); }

  return <main className="music-tool-shell listen-refresh">
    <header className="tool-topbar">
      <Link className="brand tool-brand" href="/"><span className="brand-mark">p</span><span>Piko<span className="brand-light">Beats</span></span></Link>
      <div className="tool-top-actions"><Link href="/browser">Piko Browser</Link><Link href="/queue">Playlist queue</Link><Link href="/auth">Account</Link></div>
    </header>
    <section className="music-tool-content listen-content">
      <div className="listen-hero">
        <div className="listen-hero-copy">
          <span className="listen-live-label"><span /> YOUR MUSIC, ONE PLACE</span>
          <p className="eyebrow">LISTEN ONLINE</p>
          <h1>Press play.<br /><em>Find your flow.</em></h1>
          <p className="muted tool-intro">Bring a track, album, or playlist from your favourite music service into Piko Beats.</p>
          <div className="listen-hero-actions"><a className="primary-button listen-main-cta" href="#add-music">▶ &nbsp; Listen online <span>↓</span></a><Link className="listen-secondary-cta" href="/queue">View playlist queue ↗</Link></div>
          <div className="listen-benefits"><span>♫ Official players</span><span>◷ Recent links</span><span>☁ Queue for later</span></div>
        </div>
        <div className="listen-visual" aria-hidden="true"><div className="listen-ring ring-one" /><div className="listen-ring ring-two" /><div className="listen-vinyl"><span>p</span></div><span className="listen-float float-one">♫</span><span className="listen-float float-two">♪</span></div>
      </div>

      <section className="listen-add-section" id="add-music">
        <div className="listen-section-heading"><div><p className="eyebrow">START LISTENING</p><h2>What do you want to play?</h2><p className="muted">Paste a link to load the service&apos;s official player.</p></div><span className="listen-step">01 / PLAY</span></div>
        <form className="music-link-form listen-form" onSubmit={loadLink}>
          <label htmlFor="music-url">Music or playlist URL</label>
          <div className="music-link-row"><span className="listen-link-icon">↗</span><input ref={inputRef} id="music-url" type="url" inputMode="url" placeholder="Paste a YouTube Music, Spotify, or SoundCloud link…" value={input} onChange={(event) => setInput(event.target.value)} required /><button className="primary-button" type="submit">Load player <span>→</span></button></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="listen-provider-pills"><span>SUPPORTED</span><b><i className="yt-dot">▶</i> YouTube Music</b><b><i className="sp-dot">◉</i> Spotify</b><b><i className="sc-dot">☁</i> SoundCloud</b></div>
        </form>
      </section>

      {selection ? <section className="embed-card listen-embed-card" aria-label={`${selection.provider} music player`}>
        <div className="embed-heading"><div><p className="eyebrow">NOW IN PIKO BEATS</p><h2>{selection.provider}</h2><span className="listen-source-url">{selection.sourceUrl}</span></div><a href={selection.sourceUrl} target="_blank" rel="noopener noreferrer">Open source ↗</a></div>
        <iframe key={selection.embedUrl} title={`${selection.provider} embedded music player`} src={selection.embedUrl} height={selection.height || 315} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        <p className="embed-disclaimer">The provider controls playback, sign-in, and ads. The browser ad filter does not apply inside this embedded player, and YouTube Music ads cannot be reliably blocked by a WebView filter. Use <Link href="/browser">Piko Browser</Link> for supported browser filtering; it still cannot guarantee removal of YouTube-served ads.</p>
      </section> : <section className="listen-provider-grid" aria-label="Supported music services">
        <article className="listen-provider-card listen-youtube"><span className="listen-provider-symbol">▶</span><span className="listen-card-kicker">VIDEO + PLAYLISTS</span><h2>YouTube Music</h2><p>Paste a music video or playlist URL to load the official YouTube player.</p><div className="listen-provider-actions"><button type="button" onClick={() => { setInput(""); document.getElementById("music-url")?.focus(); }}>Paste a link <span>→</span></button><a href="https://music.youtube.com/" target="_blank" rel="noopener noreferrer">Open service ↗</a></div></article>
        <article className="listen-provider-card listen-spotify"><span className="listen-provider-symbol">◉</span><span className="listen-card-kicker">TRACKS + ALBUMS</span><h2>Spotify</h2><p>Open supported track, album, artist, show, episode, and playlist embeds.</p><div className="listen-provider-actions"><button type="button" onClick={() => { setInput(""); document.getElementById("music-url")?.focus(); }}>Paste a link <span>→</span></button><a href="https://open.spotify.com/" target="_blank" rel="noopener noreferrer">Open service ↗</a></div></article>
        <article className="listen-provider-card listen-soundcloud"><span className="listen-provider-symbol">☁</span><span className="listen-card-kicker">INDEPENDENT MUSIC</span><h2>SoundCloud</h2><p>Load tracks and playlists through the official SoundCloud player.</p><div className="listen-provider-actions"><button type="button" onClick={() => { setInput(""); document.getElementById("music-url")?.focus(); }}>Paste a link <span>→</span></button><a href="https://soundcloud.com/" target="_blank" rel="noopener noreferrer">Open service ↗</a></div></article>
      </section>}

      {recent.length > 0 && <section className="listen-recent"><div className="listen-section-heading"><div><p className="eyebrow">PICK UP WHERE YOU LEFT OFF</p><h2>Recent links</h2></div><button className="listen-clear" type="button" onClick={() => { setRecent([]); try { localStorage.removeItem(recentKey); } catch {} }}>Clear history</button></div><div className="listen-recent-list">{recent.map((item) => <button key={item.sourceUrl} type="button" className="listen-recent-item" onClick={() => useRecent(item)}><span className="recent-play">▶</span><span><strong>{item.provider}</strong><small>{item.sourceUrl}</small></span><b>Use link ↗</b></button>)}</div></section>}

      <section className="listen-queue-banner"><div className="queue-banner-icon">☁</div><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Save a playlist for later</h2><p>Add supported playlist links to your private queue. Your Windows PC can pick up queued metadata tasks when it is online.</p></div><Link href="/queue" className="primary-button">Open my queue <span>→</span></Link></section>
      <p className="listen-footnote">Piko Beats uses official provider players. Playback and availability may depend on your region, account, or provider settings.</p>
    </section>
  </main>;
}
