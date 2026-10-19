# Third-party notices

## AdblockAndroid

- Source: https://github.com/Edsuns/AdblockAndroid
- Purpose: Native Android WebView content-filtering engine for Piko Beats' in-app music browser.
- Integration method: Gradle dependency `com.github.Edsuns.AdblockAndroid:ad-filter:master-SNAPSHOT` via JitPack; it is not vendored or modified in this repository.
- License: GNU Lesser General Public License v2.1 (LGPL-2.1). See [licenses/AdblockAndroid-LICENSE.txt](licenses/AdblockAndroid-LICENSE.txt).
- Filter lists: AdGuard Base, EasyPrivacy Lite, and AdGuard Tracking Protection are downloaded from their published filter URLs at first browser launch. The list publishers can change their contents and terms independently.
- Upstream status note: The upstream GitHub repository reports its latest release as v0.9.1 from 2021, while its current README documents the JitPack coordinate above. The 1.0 release coordinate could not be resolved in CI, so the build script now tries the upstream master-SNAPSHOT. This snapshot must pass CI before the native browser can be considered buildable; if it also fails, replace it with a maintained compatible filter engine rather than pretending ad blocking works.

## Bare Browser

- Source: https://github.com/BareBrowser/bare-browser
- License: BSD 3-Clause for this repository's patches / materials; see its upstream LICENSE and NOTICE files for full Chromium and uBlock Origin provenance.
- Use in Piko Beats: Design and feature reference only. Bare is a patch series for a custom Chromium Android build, not an embeddable WebView library. Building it requires a large Chromium checkout, substantial disk/RAM, and a separate native-browser release pipeline. Piko Beats does not copy its patches or bundle its APK in this integration.

## Provider boundaries

The in-app browser can filter matching network requests, but it does not guarantee complete ad removal. It does not alter music-provider subscriptions, bypass paywalls, or extract protected audio. Embedded and website playback remains subject to the provider's behavior and terms.
