from __future__ import annotations

import argparse
import getpass
import hashlib
import json
import mimetypes
import os
import platform
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import keyring
import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://fwgmvyzmrggmkedjqdki.supabase.co").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_vTdHEf8J6UTiqhlRz5eAdw_0WRoXo4y").strip()
AGENT_NAME = os.getenv("PC_AGENT_NAME", f"{platform.node() or 'Windows PC'} · Piko Beats")
POLL_SECONDS = max(10, int(os.getenv("POLL_INTERVAL_SECONDS", "30")))
YOUTUBE_API_KEY = os.getenv("YOUTUBE_DATA_API_KEY", "").strip()
IMPORT_DIR = Path(os.getenv("IMPORT_DIR", str(Path.home() / "Music" / "Piko Beats Imports"))).expanduser()
GOOGLE_OAUTH_CLIENT_FILE = Path(os.getenv("GOOGLE_OAUTH_CLIENT_FILE", str(ROOT / "credentials.json"))).expanduser()
MAX_UPLOAD_MB = max(1, int(os.getenv("MAX_UPLOAD_MB", "200")))
MAX_PLAYLIST_ITEMS = min(500, max(1, int(os.getenv("MAX_PLAYLIST_ITEMS", "250"))))

AUDIO_EXTENSIONS = {
    ".mp3", ".m4a", ".aac", ".flac", ".wav", ".ogg", ".opus", ".wma", ".aiff", ".alac"
}
ALLOWED_HOSTS = {
    "youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be",
    "open.spotify.com", "soundcloud.com", "www.soundcloud.com", "m.soundcloud.com",
}
ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{5,128}$")
SERVICE_NAME = f"PikoBeats:{SUPABASE_URL}"
USER_AGENT = "PikoBeatsWindowsAgent/0.1 (metadata-only; authorized local-file sync)"
DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def source_details(value: str) -> dict[str, Any]:
    try:
        parsed = urlparse(value.strip())
    except ValueError as exc:
        raise ValueError("Invalid source URL.") from exc
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Only HTTPS source links without embedded credentials are allowed.")
    host = parsed.hostname.lower()
    if host not in ALLOWED_HOSTS:
        raise ValueError("Unsupported source host. Allowed providers: YouTube, Spotify, SoundCloud.")

    query = parse_qs(parsed.query)
    path = [part for part in parsed.path.split("/") if part]
    if host.endswith("youtube.com") or host == "youtu.be":
        provider = "youtube"
        item_id = path[0] if host == "youtu.be" and path else (query.get("v") or [None])[0]
        playlist_id = (query.get("list") or [None])[0]
        if item_id and not ID_PATTERN.fullmatch(item_id):
            raise ValueError("Invalid YouTube video identifier.")
        if playlist_id and not ID_PATTERN.fullmatch(playlist_id):
            raise ValueError("Invalid YouTube playlist identifier.")
        return {
            "provider": provider,
            "url": parsed.geturl(),
            "video_id": item_id,
            "playlist_id": playlist_id,
            "is_playlist": bool(playlist_id),
            "host": host,
        }

    if host == "open.spotify.com":
        allowed_types = {"track", "playlist", "album", "artist", "episode", "show"}
        kind_index = next((i for i, part in enumerate(path) if part in allowed_types), None)
        if kind_index is None or kind_index + 1 >= len(path):
            raise ValueError("Use a Spotify track, playlist, album, artist, episode, or show URL.")
        kind, item_id = path[kind_index], path[kind_index + 1]
        if not ID_PATTERN.fullmatch(item_id):
            raise ValueError("Invalid Spotify item identifier.")
        return {
            "provider": "spotify", "url": parsed.geturl(), "kind": kind,
            "item_id": item_id, "is_playlist": kind in {"playlist", "album"},
            "host": host,
        }

    if host.endswith("soundcloud.com"):
        if not path:
            raise ValueError("Paste a SoundCloud track or playlist link.")
        is_playlist = "sets" in path
        return {
            "provider": "soundcloud", "url": parsed.geturl(),
            "item_id": "/".join(path), "is_playlist": is_playlist, "host": host,
        }
    raise ValueError("Unsupported source.")


class SupabaseClient:
    def __init__(self, email: str):
        if not SUPABASE_URL.startswith("https://") or not SUPABASE_KEY:
            raise RuntimeError("Configure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in agent/.env.")
        self.email = email.strip().lower()
        self.session_key = f"session:{self.email}"
        self.agent_key = f"agent:{self.email}"
        self.session: dict[str, Any] | None = None
        cached = keyring.get_password(SERVICE_NAME, self.session_key)
        if cached:
            try:
                self.session = json.loads(cached)
            except json.JSONDecodeError:
                self.session = None
        if not self.session or not self.session.get("refresh_token"):
            self.sign_in()
        else:
            try:
                self.ensure_fresh_token()
                self.user()
            except Exception:
                self.sign_in()

    def _auth_request(self, endpoint: str, body: dict[str, Any]) -> dict[str, Any]:
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/{endpoint}",
            headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json", "User-Agent": USER_AGENT},
            json=body,
            timeout=25,
        )
        if not response.ok:
            try:
                error = response.json().get("msg") or response.json().get("message") or response.text
            except ValueError:
                error = response.text
            raise RuntimeError(f"Supabase authentication failed: {error[:500]}")
        return response.json()

    def sign_in(self) -> None:
        print(f"Sign in to Supabase account for {SUPABASE_URL}")
        password = getpass.getpass("Supabase password (not saved by Piko Beats): ")
        data = self._auth_request("token?grant_type=password", {"email": self.email, "password": password})
        self._store_session(data)
        print("Supabase sign-in successful.")

    def _store_session(self, data: dict[str, Any]) -> None:
        if not data.get("access_token") or not data.get("refresh_token"):
            raise RuntimeError("Supabase did not return a complete session.")
        self.session = {
            "access_token": data["access_token"],
            "refresh_token": data["refresh_token"],
            "expires_at": int(time.time()) + int(data.get("expires_in", 3600)),
            "user_id": (data.get("user") or {}).get("id"),
        }
        keyring.set_password(SERVICE_NAME, self.session_key, json.dumps(self.session))

    def sign_out_local(self) -> None:
        try:
            keyring.delete_password(SERVICE_NAME, self.session_key)
        except keyring.errors.PasswordDeleteError:
            pass
        self.session = None

    def ensure_fresh_token(self) -> str:
        if self.session is None:
            raise RuntimeError("Missing Supabase session.")
        if int(self.session.get("expires_at", 0)) <= int(time.time()) + 90:
            try:
                data = self._auth_request(
                    "token?grant_type=refresh_token",
                    {"refresh_token": self.session["refresh_token"]},
                )
                self._store_session(data)
            except Exception:
                self.sign_out_local()
                raise
        return str(self.session["access_token"])

    def user(self) -> dict[str, Any]:
        token = self.ensure_fresh_token()
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}", "User-Agent": USER_AGENT},
            timeout=25,
        )
        if not response.ok:
            raise RuntimeError(f"Could not verify Supabase user ({response.status_code}).")
        data = response.json()
        if self.session is not None:
            self.session["user_id"] = data["id"]
            keyring.set_password(SERVICE_NAME, self.session_key, json.dumps(self.session))
        return data

    def request(self, method: str, resource: str, *, params: dict[str, Any] | None = None,
                body: Any = None, prefer: str | None = None) -> Any:
        url = f"{SUPABASE_URL}/rest/v1/{resource.lstrip('/')}"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {self.ensure_fresh_token()}",
            "User-Agent": USER_AGENT,
        }
        if body is not None:
            headers["Content-Type"] = "application/json"
        if prefer:
            headers["Prefer"] = prefer
        response = requests.request(method, url, params=params, json=body, headers=headers, timeout=35)
        if response.status_code == 401:
            self.sign_out_local()
            raise RuntimeError("Supabase session was rejected. Restart the agent to sign in again.")
        if not response.ok:
            try:
                details = response.json()
                message = details.get("message") or details.get("msg") or response.text
            except ValueError:
                message = response.text
            raise RuntimeError(f"Supabase {method} {resource} failed ({response.status_code}): {str(message)[:500]}")
        if not response.content:
            return None
        return response.json()

    def rpc(self, name: str, body: dict[str, Any]) -> Any:
        return self.request("POST", f"rpc/{name}", body=body)

    def upsert(self, table: str, body: dict[str, Any], conflict: str) -> dict[str, Any]:
        result = self.request(
            "POST", table, params={"on_conflict": conflict}, body=body,
            prefer="resolution=merge-duplicates,return=representation",
        )
        if isinstance(result, list) and result:
            return result[0]
        if isinstance(result, dict):
            return result
        raise RuntimeError(f"Supabase did not return the saved {table} record.")

    def insert(self, table: str, body: dict[str, Any]) -> dict[str, Any]:
        result = self.request("POST", table, body=body, prefer="return=representation")
        if isinstance(result, list) and result:
            return result[0]
        if isinstance(result, dict):
            return result
        raise RuntimeError(f"Supabase did not return the inserted {table} record.")


def get_agent(client: SupabaseClient, user: dict[str, Any]) -> str:
    cached = keyring.get_password(SERVICE_NAME, client.agent_key)
    if cached:
        try:
            existing = client.request(
                "GET", "pc_agents",
                params={"select": "id", "id": f"eq.{cached}", "owner_id": f"eq.{user['id']}", "limit": 1},
            )
            if existing:
                return str(existing[0]["id"])
        except Exception:
            pass
    rows = client.request(
        "GET", "pc_agents",
        params={"select": "id", "owner_id": f"eq.{user['id']}", "name": f"eq.{AGENT_NAME}", "limit": 1},
    )
    if rows:
        agent_id = str(rows[0]["id"])
    else:
        row = client.insert("pc_agents", {
            "owner_id": user["id"], "name": AGENT_NAME, "status": "online", "last_seen_at": now_iso()
        })
        agent_id = str(row["id"])
    keyring.set_password(SERVICE_NAME, client.agent_key, agent_id)
    return agent_id


def heartbeat(client: SupabaseClient, agent_id: str, status: str = "online") -> None:
    client.request(
        "PATCH", "pc_agents",
        params={"id": f"eq.{agent_id}"},
        body={"status": status, "last_seen_at": now_iso()},
        prefer="return=minimal",
    )


def http_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    response = requests.get(
        url,
        params=params,
        headers={"User-Agent": USER_AGENT},
        timeout=25,
    )
    if not response.ok:
        raise RuntimeError(f"Provider metadata request failed ({response.status_code}).")
    data = response.json()
    if not isinstance(data, dict):
        raise RuntimeError("Provider returned an unexpected metadata format.")
    return data


def youtube_api(path: str, params: dict[str, Any]) -> dict[str, Any]:
    if not YOUTUBE_API_KEY:
        raise RuntimeError("YouTube playlist item metadata requires an official YouTube Data API v3 key. Set YOUTUBE_DATA_API_KEY in agent/.env; no audio is downloaded.")
    return http_json(f"https://youtube.googleapis.com/youtube/v3/{path}", {**params, "key": YOUTUBE_API_KEY})


def save_playlist(client: SupabaseClient, owner_id: str, provider: str, source_url: str,
                  title: str, description: str | None = None, artwork_url: str | None = None) -> dict[str, Any]:
    return client.upsert("playlists", {
        "owner_id": owner_id,
        "name": (title or f"{provider.title()} playlist")[:120],
        "description": (description or f"Imported metadata from {provider.title()}.")[:4000],
        "artwork_url": artwork_url,
        "source_url": source_url,
        "source_provider": provider,
        "is_public": False,
    }, "owner_id,source_provider,source_url")


def save_track(client: SupabaseClient, owner_id: str, provider: str, source_id: str,
               source_url: str, title: str, artist: str | None = None,
               artwork_url: str | None = None, source_type: str = "official_link") -> dict[str, Any]:
    safe_id = source_id[:200]
    return client.upsert("tracks", {
        "owner_id": owner_id,
        "title": (title or "Untitled track")[:300],
        "artist": (artist or "")[:300] or None,
        "artwork_url": artwork_url,
        "source_type": source_type,
        "source_provider": provider,
        "source_id": safe_id,
        "source_url": source_url,
    }, "owner_id,source_provider,source_id")


def attach_track(client: SupabaseClient, playlist_id: str, track_id: str, position: int) -> None:
    client.upsert("playlist_tracks", {
        "playlist_id": playlist_id, "track_id": track_id, "position": max(0, position)
    }, "playlist_id,track_id")


def youtube_playlist(client: SupabaseClient, owner_id: str, source: dict[str, Any]) -> dict[str, Any]:
    playlist_id = source.get("playlist_id")
    if not playlist_id:
        raise RuntimeError("No YouTube playlist ID was found.")
    listing = youtube_api("playlists", {"part": "snippet,contentDetails", "id": playlist_id, "maxResults": 1})
    entries = listing.get("items") or []
    if not entries:
        raise RuntimeError("YouTube did not return this playlist. It may be private, removed, or unavailable to the API key.")
    meta = entries[0]
    snippet = meta.get("snippet") or {}
    content = meta.get("contentDetails") or {}
    thumbs = snippet.get("thumbnails") or {}
    artwork = next((thumbs[key].get("url") for key in ("maxres", "standard", "high", "medium", "default") if thumbs.get(key, {}).get("url")), None)
    saved_playlist = save_playlist(
        client, owner_id, "youtube", source["url"],
        snippet.get("title") or "YouTube playlist", snippet.get("description"), artwork,
    )
    playlist_db_id = str(saved_playlist["id"])

    page_token = None
    imported = 0
    while imported < MAX_PLAYLIST_ITEMS:
        params: dict[str, Any] = {
            "part": "snippet,contentDetails", "playlistId": playlist_id,
            "maxResults": min(50, MAX_PLAYLIST_ITEMS - imported),
        }
        if page_token:
            params["pageToken"] = page_token
        page = youtube_api("playlistItems", params)
        items = page.get("items") or []
        for item in items:
            snip = item.get("snippet") or {}
            resource = snip.get("resourceId") or {}
            video_id = resource.get("videoId") or (item.get("contentDetails") or {}).get("videoId")
            title = snip.get("title")
            if not video_id or not title or title in {"Deleted video", "Private video"}:
                continue
            thumbs = snip.get("thumbnails") or {}
            thumb = next((thumbs[key].get("url") for key in ("maxres", "high", "medium", "default") if thumbs.get(key, {}).get("url")), None)
            canonical = f"https://www.youtube.com/watch?v={video_id}"
            saved_track = save_track(
                client, owner_id, "youtube", video_id, canonical, title,
                snip.get("videoOwnerChannelTitle") or snip.get("channelTitle"), thumb, "official_link",
            )
            attach_track(client, playlist_db_id, str(saved_track["id"]), imported)
            imported += 1
        page_token = page.get("nextPageToken")
        if not page_token or not items:
            break

    return {
        "entity_type": "playlist", "playlist_id": playlist_db_id,
        "title": saved_playlist.get("name"), "provider": "youtube",
        "tracks_imported": imported, "metadata_source": "youtube_data_api_v3",
    }


def handle_metadata_task(client: SupabaseClient, owner_id: str, task: dict[str, Any]) -> dict[str, Any]:
    payload = task.get("payload") or {}
    if payload.get("task_intent") != "metadata_only":
        raise RuntimeError("Refusing task without the metadata-only intent.")
    source = source_details(str(payload.get("source_url") or ""))
    declared_provider = payload.get("source_provider")
    if declared_provider != source["provider"]:
        raise RuntimeError("The queued source provider does not match its URL.")
    if source["provider"] == "youtube" and source.get("is_playlist"):
        return youtube_playlist(client, owner_id, source)

    provider = source["provider"]
    if provider == "youtube":
        video_id = source.get("video_id")
        if not video_id:
            raise RuntimeError("This YouTube link is a playlist or channel page that requires the official YouTube Data API key.")
        canonical = f"https://www.youtube.com/watch?v={video_id}"
        if YOUTUBE_API_KEY:
            data = youtube_api("videos", {"part": "snippet,contentDetails", "id": video_id, "maxResults": 1})
            items = data.get("items") or []
            if items:
                snippet = items[0].get("snippet") or {}
                thumbs = snippet.get("thumbnails") or {}
                artwork = next((thumbs[key].get("url") for key in ("maxres", "standard", "high", "medium", "default") if thumbs.get(key, {}).get("url")), None)
                saved = save_track(
                    client, owner_id, provider, video_id, canonical,
                    snippet.get("title") or "YouTube video", snippet.get("channelTitle"), artwork,
                    "youtube_music" if source["host"] == "music.youtube.com" else "official_link",
                )
                return {"entity_type": "track", "track_id": saved["id"], "title": saved.get("title"), "provider": provider, "metadata_source": "youtube_data_api_v3"}
        meta = http_json("https://www.youtube.com/oembed", {"url": canonical, "format": "json"})
    elif provider == "spotify":
        meta = http_json("https://open.spotify.com/oembed", {"url": source["url"]})
    else:
        meta = http_json("https://soundcloud.com/oembed", {"url": source["url"], "format": "json"})

    title = (meta.get("title") or "").strip()[:300]
    author = (meta.get("author_name") or "").strip()[:300] or None
    artwork = meta.get("thumbnail_url") or None
    if not title:
        raise RuntimeError("The provider returned no public title metadata for this item.")

    if source.get("is_playlist"):
        saved = save_playlist(client, owner_id, provider, source["url"], title, f"Imported public playlist metadata from {provider.title()}.", artwork)
        return {
            "entity_type": "playlist", "playlist_id": saved["id"], "title": saved.get("name"),
            "provider": provider, "tracks_imported": 0,
            "metadata_source": "official_embed_metadata",
            "note": "The provider embed endpoint returned playlist-level metadata; track-list expansion requires a provider API where available.",
        }

    source_id = str(source.get("item_id") or source.get("video_id") or source["url"])
    saved = save_track(client, owner_id, provider, source_id, source["url"], title, author, artwork,
                       "youtube_music" if provider == "youtube" and source["host"] == "music.youtube.com" else "official_link")
    return {"entity_type": "track", "track_id": saved["id"], "title": saved.get("title"), "provider": provider, "metadata_source": "official_embed_metadata"}


def process_one(client: SupabaseClient, user: dict[str, Any], agent_id: str) -> bool:
    claim = client.rpc("claim_next_processing_task", {"p_agent_id": agent_id})
    task = claim[0] if isinstance(claim, list) and claim else claim if isinstance(claim, dict) and claim.get("id") else None
    if not task:
        return False

    task_id = str(task["id"])
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Processing task {task_id}")
    result: dict[str, Any] | None = None
    error: str | None = None
    status = "completed"
    try:
        if task.get("task_type") != "sync_playlist_metadata":
            raise RuntimeError(f"Unsupported task type: {task.get('task_type')}")
        result = handle_metadata_task(client, str(user["id"]), task)
        print(f"  Saved {result.get('entity_type')}: {result.get('title') or result.get('provider')}")
    except Exception as exc:
        status = "failed"
        error = str(exc)[:1000]
        print(f"  Task failed: {error}", file=sys.stderr)

    finished = client.rpc("finish_processing_task", {
        "p_agent_id": agent_id,
        "p_task_id": task_id,
        "p_status": status,
        "p_result": result,
        "p_error_message": error,
    })
    if finished is not True:
        print(f"WARNING: the database did not confirm final status for task {task_id}", file=sys.stderr)
    return True


def run_worker(client: SupabaseClient, user: dict[str, Any], agent_id: str, once: bool) -> None:
    print(f"Piko Beats agent: {AGENT_NAME}")
    print(f"Signed in as: {user.get('email')}")
    print("Mode: official metadata only; no protected audio download.")
    print(f"Polling every {POLL_SECONDS}s. Ctrl+C stops the worker.")
    try:
        while True:
            heartbeat(client, agent_id, "online")
            worked = process_one(client, user, agent_id)
            if once:
                if not worked:
                    print("Queue empty. No task was waiting.")
                return
            if not worked:
                time.sleep(POLL_SECONDS)
    except KeyboardInterrupt:
        print("\\nStopping Piko Beats agent.")
    finally:
        try:
            heartbeat(client, agent_id, "offline")
        except Exception as exc:
            print(f"Could not set agent offline: {exc}", file=sys.stderr)


def google_drive_service():
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError as exc:
        raise RuntimeError("Install agent dependencies with: pip install -r requirements.txt") from exc

    if not GOOGLE_OAUTH_CLIENT_FILE.is_file():
        raise RuntimeError(
            f"Google OAuth client file not found at {GOOGLE_OAUTH_CLIENT_FILE}. "
            "Create a Desktop app OAuth client in Google Cloud and save its JSON at that path."
        )
    data_dir = Path(os.getenv("APPDATA", str(Path.home() / ".config"))) / "PikoBeats"
    data_dir.mkdir(parents=True, exist_ok=True)
    token_path = data_dir / "google-drive-token.json"
    creds = None
    if token_path.exists():
        try:
            creds = Credentials.from_authorized_user_file(str(token_path), DRIVE_SCOPES)
        except Exception:
            creds = None
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(GOOGLE_OAUTH_CLIENT_FILE), DRIVE_SCOPES)
            creds = flow.run_local_server(port=0, prompt="consent")
        token_path.write_text(creds.to_json(), encoding="utf-8")
        try:
            token_path.chmod(0o600)
        except OSError:
            pass
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def get_or_create_drive_folder(service) -> str:
    result = service.files().list(
        q="name = 'Piko Beats' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        spaces="drive", pageSize=100, fields="files(id,name)",
    ).execute()
    folders = result.get("files") or []
    if folders:
        return str(folders[0]["id"])
    folder = service.files().create(
        body={"name": "Piko Beats", "mimeType": "application/vnd.google-apps.folder"},
        fields="id",
    ).execute()
    return str(folder["id"])


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def upload_local_folder(client: SupabaseClient, user: dict[str, Any]) -> None:
    from googleapiclient.http import MediaFileUpload

    import_root = IMPORT_DIR.resolve()
    if not import_root.exists():
        import_root.mkdir(parents=True, exist_ok=True)
        print(f"Created import folder: {import_root}")
        print("Place music files you own or are authorized to store in this folder, then run --upload-folder again.")
        return
    if not import_root.is_dir():
        raise RuntimeError(f"Import path is not a folder: {import_root}")

    files: list[Path] = []
    for path in import_root.rglob("*"):
        if path.is_symlink() or not path.is_file():
            continue
        if path.suffix.lower() not in AUDIO_EXTENSIONS:
            continue
        try:
            path.resolve().relative_to(import_root)
        except ValueError:
            continue
        if path.stat().st_size > MAX_UPLOAD_MB * 1024 * 1024:
            print(f"Skipping {path.name}: exceeds {MAX_UPLOAD_MB} MB.")
            continue
        files.append(path)
    if not files:
        print(f"No supported audio files found in {import_root}.")
        return

    service = google_drive_service()
    folder_id = get_or_create_drive_folder(service)
    print(f"Uploading {len(files)} local audio file(s) to your private Google Drive folder 'Piko Beats'.")

    for position, path in enumerate(files, start=1):
        digest = sha256_file(path)
        existing = service.files().list(
            q=f"'{folder_id}' in parents and appProperties has {{ key='pikoSha256' and value='{digest}' }} and trashed = false",
            spaces="drive", pageSize=10,
            fields="files(id,name,mimeType,webViewLink)",
        ).execute().get("files") or []

        if existing:
            drive_file = existing[0]
            print(f"[{position}/{len(files)}] Already uploaded: {path.name}")
        else:
            mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
            media = MediaFileUpload(str(path), mimetype=mime_type, resumable=True)
            drive_file = service.files().create(
                body={
                    "name": path.name,
                    "parents": [folder_id],
                    "appProperties": {"pikoSha256": digest},
                },
                media_body=media,
                fields="id,name,mimeType,webViewLink",
            ).execute()
            print(f"[{position}/{len(files)}] Uploaded: {path.name}")

        drive_id = str(drive_file["id"])
        view_link = drive_file.get("webViewLink") or f"https://drive.google.com/file/d/{drive_id}/view"
        track = save_track(
            client, str(user["id"]), "local", digest, view_link,
            path.stem.replace("_", " ")[:300], None, None, "user_owned_file",
        )
        client.upsert("drive_files", {
            "owner_id": user["id"],
            "track_id": track["id"],
            "drive_file_id": drive_id,
            "file_name": drive_file.get("name") or path.name,
            "mime_type": drive_file.get("mimeType") or mimetypes.guess_type(path.name)[0],
            "web_view_link": view_link,
        }, "owner_id,drive_file_id")

    print("Drive upload pass finished. Files remain private in your Google Drive unless you change their sharing permissions.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Piko Beats Windows PC agent")
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--once", action="store_true", help="Process at most one queued metadata task, then exit.")
    modes.add_argument("--upload-folder", action="store_true", help="Upload authorized audio files from IMPORT_DIR to your private Drive folder.")
    modes.add_argument("--sign-out", action="store_true", help="Remove the cached Supabase session from the OS credential store.")
    args = parser.parse_args()

    email = input("Supabase email: ").strip()
    if not email:
        print("A Supabase email is required.", file=sys.stderr)
        return 2
    if args.sign_out:
        keyring.delete_password(SERVICE_NAME, f"session:{email.lower()}")
        print("Removed the cached Supabase session.")
        return 0

    try:
        client = SupabaseClient(email)
        user = client.user()
        if args.upload_folder:
            upload_local_folder(client, user)
            return 0
        agent_id = get_agent(client, user)
        run_worker(client, user, agent_id, once=args.once)
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
