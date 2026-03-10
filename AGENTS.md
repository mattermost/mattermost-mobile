# AGENTS.md

## Cursor Cloud specific instructions

This is a React Native mobile app (Mattermost Mobile v2). The cloud VM has an Android emulator available for running the app.

### Quick reference

| Task | Command |
|---|---|
| Install deps | `npm install --ignore-scripts && npx patch-package && bash scripts/postinstall.sh` |
| Lint | `npm run lint` |
| Auto-fix lint | `npm run fix` |
| TypeScript check | `npm run tsc` |
| Run all tests | `npm test` |
| Run single test | `npx jest --runInBand --testPathPattern="<pattern>"` |
| Start Metro bundler | `npm start` |
| Combined check | `npm run check` (lint + tsc) |
| Build Android debug | `cd android && ./gradlew assembleDebug -PreactNativeArchitectures=x86_64 --no-daemon` |
| Start emulator | See "Android Emulator" section below |
| Install APK | `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` |

### Android Emulator

The VM has Android SDK installed at `/home/ubuntu/android-sdk` with an AVD named `Pixel_7` (API 34, x86_64). Environment variables are in `~/.bashrc`.

**Starting the emulator:**
```bash
emulator -avd Pixel_7 -no-audio -no-window -no-snapshot -gpu swiftshader_indirect -no-boot-anim -accel off &
adb wait-for-device
# Wait for full boot (takes ~5-8 minutes without KVM):
while [ "$(adb shell getprop sys.boot_completed 2>/dev/null)" != "1" ]; do sleep 5; done
```

**Running the app:**
```bash
adb reverse tcp:8081 tcp:8081        # Connect Metro to emulator
npm start &                           # Start Metro bundler
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.mattermost.rnbeta/.MainActivity
```

**Emulator performance caveats:**
- No KVM/hardware acceleration available — emulator uses software rendering (`-accel off -gpu swiftshader_indirect`)
- Boot takes ~5-8 minutes; first app launch takes ~2-3 minutes
- Frequent "System UI isn't responding" ANR dialogs are expected — these are from Android system processes, not the Mattermost app. Dismiss with `adb shell input keyevent 4` (back button) or wait
- Disable animations to improve responsiveness: `adb shell settings put global window_animation_scale 0 && adb shell settings put global transition_animation_scale 0 && adb shell settings put global animator_duration_scale 0`
- Disable screen timeout: `adb shell settings put system screen_off_timeout 2147483647`
- Build only for x86_64 to save time: `-PreactNativeArchitectures=x86_64`

**Taking screenshots / recording:**
```bash
adb shell screencap -p /sdcard/screenshot.png && adb pull /sdcard/screenshot.png ./screenshot.png
adb shell screenrecord /sdcard/video.mp4 &   # Start recording (max 3 min)
# ... perform actions ...
kill %1                                        # Stop recording
adb pull /sdcard/video.mp4 ./video.mp4
```

### Mattermost Server (local development)

The VM has a Mattermost server built from latest master at `/home/ubuntu/mattermost-server`. PostgreSQL is installed natively.

**Starting the server:**
```bash
sudo pg_ctlcluster 16 main start  # Start PostgreSQL if not running
cd /home/ubuntu/mattermost-server/server && ./bin/mattermost server --config config/config.json &
```

**Server details:**
- URL: `http://localhost:8065` (use `http://10.0.2.2:8065` from Android emulator)
- Admin user: `admin` / `Admin123!`
- Team: `Dev Team` with `Town Square` and `Off-Topic` channels
- PostgreSQL: `postgres://postgres:postgres@localhost:5432/mattermost?sslmode=disable`

**Connecting the mobile app:**
```bash
adb reverse tcp:8065 tcp:8065     # Map server port to emulator
adb reverse tcp:8081 tcp:8081     # Map Metro port to emulator
```

**Rebuilding the server** (if needed, e.g. after pulling latest mattermost-server changes):
```bash
cd /home/ubuntu/mattermost-server/server
go work init && go work use . && go work use ./public
go build -o bin/mattermost ./cmd/mattermost
```

### Key caveats

- **`npm install` must use `--ignore-scripts`** on this VM because the `preinstall` script runs `npx solidarity` which checks for platform-specific tools (Xcode, watchman) that are not available on Linux. After install, manually run `npx patch-package` and the postinstall asset steps (handled by the update script).
- **Node.js version**: 22.14.0 (per `.nvmrc`). The VM uses nvm; run `nvm use` to activate.
- **Go version**: 1.24.1 at `/usr/local/go/bin/go` (required for Mattermost server, which needs Go 1.24+).
- **Full test suite is slow** with `--runInBand` (can take 20+ minutes). For targeted testing, use `npx jest --runInBand --testPathPattern="<regex>"`.
- **Jest "did not exit" warning** is expected on some test files due to LokiJS autosave timers; it does not indicate failure.
- **Pre-commit hook** (`.husky/pre-commit`) runs ESLint on staged JS/TS files and incremental TypeScript checking. Run `npm run check` to replicate this before committing.
- **Gradle first build** takes ~15-20 minutes. Subsequent incremental builds are faster.
- **Emulator JS bundle load** takes 5-10 minutes without KVM. After `pm clear` or fresh install, the app splash screen persists until the bundle is fully parsed. Be patient.
- **ANR dialogs** can be suppressed with `adb shell settings put global hide_error_dialogs 1`. Apply after every emulator boot.
- **Screen timeout** can be disabled with `adb shell svc power stayon true` and `adb shell settings put system screen_off_timeout 2147483647`.
- See `CLAUDE.md` for full architecture details, testing patterns, and coding conventions.
