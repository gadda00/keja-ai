# Keja AI — Android & iOS apps

Keja ships as a **native app on both platforms** via [Capacitor](https://capacitorjs.com):
the full web platform (marketplace, AI advisor, tokenize trial, all six stakeholder
workspaces, the PWA service worker and offline shell) runs inside a native shell with
an app-style bottom tab bar, splash screen, app icons and deep links.

| Item           | Android                                     | iOS                           |
| -------------- | ------------------------------------------- | ----------------------------- |
| Project        | `android/` (Gradle)                         | `ios/` (Xcode)                |
| App ID         | `com.chacadom.keja`                         | `com.chacadom.keja`           |
| Name           | Keja AI                                     | Keja AI                       |
| Deep links     | `https://keja.app` (autoVerify) + `keja://` | `keja://` (Info.plist)        |
| Icons/splash   | generated in `android/app/src/main/res*`    | `ios/App/App/Assets.xcassets` |
| Debug artifact | `app/build/outputs/apk/debug/app-debug.apk` | build in Xcode                |

## Prerequisites

- Node 22+, npm (repo deps installed)
- **Android**: JDK 21 + Android SDK (platform 35, build-tools 35.0.0)
- **iOS**: macOS with Xcode 15+ (signing requires an Apple Developer account)

## Build & run

```bash
# 1. build the web bundle at the ROOT base and sync into both native projects
npm run mobile:sync

# 2a. Android — open in Android Studio…
npm run mobile:android
#    …or build an APK directly (needs ANDROID SDK + JDK 21):
npm run mobile:apk            # → android/app/build/outputs/apk/debug/app-debug.apk

# 2b. iOS — open in Xcode (macOS only)
npm run mobile:ios            # then select a team + device and press Run
```

To install the debug APK on a device: enable _Install unknown apps_, copy
`app-debug.apk` over (or `adb install app-debug.apk`) and open it.

## Release builds

**Android** (Play Store):

```bash
cd android && ./gradlew bundleRelease        # AAB → Play Console
# signing: set up keystore per Play Console guidance, then wire
# android/app/build.gradle signingConfigs.release
```

**iOS** (App Store): Xcode → Product → Archive → distribute. Set the team

- bundle ID in `ios/App/App.xcodeproj` first (the default is `com.chacadom.keja`).

## Deep links

- **Android** `AndroidManifest.xml` already registers `https://keja.app`
  (autoVerify) and the `keja://` scheme. For App Links verification, publish
  `https://keja.app/.well-known/assetlinks.json` containing the app's SHA-256
  fingerprint + package name once the release key exists.
- **iOS** `Info.plist` registers `keja://`. Universal Links additionally need
  an `applinks:keja.app` entitlement + `https://keja.app/.well-known/apple-app-site-association`.

## Where things live

- `capacitor.config.ts` — app id/name, webDir `dist/`, splash settings
- `assets/` — source icon/splash art (regenerate natives with
  `npx capacitor-assets generate --android --ios`)
- `android/`, `ios/` — **committed native projects** (Capacitor flow: edit →
  `npx cap sync` after web changes; commit the results)
- `src/components/layout/MobileTabBar.tsx` — the app-style bottom navigation
  (also serves the mobile web experience at < 768px)
- App icon art derives from `public/icons/icon-512.png` + `public/brand/keja-logo.jpg`

## Native plugin roadmap

Not yet wired (kept out until a backend exists): push notifications
(`@capacitor/push-notifications` for saved-search alerts), camera capture for
listing photos (`@capacitor/camera`), and M-Pesa STK push via a licensed PSP.
All are additive plugin installs — no architecture change required.
