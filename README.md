# Piko Beats

Piko Beats is an Android-first online music hub with a private cloud playlist queue and a Windows PC agent for metadata work and user-authorized local music uploads.

## Implemented on `feat/piko-beats-foundation`

- Next.js App Router + React mobile-first dark UI, configured for static export through Capacitor.
- Supabase email sign-up/sign-in at `/auth`.
- Online listening at `/listen` through official YouTube/YouTube Music, Spotify, and SoundCloud embeds where supported.
- Android browser page at `/browser`, with a native WebView intended to use the AdblockAndroid request-filtering engine.
- Supabase playlist queue at `/queue` for user-owned `sync_playlist_metadata` tasks that persist while the PC is switched off.
- Windows PC agent at `agent/piko_agent.py`: Supabase email/password sign-in with OS credential-store token caching, safe claiming of metadata-only queue tasks, official provider metadata import, and a separate explicit Google Drive upload command for authorized local audio files.

## Backend

Supabase project: `fwgmvyzmrggmkedjqdki`

Tables with RLS: `profiles`, `tracks`, `playlists`, `playlist_tracks`, `pc_agents`, `processing_tasks`, and `drive_files`.

New task-claiming functions restrict task claiming/finishing to an authenticated user who owns the registered PC agent. The client is permitted to enqueue supported provider metadata tasks only; it cannot enqueue arbitrary PC commands.

## Android browser dependencies

- [Edsuns/AdblockAndroid](https://github.com/Edsuns/AdblockAndroid): WebView filter engine. It is integrated as a Gradle dependency and set up to subscribe to AdGuard Base, EasyPrivacy Lite, and AdGuard Tracking Protection. CI must confirm that the upstream JitPack artifact remains resolvable with current tooling. License and attribution: `THIRD_PARTY_NOTICES.md`.
- [BareBrowser/bare-browser](https://github.com/BareBrowser/bare-browser): evaluated as a feature reference. It is a full Chromium patch series requiring its own heavy build—not an embeddable Capacitor plugin—so Piko Beats does not incorporate its Chromium patches or APK.

## Source restrictions

Piko Beats does not extract protected audio from YouTube Music, bypass provider download restrictions, or circumvent provider subscriptions/DRM. Playlist links create metadata tasks. Audio uploads are limited to local files the user owns or is authorized to store; uploaded files remain private in Google Drive by default.

## Local development

Requires Node.js 22+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

See [ANDROID.md](ANDROID.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for Android setup and licenses.

## Current status

Source code and Supabase schema are committed, but an APK build and device playback have not yet been verified. Google Drive OAuth must be configured on the Windows PC, and the PC agent needs real-account testing before this is production-ready.
