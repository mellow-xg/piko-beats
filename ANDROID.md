# Android implementation

Piko Beats uses Next.js static export inside Capacitor, with a native Android browser screen for online music sites.

## Current native approach

- Capacitor 8 generates the Android wrapper.
- The browser route at `/browser` opens a native browser screen through the `PrivacyBrowser` Capacitor plugin.
- The screen uses Android WebView plus **Edsuns/AdblockAndroid** for EasyList/AdGuard-compatible network filtering, element hiding, and scriptlet rules.
- Initial filter subscriptions: AdGuard Base, EasyPrivacy Lite, and AdGuard Tracking Protection.
- The generated Gradle project adds the JitPack repository and `com.github.Edsuns.AdblockAndroid:ad-filter:1.0`.
- Back, refresh, URL entry, HTTPS-only top-level navigation, Android Safe Browsing, and TLS error cancellation are included in the native template.

The upstream AdblockAndroid latest release is old, so the first Android build must confirm that its JitPack artifact resolves and works with the current Android Gradle toolchain. See `THIRD_PARTY_NOTICES.md` and the bundled LGPL-2.1 license. Filter updates are fetched from their source publishers; this is not a complete guarantee of ad removal, and some music websites may block Android WebView playback.

## Why not embed Bare Browser directly?

`BareBrowser/bare-browser` is a patch series for building a separate custom Chromium Android browser, not a dependency that can be dropped into a Capacitor app. Its own build guide calls for Docker with at least 32 GB RAM and around 100 GB of free disk, and a full Chromium build. We use its feature ideas as a reference but are not copying its Chromium patches or bundling its APK into Piko Beats. See [Bare Browser](https://github.com/BareBrowser/bare-browser).

## Build locally

Requires Node.js 22+, Java 21, Android SDK, and Gradle dependencies available from Maven Central and JitPack.

```bash
npm install
cp .env.example .env.local
npm run build
npx cap add android
npm run android:prepare
npx cap sync android
npx cap open android
```

If the native Android project already exists, skip `npx cap add android`. The `android:prepare` step generates the custom browser plugin/activity, registers the activity, and adds AdblockAndroid to Gradle.

## Build an APK in GitHub Actions

The workflow `.github/workflows/android.yml` installs dependencies, lints, exports the Next.js site, generates the Capacitor project, runs `android:prepare`, builds a debug APK, and uploads it as an Actions artifact. A successful workflow run is required before treating the APK as ready. We have not yet verified a successful APK build.

## Supabase and secrets

Only the Supabase URL and publishable key may be included in the APK. Never bundle a service-role/secret key, Google OAuth client secret, or Drive refresh token. RLS remains the enforcement boundary for the playlist queue.

## Current limitations

- Online playback uses official provider embeds or their own website players. YouTube, Spotify, and other providers can restrict embedded playback or require user sign-in.
- Ad filtering cannot guarantee that all ads are removed and should not be used to bypass subscriptions, DRM, or download controls.
- The playlist queue saves metadata tasks when the PC is off; the Windows agent is separate and still needs local testing with a real Supabase account.
- The Windows agent currently processes public provider metadata and can upload music files you are authorized to store. Google OAuth configuration and desktop testing are still required.
- Background audio/media controls and lock-screen behavior need device tests before release.
