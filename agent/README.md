# Piko Beats PC Agent

The Windows agent runs only when you launch it. It checks the Supabase task queue over HTTPS and processes supported **metadata-only** playlist jobs, even if those jobs were submitted while the PC was off. It does not download or extract protected YouTube Music audio.

## 1. Prepare the PC

Install Python 3.11+ from python.org. In PowerShell:

```powershell
cd agent
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Review `.env`. It contains the project URL and publishable key; these are public client configuration values, not an admin/service-role secret. Keep your account password, Google OAuth client secret, and refresh tokens private.

## 2. Start the worker

Run:

```powershell
python piko_agent.py
```

Enter the same Supabase account email you use in Piko Beats, then enter the password when prompted. The password is not written to the file. A refresh token is saved through Windows Credential Manager using Python keyring. The agent registers a PC entry, then polls every 30 seconds. Press Ctrl+C to stop. Use `python piko_agent.py --once` to process at most one queued task and exit.

The worker validates task type, task intent, and provider hostname before requesting official public metadata. It supports YouTube/YouTube Music, Spotify, and SoundCloud public metadata; full YouTube playlist item import requires an optional YouTube Data API v3 key. Spotify/SoundCloud playlist expansion may remain metadata-only where the provider's public endpoint does not expose the item list.

## 3. Upload your authorized local music files to Drive

Place audio files you own or are authorized to store in:

`%USERPROFILE%\Music\Piko Beats Imports`

To enable Google Drive upload:

1. Create a Google Cloud OAuth client of type **Desktop app**.
2. Enable the Google Drive API for that Cloud project.
3. Download the OAuth client JSON and save it as `agent/credentials.json` (or point `GOOGLE_OAUTH_CLIENT_FILE` in `.env` to it).
4. Run `python piko_agent.py --upload-folder` and approve the Google account in the browser window.

The agent uploads only supported audio extensions from the configured import folder, skips symlinks and files larger than the configured size limit, deduplicates by file hash, and keeps uploads private in a Drive folder named **Piko Beats**. It writes file references and metadata to Supabase. It does not make files public automatically.

This is an explicit separate command; the metadata queue will never turn a playlist URL into a local file path or arbitrary command.

## 4. Useful commands

- `python piko_agent.py`: poll the queue until Ctrl+C.
- `python piko_agent.py --once`: process at most one task.
- `python piko_agent.py --upload-folder`: explicitly upload local authorized audio files.
- `python piko_agent.py --sign-out`: clear the locally cached Supabase session for the entered email.

## Security / provider boundaries

- No Supabase service-role key is used by the client.
- Database RLS and ownership-checking RPCs restrict queue access and task claiming to the signed-in account and its registered agent.
- Provider URLs are allowlisted and revalidated in Python; user-supplied values are never passed to a shell.
- YouTube metadata import uses the official YouTube Data API where required. Spotify/SoundCloud metadata uses their provider oEmbed endpoints.
- Downloads and Drive uploads are limited to files the user is authorized to download and store. The worker does not bypass service download controls, DRM, paywalls, or ads.

## Tests

From the repository root:

```powershell
python -m compileall -q agent
python -m unittest discover -s agent/tests -v
```

A successful static/Android CI run is not a substitute for testing the worker with your own account and Google Drive OAuth credentials.
