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

The VM has a pre-configured Android SDK at `/home/ubuntu/android-sdk` with a `Pixel_7` AVD (Android 34, x86_64). **KVM is NOT available** in Firecracker Cloud Agent VMs (no VMX CPU flag exposed), so the emulator must run in software mode (`-no-accel`).

**Known limitations without KVM:**
- App initialization takes 5-10 minutes per launch
- `screencap` sometimes returns black frames (GPU rendering issues)
- Touch/tap input may not properly activate React Native EditText fields
- For interactive testing (login, form entry), prefer using the **Detox E2E framework** in `detox/` instead

```bash
# Start adb server
$ANDROID_HOME/platform-tools/adb start-server

# Start emulator (no KVM, software rendering)
$ANDROID_HOME/emulator/emulator -avd Pixel_7 -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect -no-accel -memory 4096 &

# Wait for boot (~3 min)
adb wait-for-device
adb shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 5; done'

# Disable animations & kill background apps (important for performance)
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell am force-stop com.google.android.youtube

# Grant notification permission to avoid dialog blocking startup
adb shell pm grant com.mattermost.rnbeta android.permission.POST_NOTIFICATIONS

# Build debug APK (x86_64 only for emulator, ~2 min)
cd android && ANDROID_HOME=/home/ubuntu/android-sdk JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 ./gradlew assembleDebug -PreactNativeArchitectures=x86_64 --no-daemon

# Install (push first, then pm install — faster than adb install for large APKs)
adb push app/build/outputs/apk/debug/app-debug.apk /data/local/tmp/app-debug.apk
adb shell pm install -r /data/local/tmp/app-debug.apk

# Launch (ensure Metro is running first: npm start)
adb shell am start -n com.mattermost.rnbeta/.MainActivity

# Verify UI loaded (UI Automator is more reliable than screencap on software emulator)
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml /tmp/ui.xml
grep -oP 'text="[^"]*"' /tmp/ui.xml | grep -v 'text=""'
```

The first screen is the "Let's Connect to a Server" screen. On the software emulator, visual rendering lags behind the accessibility tree — use `uiautomator dump` to verify screen state.

### Running UI tests with Maestro (recommended for Cloud Agent)

[Maestro](https://maestro.dev) is the recommended tool for UI testing on Cloud Agent VMs. It handles slow software emulators gracefully — it waits automatically for elements, uses the accessibility layer (no instrumentation APK needed), and supports generous timeouts.

#### Quick start

```bash
# Install Maestro CLI (one-time)
curl -fsSL "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"

# Key env vars for slow emulator
export MAESTRO_DRIVER_STARTUP_TIMEOUT=600000  # 10 min for driver startup
export MAESTRO_CLI_NO_ANALYTICS=1
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

# Run a flow
maestro test maestro/login_flow.yaml --debug-output ./maestro-debug
```

#### Reusable login sub-flow

Login is handled by `maestro/shared/login.yaml`. Other flows call it via `runFlow`:

```yaml
- runFlow:
    file: shared/login.yaml
    env:
      SERVER_URL: "https://your-server.example.com"
      SERVER_NAME: "testing"
      USERNAME: "admin"
      PASSWORD: "your-password"
```

The sub-flow launches the app with `clearState: true`, enters the server URL, connects, enters credentials, taps Log In, and waits for the channel list screen.

#### testID-based selectors (prefer over text matching)

Always use `testID` (mapped to `id:` in Maestro YAML) when available. This is more reliable than text matching, especially on slow emulators where text rendering may lag behind the accessibility tree. Escape dots in testIDs with `\\` in Maestro regex selectors.

**Key testIDs for common flows:**

| Screen | Element | testID |
|--------|---------|--------|
| Server entry | URL input | `server_form.server_url.input` |
| Server entry | Display name input | `server_form.server_display_name.input` |
| Server entry | Connect button | `server_form.connect.button` |
| Login | Username input | `login_form.username.input` |
| Login | Password input | `login_form.password.input` |
| Login | Sign In button | `login_form.signin.button` |
| Channel list | Screen root | `channel_list.screen` |
| Channel list | Channel row | `channel_list.category.<type>.channel_item.<channel-name>` |
| Channel list | Search button | `channel_list_subheader.search_field.button` |
| Channel list | Plus/create button | `channel_list_header.plus.button` |
| Post draft | Message input | `channel.post_draft.post.input` |
| Post draft | Send button | `channel.post_draft.send_action.send.button` |
| Tab bar | Home | `tab_bar.home.tab` |
| Tab bar | Search | `tab_bar.search.tab` |
| Tab bar | Mentions | `tab_bar.mentions.tab` |
| Tab bar | Saved | `tab_bar.saved_messages.tab` |
| Tab bar | Account | `tab_bar.account.tab` |

If an element is missing a testID, add one following the convention `component.subcomponent.element` (see `CLAUDE.md` for the full testID naming guide).

#### Writing Maestro flows — best practices

1. **Use `extendedWaitUntil` with `id:` selectors** before interacting. The first screen load takes ~10 min on the software emulator:
   ```yaml
   - extendedWaitUntil:
       visible:
         id: "channel_list\\.screen"
       timeout: 600000
   ```

2. **Chunk long text** into ~16-char `inputText` calls to stay under the 120s gRPC deadline:
   ```yaml
   - inputText: "https://example"
   - inputText: ".mattermost.com"
   ```

3. **Use `takeScreenshot`** after key steps. Screenshots may be black on the software emulator GPU, but they work when the emulator has had time to render.

4. **Use `runFlow` for reusable steps** (login, navigation). Store shared flows in `maestro/shared/`.

5. **Prefer `id:` over `text:` selectors** — testIDs are stable across languages and themes. Fall back to text only when no testID exists.

6. **Pre-install Maestro driver** on first run. The driver APK install can take several minutes. Push it manually to speed up:
   ```bash
   adb push /tmp/maestro-app*.apk /data/local/tmp/maestro.apk
   adb shell pm install -r -g /data/local/tmp/maestro.apk
   ```

### Running Detox E2E tests

The Detox test suite is in `detox/` with its own `package.json`. To run on the Cloud Agent:

```bash
# 1. Install Detox deps
cd detox && npm ci && cd ..

# 2. Build the test instrumentation APK (app debug APK should already exist)
cd android && ANDROID_HOME=/home/ubuntu/android-sdk JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 \
  ./gradlew assembleAndroidTest -DtestBuildType=debug -PreactNativeArchitectures=x86_64 --no-daemon && cd ..

# 3. Create the Detox AVD (if not exists)
echo "no" | $ANDROID_HOME/cmdline-tools/latest/bin/avdmanager create avd \
  -n detox_pixel_4_xl_api_34 -k "system-images;android-34;google_apis;x86_64" -d "pixel_4_xl" --force

# 4. Create detox/.env with test server credentials
cat > detox/.env << 'EOF'
SITE_1_URL=https://your-test-server.example.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password
EOF

# 5. Run tests (kill any existing emulator first!)
# Detox manages the emulator lifecycle. Use --device-boot-args for no-accel.
cd detox && npx detox test -c android.emu.debug \
  --device-boot-args="-no-accel -gpu swiftshader_indirect -no-audio -memory 4096" \
  --headless \
  -- --testPathPattern="smoke_test/server_login"
```

**Known limitation:** Without KVM, the emulator is too slow for the default 180s test timeout. Detox boots the emulator and launches the app correctly, but tests time out during app initialization. This is an environment constraint, not a setup issue.

### Suppressing React Native LogBox warnings

The `.env` file (gitignored) controls `RUNNING_E2E`. Set `RUNNING_E2E=true` to call `LogBox.ignoreAllLogs(true)`, which suppresses the yellow "Open debugger to view warnings" toast in dev builds. The update script creates this file automatically. After changing `.env`, restart Metro with `--reset-cache` for the change to take effect.

### Gotchas

- **Do not use `npm install`** directly — the `preinstall` script calls `npx solidarity` which will fail on Linux (expects macOS toolchain). Always use `npm ci --ignore-scripts` then run post-steps manually.
- **patch-package** must run after `npm ci --ignore-scripts` — the 30 patches in `patches/` are critical for the app to work.
- **Tests take ~7 minutes** to run the full suite (~570 suites, ~7200 tests) with `--runInBand`. Use `npx jest <path>` to run individual test files for faster iteration.
- **Metro bundler** binds to `127.0.0.1:8081`. Verify with `curl http://127.0.0.1:8081/status`.
- **Android Gradle build** requires `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and `JAVA_HOME` environment variables. These are pre-set in the VM (`/home/ubuntu/android-sdk` and `/usr/lib/jvm/java-21-openjdk-amd64`).
- **Android emulator is very slow** without KVM — budget extra time for boot, install, and app initialization. The app may appear stuck on the splash logo for several minutes before the UI renders.
- **Pre-commit hook** (`scripts/pre-commit.sh`) runs ESLint on staged files and incremental TypeScript checking. It will run automatically via Husky if git hooks are set up.
