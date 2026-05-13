# Maestro E2E Tests — Agent Instructions

This directory contains Maestro flows for the Mattermost mobile app. Follow these rules when writing or modifying flows.

## Always Use testIDs — Never Coordinates

**CRITICAL**: Maestro flows MUST use `id:` (testID) selectors. **Never use `point:` (percentage coordinates)** to tap elements. Coordinates break on different device sizes and make tests unmaintainable.

```yaml
# BAD — brittle, device-size-dependent
- tapOn:
    point: "50%, 80%"

# GOOD — stable across all devices
- tapOn:
    id: "channel.post_draft.send_action.send.button"
```

**The only acceptable `point:` uses:**
- Dismissing system-level overlays that have no testID (e.g., iOS tutorial tooltips rendered outside the app's accessibility tree, where the tap has no effect on app state)

**If an element has no testID**: add one to the app source code — that is always the correct fix.

## testID Conventions

testIDs follow the codebase convention: `component.subcomponent.element`

```yaml
# Channel list
- tapOn:
    id: "channel_list.category.CHANNELS.channel_item.town-square.display_name"

# Post draft
- tapOn:
    id: "channel.post_draft.post.input"
- tapOn:
    id: "channel.post_draft.send_action.send.button"

# Thread
- tapOn:
    id: "thread.post_draft.post.input"

# Navigation
- tapOn:
    id: "navigation.header.back"

# Tab bar
- tapOn:
    id: "tab_bar.home.tab"

# Login / server forms
- tapOn:
    id: "login_form.username.input"
- tapOn:
    id: "server_form.server_url.input"

# Channel info / quick actions
- tapOn:
    id: "channel_header.channel_quick_actions.button"
- tapOn:
    id: "channel_info.channel_actions.join_start_call.action"

# Share extension
- tapOn:
    id: "share_extension.channel.option"
- tapOn:
    id: "share_extension.post.button"
```

Verify testIDs are in the accessibility hierarchy before writing flows:

```bash
# iOS
maestro --device <SIMULATOR_UDID> hierarchy

# Android
maestro --device <EMULATOR_SERIAL> hierarchy
```

## Bottom Sheet Accessibility (iOS)

`@gorhom/bottom-sheet` renders via Reanimated inside an `overCurrentContext` overlay. On iOS this makes content **invisible to Maestro's XCUITest tree** unless `accessibilityViewIsModal={true}` is set on the content container.

**Rule**: Bottom sheet content that needs Maestro interaction must have `accessibilityViewIsModal={true}` on its root view. This is already applied in `app/screens/bottom_sheet/index.tsx`. Inner `OptionItem` components need explicit `testID` props from their callers:

```tsx
// In the screen that renders the bottom sheet option:
<OptionItem
    testID="channel_bookmark.type.file"
    label="File"
    onPress={handleFile}
/>
```

```yaml
# Flow can then reference it:
- tapOn:
    id: "channel_bookmark.type.file"
```

## Wait Patterns

Always wait for elements to appear before interacting — never rely on fixed sleeps.

```yaml
# Wait for element before tapping
- extendedWaitUntil:
    visible:
      id: "channel.post_list.post"
    timeout: 15000
- tapOn:
    id: "channel.post_list.post"

# Wait for navigation to settle (use sparingly — prefer extendedWaitUntil)
- waitForAnimationToEnd:
    timeout: 3000
```

Use `extendedWaitUntil` (Maestro plugin) rather than `waitForAnimationToEnd` when waiting for specific elements. Reserve `waitForAnimationToEnd` only for cases where there is no specific element to poll (e.g., after a login tap before the home screen appears).

## Platform Conditionals

Use `when: platform:` blocks for iOS/Android differences. Keep shared steps outside `runFlow` blocks.

```yaml
# iOS-only block
- runFlow:
    when:
      platform: iOS
    commands:
      - launchApp:
          appId: "com.apple.mobilesafari"

# Android-only block
- runFlow:
    when:
      platform: Android
    commands:
      - launchApp:
          appId: "com.android.chrome"
```

## App Launch

Always use the `login.yml` sub-flow to handle app state (stale sessions, call screens, notification dialogs) rather than launching the app directly.

```yaml
appId: ${MAESTRO_APP_ID}
---
- runFlow: ../../utils/login.yml
- runFlow: ../../utils/navigate_to_channel.yml
```

iOS and Android have different launch requirements (see `utils/login.yml` comments). Do not add raw `launchApp` calls to flows when `login.yml` already handles app state cleanup.

## Environment Variables

Flows must not hardcode server URLs, credentials, or channel names. Use env vars:

| Variable | Description |
|----------|-------------|
| `${MAESTRO_APP_ID}` | App bundle ID (e.g. `com.mattermost.rnbeta`) |
| `${SITE_1_URL}` | Primary test server URL |
| `${TEST_USER_EMAIL}` | Test user email |
| `${TEST_USER_PASSWORD}` | Test user password |
| `${TEST_CHANNEL_NAME}` | Test channel name (set by seed script) |
| `${TEST_TEAM_NAME}` | Test team name (set by seed script) |

```yaml
# BAD
- inputText: "https://myserver.mattermost.com"

# GOOD
- inputText: ${SITE_1_URL}
```

## Tagging

Every flow file must declare a tag matching its Mattermost test case ID:

```yaml
tags:
  - MM-T3260
appId: ${MAESTRO_APP_ID}
---
```

## Sub-Flows

Extract shared setup into `utils/` sub-flows. Call them with `runFlow`:

```yaml
# Reference from a flow in maestro/flows/account/
- runFlow: ../../utils/login.yml
- runFlow: ../../utils/navigate_to_channel.yml
```

Do not duplicate login or navigation logic inside individual flow files.

## Optional Elements

Use `optional: true` for elements that may or may not appear (permission dialogs, tooltips, onboarding prompts):

```yaml
# Microphone permission — first run only
- tapOn:
    text: "Allow"
    optional: true

# iOS "Save Password?" dialog
- tapOn:
    text: "Not Now"
    optional: true

# Scheduled post tooltip (may appear after channel name input)
- tapOn:
    id: "scheduled_post.tooltip.dismiss"
    optional: true
```

## Screenshots for Debugging

Add `takeScreenshot` steps around the interaction being tested and at failure points:

```yaml
- takeScreenshot: before-share-tap
- tapOn:
    text: "Share..."
- takeScreenshot: after-share-tap
```

Screenshot names must be kebab-case and descriptive. They are uploaded as CI artifacts.

## Cross-Platform Notes

- **iOS share extension**: The share extension runs in a separate process (`com.mattermost.rnbeta.MattermostShare`). Maestro must be attached to the host app (e.g. Safari) before the share sheet opens; after tapping "Mattermost Beta" the extension process becomes the visible UI.
- **Android port forwarding**: Run `adb reverse tcp:8065 tcp:8065` before Maestro Android tests so `localhost` inside the emulator maps to the host machine.
- **iOS timezone**: Set via `xcrun simctl spawn $SIMULATOR_ID launchctl setenv TZ "America/New_York"` — `simctl timezone` was removed in Xcode 26.
- **Android timezone**: Set via `adb root && adb shell setprop persist.sys.timezone "America/New_York"`.
