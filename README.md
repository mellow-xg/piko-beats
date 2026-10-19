# Piko Beats

Piko Beats is an Android-first online music hub with a cloud playlist queue and a Windows PC agent planned for processing authorized audio files when the PC is available.

## Current implementation branch

Work is being developed on `feat/piko-beats-foundation`; `main` has not been changed.

- **Web shell:** Next.js App Router, React, static export for Capacitor.
- **Android:** Capacitor 8 configuration and a GitHub Actions debug-APK workflow.
- **Authentication:** Supabase email sign-up/sign-in at `/auth`.
- **Online listening:** `/listen` uses official YouTube, Spotify, and SoundCloud embeds where supported. Provider playback and ad behavior remain under the provider's control.
- **Playlist queue:** `/queue` creates user-owned Supabase `sync_playlist_metadata` tasks. Tasks stay queued when the PC is off.
- **Database:** Supabase profiles, tracks, playlists, playlist entries, PC agents, processing tasks, and Drive file references are configured with RLS enabled.

## Current limitations

The Windows PC agent is not implemented yet, so queued tasks will not be processed automatically yet. Google Drive OAuth/upload is not implemented. The home page's curated sample tracks are still demo items; they are not audio files. Background audio, Android media/lock-screen controls, and APK build success still require testing.

## Source and download rules

Piko Beats must not extract protected audio from YouTube Music, bypass service download restrictions, or circumvent provider ads. Playlist links are queued for metadata workflows. Downloads and Drive uploads must be restricted to files the user is authorized to download and store.

## Local development

Requires Node.js 22 or higher.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The default Supabase values in `.env.example` are public client configuration only. The Supabase publishable key is designed for client use; database access is governed by RLS. Never expose a Supabase service-role/secret key, Google client secret, or Google refresh token in the browser or APK.

## Android build

The GitHub Actions workflow `.github/workflows/android.yml` installs dependencies, lints, builds the static Next.js export, generates the Capacitor Android project, builds a debug APK, and publishes it as an Actions artifact. This first run must pass before the artifact should be treated as usable.

## Supabase and PC agent

The task queue currently accepts only the `sync_playlist_metadata` task type from this UI. The future PC agent must authenticate separately, validate provider URLs, claim tasks safely, and never trust arbitrary client payloads as shell commands or download instructions.
