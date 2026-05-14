# PR #9737 Testing Progress

## Branch
- `rn83` (already up to date: `917c13f3f`)

## iOS Simulator
- [x] Clean reset (`ios/`, `package.json`, `package-lock.json`, `android/`, `fastlane/`)
- [x] Fresh `npm install --legacy-peer-deps`
- [x] Re-install Pods with `RCT_NEW_ARCH_ENABLED=1`
- [x] Debug build for iOS simulator succeeded
- [x] Installed and launched on `iPhone 17 Pro` (iOS 26.3)
- [x] App running with Metro — server selection screen loads (v2.40.0 Build 746)
- [x] Fixed `expo-linking` missing peer dependency + re-triggered `pod install`

## Android Emulator
- [x] Boot `detox_pixel_8_api_35` — fully booted (`emulator-5554`, `sys.boot_completed=1`)
- [ ] Build/install debug APK
- [ ] Launch app with Metro

## Metro
- [x] Running with `--reset-cache`

## Issues Found
1. **React Native CLI bug**: `npx react-native run-ios` attempts to launch `org.cocoapods.React` instead of `com.mattermost.rnbeta`. Manual `xcrun simctl install/launch` required.
2. **Missing peer dep**: `expo-linking` not auto-installed by `--legacy-peer-deps`. Required manual `npm install` + `pod install` + rebuild.
