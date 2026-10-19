import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import piko_agent


class SourceDetailsTests(unittest.TestCase):
    def test_youtube_music_playlist(self):
        parsed = piko_agent.source_details(
            "https://music.youtube.com/playlist?list=PL1234567890"
        )
        self.assertEqual(parsed["provider"], "youtube")
        self.assertEqual(parsed["playlist_id"], "PL1234567890")
        self.assertTrue(parsed["is_playlist"])

    def test_youtube_video(self):
        parsed = piko_agent.source_details(
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        )
        self.assertEqual(parsed["provider"], "youtube")
        self.assertEqual(parsed["video_id"], "dQw4w9WgXcQ")
        self.assertFalse(parsed["is_playlist"])

    def test_spotify_playlist(self):
        parsed = piko_agent.source_details(
            "https://open.spotify.com/playlist/4uLU6hMCjMI75M1A2tKUQC"
        )
        self.assertEqual(parsed["provider"], "spotify")
        self.assertEqual(parsed["kind"], "playlist")
        self.assertTrue(parsed["is_playlist"])

    def test_soundcloud_track(self):
        parsed = piko_agent.source_details("https://soundcloud.com/example/track-name")
        self.assertEqual(parsed["provider"], "soundcloud")
        self.assertFalse(parsed["is_playlist"])

    def test_rejects_plain_http(self):
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            piko_agent.source_details("http://open.spotify.com/playlist/4uLU6hMCjMI75M1A2tKUQC")

    def test_rejects_spoofed_provider_host(self):
        with self.assertRaisesRegex(ValueError, "Unsupported source host"):
            piko_agent.source_details(
                "https://open.spotify.com.attacker.example/playlist/4uLU6hMCjMI75M1A2tKUQC"
            )

    def test_rejects_embedded_credentials(self):
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            piko_agent.source_details(
                "https://user:password@open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"
            )

    def test_rejects_youtube_home_without_video_or_playlist(self):
        with self.assertRaisesRegex(ValueError, "video ID or playlist ID"):
            piko_agent.source_details("https://music.youtube.com/")


if __name__ == "__main__":
    unittest.main()
