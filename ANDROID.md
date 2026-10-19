# Android build path

Piko Beats is being prepared for an Android shell using Capacitor.

## Current status
- Capacitor configuration added.
- Supabase email sign-in/sign-up page added.
- The main catalog is still a demo and does not yet stream real audio.
- Android native project generation and device testing are not complete.

## Before generating Android
1. Configure the environment variables listed in `.env.example`.
2. Configure Next.js static export only after removing or adapting features that require a Next.js server.
3. Install Capacitor packages and generate the Android project.
4. Test background audio with Android MediaSession/Media3 or a compatible native playback plugin. A web page alone cannot guarantee reliable background playback on Android.
5. Add Android app icons, notification controls, and privacy disclosures.

Do not bundle Supabase service-role keys, Google OAuth client secrets, or refresh tokens in the APK.
