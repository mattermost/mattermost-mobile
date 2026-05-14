# Test Plan: PR #9737 — Upgrade to RN 0.83.9, Expo 55, React 19, New Architecture

**PR:** https://github.com/mattermost/mattermost-mobile/pull/9737  
**Branch:** `rn83` → `expo-router`  
**Author:** @enahum  
**Date:** 2026-05-07

---

## 1. Overview

This PR upgrades the mobile app's core platform dependencies and enables the React Native New Architecture (Fabric + TurboModules). The changes touch the native layer on both iOS and Android, the JavaScript bundle, CI pipelines, and all patch files.

**Key dependency changes:**
| Dependency | Old | New |
|------------|-----|-----|
| React Native | 0.77.3 | **0.83.9** (New Architecture) |
| React | 18.3.1 | **19.2.5** |
| Expo SDK | 52 | **55** |
| TypeScript | 5.8.3 | **6.0.3** |
| Node.js | 22.16.0 | **24.15.0** |
| react-native-reanimated | 3.17.3 | **4.3.0** |

---

## 2. Environment Setup & Prerequisites

Before testing, verify the environment matches the PR requirements:

- [ ] **Node.js 24.15.0** (use `nvm` or `fnm` to switch)
- [ ] **Ruby 3.2+** with Bundler 2.5.11
- [ ] **CocoaPods 1.16.1+**
- [ ] **Xcode 26.x** (iOS Simulator builds require Xcode 26.2+ SDK)
- [ ] **Android Studio Ladybug+** with Gradle 8.13+
- [ ] `RCT_NEW_ARCH_ENABLED=1` must be set for both iOS and Android builds

---

## 3. Build Verification

### 3.1 iOS Simulator Build
| Step | Command | Expected Result |
|------|---------|-----------------|
| 1 | `rm -rf node_modules ios/Pods ios/Podfile.lock` | Clean state |
| 2 | `npm install --legacy-peer-deps` | Completes without `EEXIST`/`ENOTEMPTY` errors |
| 3 | `cd ios && RCT_NEW_ARCH_ENABLED=1 pod install --repo-update` | 143+ pods install, CodeGen artifacts generated |
| 4 | `SKIP_SETUP=1 npm run build:ios-sim` | **Success**, produces `Mattermost.app` |
| 5 | Verify app bundle | `ios/build/Products/Release-iphonesimulator/Mattermost.app` exists (~80-120MB) |

> ⚠️ **Known issue on this branch:** The `ratex-react-native` pod's `xcframeworks-output-files.xcfilelist` incorrectly expects `RaTeX.framework` while the script copies a static library + headers. If the build fails with `Unable to find module dependency: 'RaTeXFFI'`, apply the temporary fix: update `ios/Pods/Target Support Files/ratex-react-native/ratex-react-native-xcframeworks-output-files.xcfilelist` to `${PODS_XCFRAMEWORKS_BUILD_DIR}/ratex-react-native/Headers/module.modulemap`.

### 3.2 iOS Release / Unsigned Build
| Step | Command | Expected Result |
|------|---------|-----------------|
| 1 | `SKIP_SETUP=1 npm run build:ios` or `build:ios-unsigned` | Archive succeeds, IPA generated |
| 2 | Verify signing | No provisioning profile errors for unsigned build |

### 3.3 Android APK Build
| Step | Command | Expected Result |
|------|---------|-----------------|
| 1 | `npm install --legacy-peer-deps` | Clean install |
| 2 | `SKIP_SETUP=1 npm run build:android` | **Success**, `app:assembleDebug` or `app:assembleRelease` completes |
| 3 | Verify APK | `Mattermost_Beta.apk` (or release equivalent) exists in repo root |
| 4 | Verify size | Debug APK ~320MB+, Release APK should be smaller |

### 3.4 Android Gradle Health Checks
- [ ] `./gradlew clean` completes without deprecation warnings
- [ ] `./gradlew assembleDebug` completes in < 3 minutes on warm cache
- [ ] No `jetifier` or AndroidX migration errors

---

## 4. New Architecture Regression Tests

Because `RCT_NEW_ARCH_ENABLED=1` is now enforced, all native module bridges run through TurboModules and all UI runs through Fabric.

### 4.1 TurboModules Smoke Tests
- [ ] App launches to the server selection screen without native crashes
- [ ] Login with username/password succeeds
- [ ] Login with SSO (SAML/OAuth) succeeds
- [ ] Push notification token registration succeeds (check `react-native-notifications`)
- [ ] Deep linking (`mattermost://`) opens the correct channel/thread
- [ ] Share extension launches and shares text into a channel

### 4.2 Fabric Renderer Smoke Tests
- [ ] Channel list scrolls smoothly without blank white areas
- [ ] Thread view renders all posts including markdown, code blocks, and embedded images
- [ ] Post input text field accepts text, mentions, and emoji
- [ ] Bottom sheets (e.g., channel info, user profile) open and close with animation
- [ ] Modal navigation (e.g., settings, search) transitions correctly

### 4.3 React 19 Compatibility
- [ ] No `ReactDOM.render` deprecation warnings (should use `createRoot` paths)
- [ ] `StrictMode` double-effects do not break WatermelonDB subscriptions
- [ ] Hooks behave correctly with React 19's new internals (test `useEffect`, `useMemo`, `useCallback`)

---

## 5. iOS-Specific Regression Tests

### 5.1 AppDelegate Swift Migration
- [ ] App launches on iOS 18+ simulator
- [ ] App launches on iOS 17.x physical device
- [ ] Background fetch / silent push notifications wake the app
- [ ] App state transitions (background → foreground) restore the last viewed channel
- [ ] No `AppDelegate.swift` runtime crashes in Sentry

### 5.2 CocoaPods & Native Libraries
- [ ] `react-native-paste-input` builds without `New Architecture required` pod errors
- [ ] `@mattermost/react-native-network-client` (Alamofire 5.11.2) links correctly
- [ ] `react-native-webrtc` (JitsiWebRTC) initializes for calls
- [ ] `WatermelonDB` (0.28.1) opens both app and server databases
- [ ] `react-native-reanimated` 4.3.0 animations run on UI thread (test channel list animations)

### 5.3 iOS Simulator-Specific
- [ ] iPhone 16 Pro Max simulator: app layout uses full screen, no SafeArea regressions
- [ ] iPad simulator: split view and slide-over work correctly
- [ ] App builds for both `arm64` and `x86_64` simulator slices

---

## 6. Android-Specific Regression Tests

### 6.1 Gradle & Build Tooling
- [ ] Gradle wrapper 8.13+ is used (`./gradlew --version`)
- [ ] `compileSdk` and `targetSdk` are 36 (Android 16)
- [ ] `minSdk` is still 28 (Android 9) or as documented
- [ ] R8/ProGuard release build succeeds without rule errors

### 6.2 Edge-to-Edge & API Level Matrix
Test on multiple emulator images:
- [ ] **API 34** (Android 14): status bar and navigation bar insets handled correctly
- [ ] **API 35** (Android 15): edge-to-edge enforcement doesn't cut off UI
- [ ] **API 36** (Android 16): app renders correctly with latest window insets
- [ ] Keyboard avoidance (`react-native-keyboard-controller`) works on all three levels

### 6.3 Native Modules (Android New Arch)
- [ ] `react-native-notifications` registers FCM token
- [ ] `@mattermost/react-native-emm` Intune wrapper initializes
- [ ] `react-native-image-picker` launches camera and photo picker
- [ ] `react-native-document-picker` returns files for upload
- [ ] `@mattermost/secure-pdf-viewer` renders PDFs without New-Arch crashes

---

## 7. Expo 55 Upgrade Tests

- [ ] `expo-router` deep links still resolve to correct screens
- [ ] `expo-constants` manifest is accessible (used for EAS updates / OTA)
- [ ] `expo-file-system` read/write operations work for cached images
- [ ] `expo-crypto` provides secure random values for key generation
- [ ] `expo-device` reports correct device model and OS version

---

## 8. Product Feature Regression

### 8.1 Calls
- [ ] Start a call in a channel (WebRTC initializes, audio/video permissions requested)
- [ ] Receive an incoming call push notification and join
- [ ] Screen sharing button is present and functional

### 8.2 Agents / AI
- [ ] Streaming post updates render without stale state
- [ ] `POST_EDITED` events correctly replace streaming text with persisted DB text
- [ ] Tool call approval/rejection UI renders

### 8.3 Playbooks
- [ ] Playbook run list loads and syncs (verify `handlePlaybookRuns` deletes stale records)

### 8.4 Markdown & Messaging
- [ ] KaTeX math blocks render via `ratex-react-native` (critical regression area)
- [ ] Compass icons render in the channel list and post headers
- [ ] Markdown links open in-app or external browser correctly
- [ ] Image previews and galleries load from cache

---

## 9. Automated Test Execution

Run the full test suite before sign-off:

```bash
npm run check-test   # lint + tsc + unit tests
```

- [ ] `npm run lint` passes (0 errors, 0 warnings)
- [ ] `npm run tsc` passes with TypeScript 6.0.3
- [ ] `npm run test` passes (all Jest suites green)
- [ ] WatermelonDB tests pass with `extraLokiOptions: {autosave: false}`
- [ ] No `react-hooks/exhaustive-deps` regressions

**E2E (Detox):**
- [ ] `cd detox && npm run e2e:ios-build` succeeds
- [ ] `cd detox && npm run e2e:android-build` succeeds
- [ ] Core E2E login + send message flow passes on at least one platform

---

## 10. CI / CD Verification

- [ ] GitHub Actions workflows reference Node 24 instead of 22
- [ ] iOS CI job uses `macos-15` runner with Xcode 26
- [ ] Android CI job uses `ubuntu-latest` with Java 21
- [ ] Fastlane lanes (`ios simulator`, `android build`) pass in CI
- [ ] Sentry source map upload step succeeds for both platforms
- [ ] No hardcoded `RCT_NEW_ARCH_ENABLED=0` in any CI script

---

## 11. Performance & Stability

- [ ] Cold start time (app launch → channel list) is within 10% of pre-upgrade baseline
- [ ] Memory usage on iOS does not exceed 250MB average in release mode
- [ ] JavaScript bundle size is within 10% of pre-upgrade baseline
- [ ] No new ANR (Android) or watchdog termination (iOS) reports in Sentry

---

## 12. Checklist Summary

| Category | Items | Pass |
|----------|-------|------|
| Build (iOS sim) | 5 | ☐ |
| Build (iOS release) | 2 | ☐ |
| Build (Android) | 4 | ☐ |
| New Architecture | 10 | ☐ |
| iOS Specific | 10 | ☐ |
| Android Specific | 10 | ☐ |
| Expo 55 | 5 | ☐ |
| Product Features | 10 | ☐ |
| Automated Tests | 7 | ☐ |
| CI/CD | 6 | ☐ |
| Performance | 4 | ☐ |
| **TOTAL** | **73** | **/ 73** |

---

## 13. Known Issues & Notes

1. **ratex-react-native xcframework** — The `RaTeX.xcframework` output file list in the generated CocoaPods script expects a `.framework` directory, but the library is a static `.a` + headers. This causes the `[CP] Copy XCFrameworks` phase to silently fail under Xcode 26's strict output tracking, leading to `Unable to find module dependency: 'RaTeXFFI'` during Swift compilation.
   - **Workaround:** Patch `ios/Pods/Target Support Files/ratex-react-native/ratex-react-native-xcframeworks-output-files.xcfilelist` to `${PODS_XCFRAMEWORKS_BUILD_DIR}/ratex-react-native/Headers/module.modulemap` after `pod install`.
   - **Long-term fix:** Either upstream `ratex-react-native` wraps the static lib in a proper `.framework` bundle, or CocoaPods fixes library-type xcframework output tracking.

2. **TypeScript 6.0.3** — Some git dependencies (`@mattermost/calls-common`, etc.) use `react-native-builder-bob` which fails with TS6's stricter `rootDir` requirement. Using `--legacy-peer-deps` and ensuring cached tarballs are fresh avoids this during install.

3. **Node.js 24** — A few legacy npm packages (`inflight`, `glob@7`) emit deprecation warnings. These are non-blocking but should be monitored for future breakage.

---

*Test plan prepared for PR #9737 on 2026-05-07.*
