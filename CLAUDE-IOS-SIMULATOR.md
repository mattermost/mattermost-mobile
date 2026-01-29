# iOS Simulator Setup Guide for AI Agents

This guide documents the process for setting up and running the Mattermost Mobile app on an iOS simulator.

## Prerequisites Check

Before starting, verify these are installed:

```bash
# Check Xcode
xcodebuild -version

# Check CocoaPods
pod --version

# Check Node.js
node --version

# Check npm dependencies
test -d node_modules && echo "node_modules exists" || echo "Run: npm install"
```

## Step 1: iOS Simulator Runtime

Check if iOS simulators are available:

```bash
xcrun simctl list devices available
```

If no devices are listed or you see "Install Started", you need to download the iOS platform:

```bash
xcodebuild -downloadPlatform iOS
```

**Note:** This downloads ~8GB and takes several minutes. The command runs in the foreground and shows progress.

## Step 2: CocoaPods Installation

### Critical: Set UTF-8 Encoding

CocoaPods requires UTF-8 encoding. Always set this before running pod commands:

```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

### Install Pods (Apple Silicon Mac)

```bash
cd ios
RCT_NEW_ARCH_ENABLED=0 arch -x86_64 pod install
```

### Common CocoaPods Issues

#### Issue: "Unicode Normalization not appropriate for ASCII-8BIT"
**Solution:** Set UTF-8 encoding as shown above.

#### Issue: Podfile.lock version conflicts
**Solution:** Clean install:
```bash
cd ios
rm -rf Pods Podfile.lock build
export LANG=en_US.UTF-8 && export LC_ALL=en_US.UTF-8
RCT_NEW_ARCH_ENABLED=0 arch -x86_64 pod install
```

#### Issue: GitHub SSH timeouts during pod install
**Symptom:** Errors like "Connection to github.com port 22: Operation timed out"

**Solution:** Temporarily configure git to use HTTPS instead of SSH:
```bash
git config --global url."https://github.com/".insteadOf git@github.com:
```

**IMPORTANT:** Revert this after pod install completes, or the user won't be able to push:
```bash
git config --global --unset url.https://github.com/.insteadof
```

**Warning:** Never leave git URL rewrites in place without informing the user!

## Step 3: Start Metro Bundler

```bash
npm start
```

Wait for "Dev server ready" message before proceeding.

## Step 4: Run iOS App

### Using npm script
```bash
npm run ios -- --simulator="iPhone 17 Pro"
```

### Or specify a different simulator
List available simulators first:
```bash
xcrun simctl list devices available | grep -E "iPhone|iPad"
```

Then run with your chosen device:
```bash
npm run ios -- --simulator="iPhone 16e"
```

## Build Times

- **First build:** 10-30 minutes (compiles all native code)
- **Subsequent builds:** Much faster (incremental)
- **JS/TS changes:** ~3 seconds hot reload (no native rebuild needed)

## Troubleshooting Build Failures

### Getting Better Error Messages

If `npm run ios` fails, run xcodebuild directly for clearer errors:

```bash
xcodebuild -workspace ios/Mattermost.xcworkspace \
  -configuration Debug \
  -scheme Mattermost \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  2>&1 | grep -E "error:|fatal error"
```

### Clean Build

If builds fail mysteriously, try a clean build:

```bash
# Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/Mattermost-*

# Clean and reinstall pods
cd ios
rm -rf Pods Podfile.lock build
export LANG=en_US.UTF-8 && export LC_ALL=en_US.UTF-8
RCT_NEW_ARCH_ENABLED=0 arch -x86_64 pod install
```

### Opening in Xcode

For complex build issues, open in Xcode for better debugging:

```bash
open ios/Mattermost.xcworkspace
```

Then select your simulator target and press Cmd+B to build.

## Known Issues

### Header Linking Issues (Xcode 26+)

There may be compatibility issues between `react-native-navigation` and `react-native-safe-area-context` with newer Xcode versions. If you see errors like:

```
'react-native-safe-area-context/RNCSafeAreaView.h' file not found
```

This is a known modular headers issue. Potential solutions:
1. Check if there's a newer version of the dependencies
2. Try an older Xcode version if iOS 26 support isn't complete
3. Consult with the team about known workarounds

## Quick Reference

```bash
# Full setup sequence (Apple Silicon)
export LANG=en_US.UTF-8 && export LC_ALL=en_US.UTF-8
cd ios && RCT_NEW_ARCH_ENABLED=0 arch -x86_64 pod install && cd ..
npm start &
sleep 10
npm run ios -- --simulator="iPhone 17 Pro"
```

## Do NOT Modify

- **Git configuration:** Never permanently change git URL rewrites without reverting
- **Podfile:** Don't add modular_headers to pods unless you understand the implications
- **New Architecture:** Keep `RCT_NEW_ARCH_ENABLED=0` as the project uses the old architecture
