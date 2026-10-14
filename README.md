# Piko Beats

An ad-free music library and streaming web app with a Windows PC agent for processing **authorized downloads** and syncing eligible files to Google Drive.

## Planned architecture

- **Web:** Next.js App Router + React
- **UI:** responsive dark-first interface
- **Auth/database/task queue:** Supabase (to be configured)
- **Hosting:** Vercel
- **Local agent:** Python on Windows
- **Storage:** Google Drive API for tracks the user has rights to store and share
- **Playback:** browser audio player for authorized audio URLs

## Important source restrictions

Piko Beats must not extract protected audio from YouTube Music, bypass service download restrictions, or circumvent ads. For YouTube Music playlists, use permitted playlist metadata/link workflows and send users to official playback where needed. Downloads and Drive sharing are limited to audio the user is authorized to download and make available.

## Project status

- [x] Repository foundation and UI prototype
- [ ] Supabase schema, authentication, and row-level security
- [ ] Secure task queue for the PC agent
- [ ] Google OAuth / Drive upload integration
- [ ] Authorized source adapters
- [ ] Playback for available catalog tracks
- [ ] Windows agent installer and background task processing
- [ ] Tests and deployment

## Local development

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app currently runs in demo mode. Supabase and Drive integrations are intentionally not enabled until their credentials and security policies are configured.

## Environment variables

See `.env.example`. Never commit real API keys, OAuth secrets, service-role keys, or refresh tokens.

## PC agent

See [agent/README.md](agent/README.md) for the planned Windows background-agent design.
