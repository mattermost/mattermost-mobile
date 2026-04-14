# How to Run Detox Tests

This guide will help you set up and run Detox tests for your project.

## Install Dependencies

First, navigate to the root directory of your project and install the necessary dependencies by running:

```sh
npm install
```

navigate to the `detox` folder and run `npm install`

## Android

### Build Detox Android App

To build the Detox Android app, navigate to the `detox` folder and run:

```sh
npm run e2e:android-inject-settings

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

## iOS

### Build iOS Simulator

To build the iOS simulator for Detox, navigate to the `detox` folder and run:

```sh
npm run e2e:ios-build
```

This will build the Simulor .zip file at the root folder.

Create a folder named `mobile-artifacts` at the project root. Unzip the zip file and move the mattermost app under `mobile-artifacts.`

```sh
# From project root
mkdir mobile-artifacts
```

### Run iOS Tests

To execute the Detox tests on iOS, navigate to the `detox` folder and run:

```sh
npm run e2e:ios-test

# To run a particular tests

npm run e2e:android-test path to test file.
```

### Disabling Password Autofill (Optional)

iOS password autofill can interfere with login tests by automatically filling credentials. To disable this feature on your simulator:

```sh
# Interactive mode - select simulator from list
npm run e2e:ios-disable-autofill

# Or specify simulator ID directly
npm run e2e:ios-disable-autofill -- --simulator-id SIMULATOR_UDID
```

**When to use this:**
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

# Auto-Translation E2E Tests

Auto-translation tests require a running LibreTranslate mock and a Mattermost server with auto-translation enabled and the translation plugin configured to use the mock.

### 1. Start the LibreTranslate mock

From the project root or the `detox` folder:

```sh
node detox/mock_libre_translate.js
```

The mock listens on port 3010 by default. Set `PORT` to use another port. Optional: set `LIBRE_TRANSLATE_MOCK_URL` (e.g. `http://localhost:3010`) when running tests if the mock is on a different host/port.

### 2. Server configuration

- Enable auto-translation on the server (e.g. **EnableAutoTranslation** in config).
- Configure the translation plugin (e.g. mattermost-plugin-autotranslate) to use the LibreTranslate API URL pointing at the mock.
- For the app running in the emulator/device to reach the mock, use a URL reachable from the device (e.g. `http://10.0.2.2:3010` for Android emulator, or your machine’s IP and the mock port). Configure this in the plugin/translation service settings on the server.

### 3. Run auto-translation tests

```sh
npm run e2e:android-test e2e/test/products/channels/autotranslation
# or
npm run e2e:ios-test e2e/test/products/channels/autotranslation
```

Tests use `setMockSourceLanguage` from `@support/libre_translate_mock` to set the mock’s detected source language (e.g. so messages are treated as Spanish and translated for an English-preference user).

---

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
