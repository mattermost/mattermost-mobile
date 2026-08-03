# How to Run Detox Tests

This guide will help you set up and run Detox tests for your project.

## Install Dependencies

First, navigate to the root directory of your project and install the necessary dependencies by running:

```sh
npm install
```

navigate to the `detox` folder and run `npm install`

## Configure your server details
`detox/e2e/support/test_config.ts` defaults to one local server on port `8065`.
For iOS, both the test runner and simulator use `http://localhost:8065`. For
Android, the test runner uses `http://localhost:8065` while the emulator uses
`http://10.0.2.2:8065`.

If you use a remote server, set the logical site variable to a URL reachable
from both the host test runner and the device:
```sh
  export SITE_1_URL="https://your-server.example.com"
  export ADMIN_USERNAME="your-username"
  export ADMIN_PASSWORD="your-password"
  export ADMIN_EMAIL="your-email"
```

You can instead create a `detox/.env` file:
```sh
  # detox/.env
  SITE_1_URL=https://your-server.example.com
  ADMIN_USERNAME=your-username
  ADMIN_PASSWORD=your-password
  ADMIN_EMAIL=your-email@example.com
```

**Note**: no need to provide all variables, only the ones that differ.

`SITE_2_URL` and `SITE_3_URL` are only needed for tests that add distinct
Mattermost servers, such as `server_login/server_list.e2e.ts`. If they are
unset, their URL helpers alias site 1 and tests that require distinct servers
are skipped. The five-server `ANDROID_SITE_*` and `IOS_SITE_*` topology is
assigned by CI and is not required for ordinary local runs.

## Android

### Build Detox Android App

To build the Detox Android app, navigate to the `detox` folder and run:

```sh
npm run e2e:android-build
```

The debug apk will be built and available at `android/app/build/outputs/apk/debug/app-debug.apk`

### Run Detox Android Tests

#### Create emulator

```sh
./create_android_emulator.sh SDK_VERSION AVD_NAME

# example ./create_android_emulator.sh 34 pixel_5a_avd
# example ./create_android_emulator.sh 34 pixel_5a_avd --headless
# If we want to see the emulator logs. Run it in debug mode example ./create_android_emulator.sh 34 pixel_5a_avd --debug
```

To execute the Detox tests on Android, navigate to the `detox` folder and run:

```sh
npm run e2e:android-test

# To run a particular tests

npm run e2e:android-test <path to test file>
```

Local runs now default to a lower-memory setup so they coexist better with other tools:
- Detox uses `1` worker unless you set `DETOX_MAX_WORKERS`.
- Detox caps Node heap at `4096MB` unless you already set `NODE_OPTIONS`.
- Android Detox builds cap Gradle heap at `3072MB` and use at most `2` Gradle workers unless you override `MM_GRADLE_XMX_MB` or `MM_GRADLE_WORKERS_MAX`.
- Android emulator RAM defaults to `3072MB` when created or refreshed; override with `MM_ANDROID_EMULATOR_RAM_MB`.

## iOS

### Build iOS Simulator

To build the iOS simulator for Detox, from the project folder run:

```sh
npm run e2e:ios-build
```

This will build the Simulator .zip file at the root folder.

Create a folder named `mobile-artifacts` at the project root. Move the zip file under `mobile-artifacts` and unzip it there.

```sh
# From project root
mkdir mobile-artifacts
```

### Configure your local
Update `detox/.detoxrc.json` to specify which device you want to run it. Change:
```json
 "device": {
     "type": "__DEVICE_NAME__",
     "os": "__DEVICE_OS_VERSION__"
 },
```
to something like:
```json
 "device": {
     "type": "iPhone 17 Pro",
     "os": "iOS 26.4"
 },
```

To get your values run `xcrun simctl list devices` to find both the device and iOS version.

### Run iOS Tests

To execute the Detox tests on iOS, navigate to the `detox` folder and run:

```sh
npm run e2e:ios-test

# To run a particular tests

npm run e2e:android-test path to test file.
```

### Disabling Password Autofill

from iOS v26 password autofill can interfere with login tests by automatically filling credentials. To disable this feature on your simulator:

```sh
# Interactive mode - select simulator from list
npm run e2e:ios-disable-autofill

# Or specify simulator ID directly
npm run e2e:ios-disable-autofill -- --simulator-id SIMULATOR_UDID
```

**When to use this:**
- if using iOS 26 or later
- Before running iOS E2E tests if you notice password fields being auto-filled
- When login tests fail unexpectedly due to autofill interference
- After creating a new iOS simulator for testing

**Note:** CI environments automatically disable this setting, so this is only needed for local development.

**Finding your simulator ID:**
```sh
xcrun simctl list devices | grep Booted
```

#### TIP : For iOS, you can download the simulator from `~Mobile: Test build` or `~Release: Mobile Apps` channel in the community.

### Results

The Local Runs generate artifacts under `detox/artifacts/ios-debug-**` or `detox/artifacts/android-debug-**`.
You can see the html report, failure screenshot under that folder.

## Quarantined tests

A test that is known to fail is *quarantined* rather than deleted: it stays in
the suite but does not run. Use the hooks from `@support/quarantine` instead of a
bare `it.skip`:

```ts
import {itQuarantined} from '@support/quarantine';

// Quarantined: depends on app-side Saved Messages observe() fix.
itQuarantined('MM-T4910_2 - should be able to display a saved message', async () => {
```

They behave exactly like `it.skip` / `describe.skip` by default. The difference
is that a bare skip records only that someone once turned the test off — it is
indistinguishable from a platform gate, and it cannot be turned back on without
editing the file.

Set `RUN_QUARANTINED_TESTS=true` to run them:

```sh
RUN_QUARANTINED_TESTS=true npm run e2e:ios-test
```

In CI, the `run_quarantined` input on the iOS and Android templates does the
same. Two things use it:

- **Failure-triage validation** (`e2e-triage-smoke.yml`) needs a run that is
  guaranteed to contain real failures. A run with nothing failing proves nothing
  about triage.
- **Re-checking the quarantine list**, so an entry does not silently become
  permanent after the underlying bug is fixed.

Only use these hooks for "this test is broken". A test that does not apply to a
platform or a server topology is not quarantined — keep an explicit condition
such as `isIos() ? it.skip : it`, which stays skipped even when quarantined tests
are enabled.

## Webhook sidecar (mm_blocks / interactive dialog specs)

The `mm_blocks_*` and interactive-dialog specs register integrations that the
Mattermost server calls back into. `detox/webhook_server.js` serves those
callbacks on `:3000`, and the server must be able to reach it:

- **Local server** (`SITE_1_URL=http://localhost:8065`): no tunnel needed, the
  server reaches `127.0.0.1:3000` directly.

  ```sh
  cd detox && npm run start:webhook
  ```

- **Remote/cloud test server**: the server cannot reach your machine, so the
  sidecar needs a public HTTPS origin. `detox/scripts/start_webhook_sidecar.sh`
  starts `webhook_server.js` and resolves that origin, in priority order:

  | Env | Behaviour |
  |-----|-----------|
  | `WEBHOOK_PUBLIC_BASE_URL` | Use an already-routable HTTPS origin as-is (named tunnel, ngrok, reverse proxy). Preferred. |
  | `WEBHOOK_PUBLIC_BASE_URL` + `CLOUDFLARED_TUNNEL_TOKEN` | Run a named Cloudflare tunnel for that hostname. The token is passed via `TUNNEL_TOKEN` because argv is world-readable. |
  | neither | Fall back to a `trycloudflare.com` quick tunnel. Time-boxed and DNS-flaky, so treat it as a last resort. |

  ```sh
  cd detox
  SITE_1_URL="https://your-test-server" \
  WEBHOOK_PUBLIC_BASE_URL="https://your-tunnel-hostname" \
  bash scripts/start_webhook_sidecar.sh
  ```

  Pin a different `cloudflared` with `CLOUDFLARED_VERSION`; the script defaults to
  a known-good release rather than `latest`.

The script always exits 0 — it exports `WEBHOOK_SIDECAR_READY` and
`WEBHOOK_CALLBACKS_REACHABLE` instead of failing, and specs that need a webhook
fail fast on their own health check. A quick tunnel passes outbound health checks
but does not reliably deliver server-to-sidecar callbacks, so it reports
`WEBHOOK_CALLBACKS_REACHABLE=false`.

# Playbooks Tests (AI-Powered Testing)

The Playbooks tests leverage AI-powered testing through the Wix Pilot framework, enabling natural language test creation and execution.

### How It Works

The Playbooks tests utilize the [pilot library](https://wix-pilot.com/docs/guides/technical-overview), which connects to Anthropic Claude via the `ClaudePromptHandler`. This innovative approach allows you to:

- Write tests using natural language prompts
- Automatically translate prompts into executable test steps
- Maintain tests more intuitively through conversational interfaces
- Handle complex scenarios with AI-generated test logic

The system integrates seamlessly with your existing Detox test infrastructure while adding AI capabilities.

### Best Practices

For reliable and effective Playbooks tests, follow these guidelines from the [Pilot Best Practices Guide](https://wix-pilot.com/docs/guides/pilot-best-practices):

1. **Prompt Clarity**:
   - Write clear, concise prompts
   - Use specific action-oriented language
   - Avoid ambiguous phrasing

2. **Test Design**:
   - Keep prompts focused on single scenarios
   - Use deterministic language to prevent flaky tests
   - Structure complex tests as sequences of simple prompts

3. **Maintenance**:
   - Review AI-generated test steps before committing
   - Version control both prompts and generated code
   - Monitor test stability regularly

4. **Integration**:
   - Combine AI tests with traditional assertions
   - Use AI for complex scenarios, traditional methods for simple verifications
   - Document which tests are AI-generated

### Getting Started

To run Playbooks tests:

1. **Set up your environment**:
   ```sh
   export ANTHROPIC_API_KEY='your-api-key-here'
   ```

2. **Run tests normally**:
   - The system will automatically initialize the `ClaudePromptHandler` when the API key is detected
   - No additional configuration is required beyond the API key

3. **Execution examples**:
   ```sh
   # Run all Playbooks tests
   npm run e2e:android-test tests/playbooks/
   
   # Run a specific Playbook test
   npm run e2e:ios-test tests/playbooks/playbooks_basic.e2e.ts
   ```

### Technical Notes

- The Pilot framework handles the translation between natural language prompts and executable code
- Tests are cached locally after generation for faster subsequent runs
- All AI interactions are logged in the test artifacts for debugging
- The system falls back to traditional testing methods if the API key isn't available

For complete documentation, see:
- [Wix Pilot Technical Overview](https://wix-pilot.com/docs/guides/technical-overview)
- [Pilot Best Practices Guide](https://wix-pilot.com/docs/guides/pilot-best-practices)
