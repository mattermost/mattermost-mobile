# Mattermost Mobile E2E Tests with Detox

Comprehensive end-to-end testing suite for Mattermost Mobile using Detox.

## 🚀 Quick Start

### Prerequisites

**iOS:**
- macOS with Xcode installed
- Node.js 18+ and npm
- iOS Simulator
- Homebrew

**Android:**
- Node.js 18+ and npm
- Android SDK (API 34)
- Android Emulator or physical device
- Java 17

### Initial Setup

First, navigate to the root directory of your project and install the necessary dependencies:

```sh
npm install
```

Navigate to the `detox` folder and run:
```sh
cd detox
npm install
```

**Copy environment configuration:**
```sh
cp .env.detox.example .env
```

Update `.env` with your test server URLs and credentials (optional for basic testing).

## 🧪 Running Tests

### iOS

#### Quick Smoke Tests (5-10 minutes)
```sh
cd detox
npm run e2e:ios-build
npm run e2e:ios-test-smoke
```

#### Full Test Suite
```sh
npm run e2e:ios-test
```

#### Run Specific Test
```sh
npm run e2e:ios-test test/products/channels/messaging/message_post.e2e.ts
```

### Android

#### Quick Smoke Tests (5-10 minutes)
```sh
cd detox
npm run e2e:android-inject-settings
npm run e2e:android-build
npm run e2e:android-test-smoke
```

#### Full Test Suite
```sh
npm run e2e:android-test
```

#### Run Specific Test
```sh
npm run e2e:android-test test/products/channels/messaging/message_post.e2e.ts
```

#### Create Custom Emulator
```sh
./create_android_emulator.sh SDK_VERSION AVD_NAME

# Examples:
./create_android_emulator.sh 34 pixel_5a_avd
./create_android_emulator.sh 34 pixel_5a_avd --headless
./create_android_emulator.sh 34 pixel_5a_avd --debug  # See emulator logs
```

## 📊 Test Results

Test artifacts are generated under:
- iOS: `detox/artifacts/ios-debug-*`
- Android: `detox/artifacts/android-debug-*`

Artifacts include:
- HTML test reports
- Failure screenshots (only for failed tests)
- Test logs

Clean artifacts:
```sh
npm run clean-artifacts
```

## ⚙️ Configuration

### Test Timeout
- **Default:** 60 seconds per test
- **Location:** `e2e/config.js`
- **Customize:** Set `testTimeout: 90000` for slower tests

### Parallel Execution
- **Local:** 2 workers (faster test runs)
- **CI:** 1 worker per shard, 10 shards total
- **Configure:** Edit `maxWorkers` in `e2e/config.js`

### Environment Variables
Copy `.env.detox.example` to `.env` and customize:
- Test server URLs
- Admin credentials
- Device configuration
- AWS/Zephyr integration (optional)

## 🚨 Troubleshooting

### Metro Bundler Issues
```sh
# Reset Metro cache
npm start -- --reset-cache

# Kill Metro process
pkill -f "node.*react-native.*start"
```

### iOS Simulator Issues
```sh
# Reset all simulators
xcrun simctl erase all

# List available simulators
xcrun simctl list devices
```

### Android Emulator Issues
```sh
# List AVDs
emulator -list-avds

# Recreate emulator
cd detox
./create_android_emulator.sh 34 detox_pixel_4_xl
```

### Test Hangs or Timeouts
1. Verify app is built: `npm run e2e:ios-build`
2. Check simulator/emulator is running
3. Verify Metro: `curl http://localhost:8081/status`
4. Increase timeout in `e2e/config.js` if needed

## 📈 Performance Improvements

### Recent Optimizations
- ✅ Enabled Detox synchronization (no more blind waits)
- ✅ Reduced test timeout: 180s → 60s
- ✅ Replaced `sleep 120s` with Metro readiness check
- ✅ CI timeout: 180min → 60min (iOS) / 90min (Android)
- ✅ Added comprehensive caching
- ✅ Local parallel execution (2 workers)
- ✅ Artifacts only on failure
- ✅ Reduced retry attempts: 3 → 1

### Expected Results
- **CI Runtime:** 60-70% faster (180min → 45-60min)
- **Local Runtime:** 50% faster with parallel execution
- **Feedback Loop:** 5-10 minutes with smoke tests
- **Flakiness:** Significantly reduced

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

