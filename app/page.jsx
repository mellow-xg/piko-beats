"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const tracks = [
  { id: 1, title: "Midnight Drive", artist: "Nova Bloom", genre: "Electronic", color: "violet", duration: "3:42" },
  { id: 2, title: "Soft Focus", artist: "The Still Hours", genre: "Lo-fi", color: "blue", duration: "2:58" },
  { id: 3, title: "Golden", artist: "Mira Sol", genre: "Indie", color: "amber", duration: "3:16" },
  { id: 4, title: "After the Rain", artist: "Low Tide", genre: "Chill", color: "teal", duration: "4:05" },
  { id: 5, title: "Little by Little", artist: "June Arcade", genre: "Indie", color: "pink", duration: "3:33" },
  { id: 6, title: "Cloud Signals", artist: "Kairo", genre: "Electronic", color: "indigo", duration: "3:51" }
];

const mixes = [
  { title: "Quiet Hours", subtitle: "Soft sounds for slowing down", color: "mix-one", icon: "☾" },
  { title: "Deep Focus", subtitle: "Stay in your own rhythm", color: "mix-two", icon: "◉" },
  { title: "On the Move", subtitle: "A little energy for the day", color: "mix-three", icon: "↗" }
];

function Cover({ color = "violet", small = false }) {
  return <div className={`cover cover-${color} ${small ? "cover-small" : ""}`} aria-hidden="true"><span>♫</span></div>;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("Home");
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(null);
  const [liked, setLiked] = useState([]);
  const [notice, setNotice] = useState("");

  const visibleTracks = useMemo(() => tracks.filter((track) =>
    `${track.title} ${track.artist} ${track.genre}`.toLowerCase().includes(query.toLowerCase())
  ), [query]);

  function playTrack(track) {
    setCurrent(track);
    setNotice("Demo track selected. Connect an authorized music catalog to enable audio playback.");
    window.setTimeout(() => setNotice(""), 4200);
  }

  function toggleLike(id) {
    setLiked((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setActiveTab("Home")} aria-label="Piko Beats home">
          <span className="brand-mark">p</span><span>Piko<span className="brand-light">Beats</span></span>
        </a>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          {[
            ["Home", "⌂"], ["Search", "⌕"], ["Your Library", "▤"], ["Liked Songs", "♡"]
          ].map(([label, icon]) => (
            <button key={label} className={`nav-item ${activeTab === label ? "active" : ""}`} onClick={() => setActiveTab(label)}>
              <span className="nav-icon">{icon}</span>{label}
              {label === "Liked Songs" && liked.length > 0 && <span className="nav-count">{liked.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label">YOUR PLAYLISTS</div>
        <button className="playlist-link" onClick={() => setNotice("Playlist creation will be enabled with your account.")}><span>＋</span> Create playlist</button>
        <button className="playlist-link" onClick={() => setActiveTab("Your Library")}><span className="playlist-dot" /> Recently played</button>
        <div className="sidebar-bottom">
          <div className="privacy-chip"><span className="privacy-dot" /> No ads. Just music.</div>
          <div className="agent-card">
            <div className="agent-icon">⌘</div>
            <div><strong>PC Agent</strong><span>Not connected yet</span></div>
            <span className="status-dot" />
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="history-buttons"><button aria-label="Back" onClick={() => setActiveTab("Home")}>‹</button><button aria-label="Forward" onClick={() => setActiveTab("Home")}>›</button></div>
          <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setActiveTab("Search"); }} placeholder="Search songs, artists, moods..." aria-label="Search music" /><kbd>⌘ K</kbd></label>
          <Link className="profile-button" href="/auth" aria-label="Sign in or profile" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>G</Link>
        </header>

        <div className="page-content">
          <div className="welcome-row">
            <div><p className="eyebrow">YOUR SOUND, YOUR SPACE</p><h1>{activeTab === "Search" ? "Find your sound." : activeTab === "Liked Songs" ? "Songs you love." : activeTab === "Your Library" ? "Your library." : "Good evening."}</h1><p className="muted intro-copy">A little less noise. A lot more music.</p></div>
            <div className="date-pill"><span className="live-dot" /> YOUR PERSONAL MUSIC SPACE</div>
          </div>

          {activeTab === "Home" && <section className="hero-card">
            <div className="hero-glow" /><div className="hero-copy"><span className="pill-label">PIKO MIX · 01</span><h2>Find your<br /><em>own rhythm.</em></h2><p>Your music, your playlists, your pace. All in one calm place.</p><button className="primary-button" onClick={() => playTrack(tracks[0])}><span>▶</span> Explore your music</button></div>
            <div className="hero-art"><div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="hero-disc"><span>p</span></div><div className="floating-note note-a">♪</div><div className="floating-note note-b">♫</div></div>
          </section>}

          {activeTab === "Home" && <section className="section-block"><div className="section-heading"><div><p className="eyebrow">MADE FOR YOUR MOMENT</p><h2>Pick your mood</h2></div><button className="text-button" onClick={() => setActiveTab("Search")}>Explore all <span>↗</span></button></div><div className="mix-grid">{mixes.map((mix) => <button key={mix.title} className={`mix-card ${mix.color}`} onClick={() => { setQuery(mix.title === "Deep Focus" ? "Lo-fi" : mix.title === "On the Move" ? "Electronic" : "Chill"); setActiveTab("Search"); }}><span className="mix-icon">{mix.icon}</span><span className="mix-title">{mix.title}</span><span className="mix-subtitle">{mix.subtitle}</span><span className="mix-play">▶</span></button>)}</div></section>}

          <section className="section-block track-section"><div className="section-heading"><div><p className="eyebrow">{query ? "SEARCH RESULTS" : activeTab === "Liked Songs" ? "YOUR COLLECTION" : "HANDPICKED FOR YOU"}</p><h2>{query ? "Matching tracks" : activeTab === "Liked Songs" ? "Liked songs" : activeTab === "Your Library" ? "Recently played" : "Made to be replayed"}</h2></div><span className="track-total">{(activeTab === "Liked Songs" ? visibleTracks.filter((track) => liked.includes(track.id)) : visibleTracks).length} TRACKS</span></div>
            <div className="track-list"><div className="track-header"><span>#</span><span>TRACK</span><span>GENRE</span><span>TIME</span><span /></div>
              {(activeTab === "Liked Songs" ? visibleTracks.filter((track) => liked.includes(track.id)) : visibleTracks).map((track, index) => <div className={`track-row ${current?.id === track.id ? "is-playing" : ""}`} key={track.id}><button className="track-number" onClick={() => playTrack(track)} aria-label={`Play ${track.title}`}>{current?.id === track.id ? "♫" : String(index + 1).padStart(2, "0")}</button><button className="track-main" onClick={() => playTrack(track)}><Cover color={track.color} small /><span className="track-copy"><strong>{track.title}</strong><span>{track.artist}</span></span></button><span className="genre-tag">{track.genre}</span><span className="track-duration">{track.duration}</span><button className={`like-button ${liked.includes(track.id) ? "liked" : ""}`} onClick={() => toggleLike(track.id)} aria-label={liked.includes(track.id) ? "Unlike track" : "Like track"}>{liked.includes(track.id) ? "♥" : "♡"}</button></div>)}
              {visibleTracks.length === 0 && <div className="empty-state">No tracks match that search. Try another title or artist.</div>}
            </div>
          </section>

          {activeTab === "Home" && <section className="section-block upload-callout"><div className="upload-symbol">↥</div><div><p className="eyebrow">YOUR COLLECTION, CONNECTED</p><h2>Bring your music together.</h2><p className="muted">The PC agent will help organize eligible music files and sync them to your library.</p></div><button className="secondary-button" onClick={() => setNotice("PC agent setup will be available in a later phase.")}>Set up PC agent <span>→</span></button></section>}

          <footer className="footer-note"><span>PIKO BEATS</span><span>Built for listening, not distractions.</span><span>Demo catalog · No audio connected</span></footer>
        </div>
      </section>

      <div className={`mini-player ${current ? "has-track" : ""}`}>
        <div className="mini-track">{current ? <Cover color={current.color} small /> : <div className="mini-placeholder">♫</div>}<div className="mini-track-copy"><strong>{current?.title || "Choose your first track"}</strong><span>{current?.artist || "Your next favorite is waiting"}</span></div><button className={`like-button ${current && liked.includes(current.id) ? "liked" : ""}`} onClick={() => current && toggleLike(current.id)} aria-label="Like current track">{current && liked.includes(current.id) ? "♥" : "♡"}</button></div>
        <div className="mini-controls"><div className="control-buttons"><button aria-label="Shuffle">⤨</button><button aria-label="Previous track">◂</button><button className="main-play" onClick={() => current ? setNotice("Audio playback will be connected when a licensed source is configured.") : playTrack(tracks[0])} aria-label="Play or pause">▶</button><button aria-label="Next track" onClick={() => current && playTrack(tracks[(tracks.findIndex((track) => track.id === current.id) + 1) % tracks.length])}>▸</button><button aria-label="Repeat">↻</button></div><div className="progress-line"><span /><i>00:00</i><b>--:--</b></div></div>
        <div className="mini-extras"><span>♫</span><span>⌕</span><span>▱</span><div className="volume-bar"><i /></div></div>
      </div>

      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div>}
    </main>
  );
}
