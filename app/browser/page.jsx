"use client";

import { useState } from "react";
import Link from "next/link";
import { Capacitor, registerPlugin } from "@capacitor/core";

const PrivacyBrowser = registerPlugin("PrivacyBrowser");
const quickLinks = [
  { label: "YouTube Music", url: "https://music.youtube.com/", description: "Open your music home" },
  { label: "Spotify", url: "https://open.spotify.com/", description: "Open the web player" },
  { label: "SoundCloud", url: "https://soundcloud.com/", description: "Discover and listen" },
  { label: "Bandcamp", url: "https://bandcamp.com/", description: "Explore artist releases" }
];

export default function BrowserPage() {
  const [url, setUrl] = useState("https://music.youtube.com/");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const native = Capacitor.isNativePlatform();

  async function openBrowser(nextUrl = url) {
    setMessage("");
    let parsed;
    try { parsed = new URL(nextUrl.trim()); } catch { setMessage("Enter a valid HTTPS website address."); return; }
    if (parsed.protocol !== "https:" || !parsed.hostname) {
      setMessage("For security, the built-in browser opens HTTPS websites only.");
      return;
    }
    if (!native) {
      setMessage("The request-blocking browser runs in the installed Android app. Use supported embeds on the Listen page in this web preview.");
      return;
    }
    setBusy(true);
    try {
      await PrivacyBrowser.open({ url: parsed.href });
    } catch (error) {
      setMessage(error?.message || "The Android browser could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="music-tool-shell">
    <header className="tool-topbar">
      <Link className="brand tool-brand" href="/"><span className="brand-mark">p</span><span>Piko<span className="brand-light">Beats</span></span></Link>
      <div className="tool-top-actions"><Link href="/listen">Listen online</Link><Link href="/queue">Playlist queue</Link></div>
    </header>
    <section className="music-tool-content">
      <p className="eyebrow">BROWSE INSIDE PIKO</p>
      <h1>Your music, one app.</h1>
      <p className="muted tool-intro">Open a music site in Piko Beats' Android browser. A curated request filter blocks common ad and tracking endpoints; it cannot remove every ad or bypass a service's restrictions.</p>
      <form className="music-link-form" onSubmit={(event) => { event.preventDefault(); void openBrowser(); }}>
        <label htmlFor="browser-url">Website address</label>
        <div className="music-link-row"><input id="browser-url" type="url" inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" required /><button className="primary-button" disabled={busy} type="submit">{busy ? "Opening…" : "Open in Piko"} <span>↗</span></button></div>
        {message && <p className="form-error" role="status">{message}</p>}
      </form>
      <section className="provider-grid browser-shortcuts">
        {quickLinks.map((item) => <article key={item.url}><span className="provider-icon">↗</span><h2>{item.label}</h2><p>{item.description}</p><button className="text-button" onClick={() => { setUrl(item.url); void openBrowser(item.url); }}>Open in Piko →</button></article>)}
      </section>
      <div className="tool-info"><strong>{native ? "Android in-app browser" : "Android app feature"}</strong><span>{native ? "The browser opens inside this app. Filtering uses a curated host list, not a complete Brave or EasyList replacement. Some sites may limit WebView playback." : "Install the Android APK to use the native browser. In the meantime, use official embedded music players."}</span><Link href="/listen">Use supported music embeds →</Link></div>
    </section>
  </main>;
}
