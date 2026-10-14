# Piko Beats PC Agent

The agent will run on the user's Windows PC and poll a Supabase-backed task queue over HTTPS. It is not implemented yet.

## Planned responsibilities

- Authenticate as a registered agent using a revocable per-device credential.
- Poll only tasks assigned to that device/user.
- Download from configured, authorized source adapters only.
- Check file hashes to skip duplicates.
- Store files in a user-configured local folder.
- Upload only eligible files to a dedicated Google Drive folder through OAuth.
- Send progress and sanitized errors back to the web app.
- Retry transient failures with exponential backoff.
- Support pause, cancel, disk-space limits, and bandwidth limits.

## Security requirements

- Never embed Supabase service-role keys or Google client secrets in the executable.
- Do not accept arbitrary shell commands or arbitrary URLs from the web app.
- Validate each source against an allowlist of supported adapters.
- Store refresh tokens using Windows-protected credential storage.
- Verify task ownership and authorization on the server.
- Do not download or extract protected audio from YouTube Music.
- Do not make Drive files public by default.

Implementation will begin after the Supabase schema, RLS, and authenticated task-claim flow are in place.
