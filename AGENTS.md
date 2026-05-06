# AGENTS.md

## Cursor Cloud specific instructions

This is a React Native mobile app (Mattermost Mobile). On Linux Cloud Agent VMs, iOS builds/simulator are unavailable (macOS-only). Android emulator is also not available. Development work focuses on JS/TS: linting, type checking, tests, and Metro bundler.

### Key commands

All standard commands are documented in `CLAUDE.md` and `package.json` scripts. The most-used ones:

- **Lint + TypeScript check:** `npm run check` (combines `npm run lint` and `npm run tsc`)
- **Auto-fix lint:** `npm run fix`
- **Run tests:** `npm run test` (runs Jest with `--runInBand`)
- **Start Metro bundler:** `npm start` (serves on `127.0.0.1:8081`)

### Dependency installation (non-macOS / Cloud Agent)

The update script handles dependency refresh automatically. If you need to reinstall manually, follow the CI pattern to avoid macOS-only preinstall/postinstall hooks:

```bash
npm ci --ignore-scripts
npx patch-package
node ./scripts/generate-assets.js
cp node_modules/@mattermost/compass-icons/font/compass-icons.ttf assets/fonts/
cp node_modules/@mattermost/compass-icons/font/compass-icons.ttf android/app/src/main/assets/fonts/
mkdir -p android/app/src/main/res/raw/
cp assets/sounds/* android/app/src/main/res/raw/
```

### Running the Android app on the emulator

The VM has a pre-configured Android SDK at `/home/ubuntu/android-sdk` with a `Pixel_7` AVD (Android 34, x86_64). There is no KVM support, so the emulator runs in software mode (`-no-accel`) and is very slow (~2-3 min boot, ~6 min APK install for the 233MB debug APK).

```bash
# Start adb server
$ANDROID_HOME/platform-tools/adb start-server

# Start emulator (no KVM, software rendering)
$ANDROID_HOME/emulator/emulator -avd Pixel_7 -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect -no-accel -memory 4096 &

# Wait for boot
adb wait-for-device
adb shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 5; done'

# Build debug APK (x86_64 only for emulator, ~2 min)
cd android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64 --no-daemon

# Install (push first, then pm install — faster than adb install for large APKs)
adb push app/build/outputs/apk/debug/app-debug.apk /data/local/tmp/app-debug.apk
adb shell pm install -r /data/local/tmp/app-debug.apk

# Launch
adb shell am start -n com.mattermost.rnbeta/.MainActivity
```

The app takes several minutes to fully initialize on the software emulator. The first screen is the "Let's Connect to a Server" screen with a server URL input.

### Gotchas

- **Do not use `npm install`** directly — the `preinstall` script calls `npx solidarity` which will fail on Linux (expects macOS toolchain). Always use `npm ci --ignore-scripts` then run post-steps manually.
- **patch-package** must run after `npm ci --ignore-scripts` — the 30 patches in `patches/` are critical for the app to work.
- **Tests take ~7 minutes** to run the full suite (~570 suites, ~7200 tests) with `--runInBand`. Use `npx jest <path>` to run individual test files for faster iteration.
- **Metro bundler** binds to `127.0.0.1:8081`. Verify with `curl http://127.0.0.1:8081/status`.
- **Android Gradle build** requires `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and `JAVA_HOME` environment variables. These are pre-set in the VM (`/home/ubuntu/android-sdk` and `/usr/lib/jvm/java-21-openjdk-amd64`).
- **Android emulator is very slow** without KVM — budget extra time for boot, install, and app initialization. The app may appear stuck on the splash logo for several minutes before the UI renders.
- **Pre-commit hook** (`scripts/pre-commit.sh`) runs ESLint on staged files and incremental TypeScript checking. It will run automatically via Husky if git hooks are set up.
