# CLAUDE.md

## Project Overview

React Native 0.76.9 with **New Architecture disabled** (RCT_NEW_ARCH_ENABLED=0).

## Important Development Notes
- Always run the checks before committing code
- Always test any changes using the mobile mcp before calling something complete or committing code
- Never commit any planning markdown files

## Development Workflow

### Implementing Multi-Phase Features
When implementing complex features with multiple phases:

1. **Use subagents for each phase**: Launch a subagent (Task tool with `subagent_type: general-purpose`) to implement each phase independently
2. **Test after each phase**: Use a subagent to test the feature with mobile MCP after implementation
3. **Commit after each phase**: Create a commit for each completed and tested phase
4. **Never commit planning files**: Keep `.md` planning files (like `PLAN.md`) out of commits

### Testing with Mobile MCP
When testing features that require mobile device interaction:
- **Use subagents**: Launch a subagent to handle mobile MCP testing to avoid excessive context usage
- The subagent can launch the app, navigate, take screenshots, and verify functionality
- **Don't just verify the app launches** - actually trigger and interact with the feature being tested (e.g., send messages, click buttons, verify state changes)

## Key Commands

```bash
# Setup
npm run pod-install           # iOS CocoaPods (or pod-install-m1 for M1 Macs)
npm run ios-gems              # Ruby gems for iOS (or ios-gems-m1 for M1 Macs)

# Development
npm start                     # Start Metro bundler
npm run ios                   # Run iOS in simulator
npm run android               # Run Android in emulator

# TypeScript type checking
npm run tsc

# Fix linting issues
npm run fix

# E2E tests are in separate detox/ package
npm run e2e:ios               # cd detox && npm run e2e:ios-test
npm run e2e:android           # cd detox && npm run e2e:android-build && npm run e2e:android-test

# Builds delegate to Fastlane via shell scripts
npm run build:ios             # ./scripts/build.sh ipa
npm run build:android         # ./scripts/build.sh apk

# Utilities
npm run clean                 # Clean build artifacts
```

## Architecture

### Dual Database System (WatermelonDB)
**Critical**: Two separate SQLite databases via WatermelonDB:

1. **App Database**: One global database for app state, server list (`app/database/models/app/`)
2. **Server Databases**: One database per connected server for channels, users, posts (`app/database/models/server/`)

**DatabaseManager** singleton (`app/database/manager/index.ts`) manages all instances. Data operations go through operators with transformers/handlers/comparators.

**Database directory**:
- iOS: App Group directory (shared with extensions)
- Android: `${documentDirectory}/databases/`

### Network Layer
- **NetworkManager** (`app/managers/network_manager.ts`) creates **one Client instance per server**
- Uses `@mattermost/react-native-network-client`
- **Product-specific API calls** should live in `client/rest.ts` within the product folder using the **ClientMix pattern** (see `app/products/calls/client/rest.ts` or `app/products/agents/client/rest.ts` for examples). Don't call `client.doFetch()` directly from action files.

### Actions Pattern
- **Local Actions** (`app/actions/local/`): Database-only operations
- **Remote Actions** (`app/actions/remote/`): Fetch from API → use operators to persist → return `{error}` on failure

### Query Layer
**Query layer** (`app/queries/`) provides both:
- `query*`: Returns WatermelonDB Query
- `observe*`: Returns RxJS Observable
- `get*`: Returns Promise (async)
- `prepare*`: Returns prepared records for batch operations

### State Management
**Hybrid approach**:
- **WatermelonDB**: Primary data store (persisted)
- **Ephemeral Stores** (`app/store/`): In-memory transient UI state

### Navigation
- Uses **`react-native-navigation`** v7 (not react-navigation)
- Each screen is a separate registered component
- Every independently shown/hidden component must be registered as a screen for proper lifecycle management

### Products Architecture
Modular features in `app/products/` with their own database models:
- `agents/`: AI agents
- `calls/`: Voice/video calling
- `playbooks/`: Playbooks with dedicated DB models

#### Agents Streaming Architecture
**WebSocket Events:**
- Agents use `custom_mattermost-ai_postupdate` WebSocket events for streaming (start, message updates, reasoning, tool calls, annotations, end)
- NO specific WebSocket event for tool call status changes after approval/rejection
- Updates arrive via standard `POST_EDITED` event after backend executes tools

**Critical Pattern:**
- Components must clear local streaming state on `ENDED` event to switch from ephemeral streaming data to persisted database data
- Otherwise stale streaming state prevents POST_EDITED updates from displaying

### Custom Native Modules
Located at `libraries/@mattermost/`:
- `@mattermost/rnutils` - Native utilities (orientation, notifications)
- `@mattermost/rnshare` - Share extension integration
- `@mattermost/hardware-keyboard` - External keyboard detection
- `@mattermost/secure-pdf-viewer` - Secure PDF viewing

**Native Bridge patterns** (when modifying native modules):
- iOS: `RCT_EXPORT_MODULE()`, `RCT_EXPORT_METHOD()` in Objective-C++
- Android: Extend `ReactContextBaseJavaModule`, use `@ReactMethod`

### TypeScript Path Aliases
```typescript
@actions/*     → app/actions/*
@agents/*      → app/products/agents/*
@calls/*       → app/products/calls/*
@database/*    → app/database/*
@queries/*     → app/queries/*
@store         → app/store/index
@share/*       → share_extension/*
@typings/*     → types/*
// ... (see tsconfig.json for complete list)
```

### Share Extension
**Separate bundle** at `share_extension/` for Android system share. Shares code with main app but runs independently.
* iOS has its own native implementation for the Share Extension with Swift and SwiftUI

**Important:** Share extension on Android uses **React Navigation** (not react-native-navigation like main app).

## Testing

### Test Organization
- **Jest coverage excludes** `/components/` and `/screens/` directories
- Mock database manager at `app/database/manager/__mocks__/index.ts`
- **E2E tests** in separate `detox/` package (not in main package.json)
- Add mocks to central `setup.ts` file, not individual test files

### Testing Patterns

#### Database Testing
- Tests use **real in-memory databases** (LokiJS), not mocks
- **Critical**: Set `extraLokiOptions: {autosave: false}` to prevent memory leaks from lingering timeouts
- Always clean up: `await DatabaseManager.destroyServerDatabase(serverUrl)` in `afterEach`
- Initialize database in `beforeEach`: `await DatabaseManager.init([serverUrl])`

#### Ephemeral Store Testing
- Use `jest.resetModules()` between tests to clear singleton state
- Require fresh imports after reset: `const Store = require('./store').default;`
- Pattern from `app/store/ephemeral_store.test.ts`

#### WebSocket Testing
- Mock connection objects, not the WebSocket class itself
- Create mock with methods: `onOpen`, `onClose`, `onError`, `onMessage`, `send`, `readyState`
- Use `client.open()` in tests to trigger `onOpen` callback
- Pattern from `app/client/websocket/index.test.ts`

#### Timer Testing
- **Always use**: `jest.useFakeTimers({doNotFake: ['nextTick']})` to let promises resolve
- Helper: `advanceTimers(ms)` from `test/timer_helpers.ts` advances time AND waits for promises
- Never fake `nextTick` or async operations will hang

#### Component Rendering
- Three helpers in `test/intl-test-helper.tsx`:
  - `renderWithIntl`: Basic internationalization
  - `renderWithIntlAndTheme`: + Theme context
  - `renderWithEverything`: + Database + Server URL
- Use `renderWithEverything` when components need database access
- Wrap async state updates in `act()` when testing React components

#### Remote Action Testing
- Mock `NetworkManager.getClient` in `beforeAll` to return mock client
- Mock client should implement all methods used in tests
- Test pattern: Setup DB state → Call action → Assert no error and data returned
- Pattern from `app/actions/remote/channel.test.ts`

#### DeviceEventEmitter Testing
- Use `DeviceEventEmitter.addListener()` to spy on events
- Remove listener in cleanup: `listener.remove()`
- Pattern: Store listener callback in jest.fn(), assert it was called with expected data

### Test Utilities
**TestHelper** singleton at `test/test_helper.ts`:
- `generateId()`: Deterministic IDs for tests
- `setupServerDatabase()`: Complete DB setup with basic entities
- `fakeUser()`, `fakeChannel()`, etc.: Entity generators with sensible defaults
- `fakeUserModel()`, `fakeChannelModel()`: WatermelonDB model creators

### Writing Quality Tests

**Test names:**
- Use `it('should...')` format, not `test('happy path')`
- Check array lengths in addition to individual items to ensure no extra elements
- Test expectations must match actual implementation behavior - if code deletes state immediately, test for `undefined`, not for modified state values

**Mocking:**
- Use `jest.mocked()` for full implementations
- Use `(thing as jest.Mock)` type assertion when mocking partial implementations that don't satisfy the full interface (e.g., `NetworkManager.getClient` returning minimal mock client)
- Avoid `any` types in tests - use `typeof import('./module').default` for proper typing of dynamically imported modules

**Don't test:**
- JavaScript operators (`===`, `JSON.stringify()`) or library behavior (React, RxJS)
- "Mocks calling mocks" - thin wrapper functions that just pass data through
- Multiple input variations when behavior is identical (testing 0, 1, 5 items when function doesn't special-case counts)
- Duplicate assertions - if test A verifies X, don't add test B that only verifies X
- AI-generated tests are heavily scrutinized and often rejected if they don't demonstrate real intended behavior

**Do test:**
- Business logic, error handling, integration points, side effects
- One example per code path is sufficient

## Development Practices

### TypeScript
- Trust well-formed data - don't add defensive null checks if types guarantee existence
- Use `??` (nullish coalescing) instead of `||` for fallbacks when appropriate
- Avoid non-null assertions (`!`) - use optional chaining: `metadataRes.metadata?.followers?.length ?? 0`
- Type function parameters using `ComponentProps<typeof Component>` instead of `as const` workarounds
- JSDoc comments must match actual parameter names and types
- **Prefer const objects over enums** for better tree-shaking: `export const Status = { Pending: 0, Done: 1 } as const;` with companion type `export type Status = typeof Status[keyof typeof Status];`

### React Hooks
- **Always explain why dependencies are omitted** from exhaustive-deps with specific comments
- Don't over-optimize with `useMemo` - only use for expensive calculations or objects passed as props to children
- Use `useCallback` for render functions passed to components, not for functions called within render
- Move module-level constants outside components
- Replace state variables with derived values when possible
- Stable references (refs, dispatch functions) don't need to be in dependency arrays but must have eslint-disable comments
- React-Native-Reanimated shared values (`.value`) don't cause re-renders and don't need to be dependencies
- **Critical**: When modifying existing `useEffect` hooks, you MUST include ALL dependencies used inside the effect, even if the original code had an incomplete dependency array - ESLint's `react-hooks/exhaustive-deps` rule is enforced strictly
- **Memoize callbacks for list items**: When rendering lists with `.map()`, avoid inline arrow functions like `onPress={() => handler(item.id)}`. Instead, have the child component accept the ID and call the callback internally, allowing the parent to pass a single memoized callback reference.

### React Native & UI
- Don't create hooks inside render functions - extract as local components
- Prefer `Button` components over `TouchableOpacity` when appropriate
- Non-memoized inline styles add render stress - define in stylesheet instead
- **`StyleSheet.create` is unnecessary** when using `makeStyleSheetFromTheme` - just return the plain object
- **Place `getStyleSheet` at file top** (after imports, before interfaces/components) not at the bottom
- Use `Platform.select()` for platform-specific values instead of ternaries
- StyleProps support nested lists - no need for custom `concatStyles()`
- Use `withTiming()` consistently for both states in animations
- Test components with long strings to ensure proper text handling
- Use constants from `PREFERENCES.THEMES` instead of hardcoded colors
- **Use `react-native-reanimated`** instead of React Native's `Animated` API for all animations (better performance, runs on UI thread)
- **Use `usePreventDoubleTap` hook** for button press handlers to prevent accidental double submissions
- **Use `useServerUrl()` hook** instead of passing `serverUrl` as a prop - it's available via context
- **Use existing components**: Check for `<Loading>` instead of `<ActivityIndicator>`, `safeParseJSON()` instead of try/catch JSON.parse
- **Parent checks before mounting**: If a child component would return null for empty data, have the parent conditionally render instead (e.g., `{items.length > 0 && <ItemList items={items} />}`)
- **Use `@utils/url` utilities**: `tryOpenURL()` instead of `Linking.openURL()`, `getUrlDomain()` with `urlParse` instead of `new URL()`

### Code Quality & Linting

**Import Organization:**
- Consolidate all imports from the same module into a single statement
- Use inline `type` keyword for type imports: `import {SomeValue, type SomeType} from '@module'`
- Example: `import {StreamingEvents, type StreamingState} from '@agents/types'`

**Unused Code:**
- Remove unused imports, parameters, interfaces, and variables completely
- ESLint enforces strict no-unused-vars - code with unused declarations will fail CI
- When a parameter is truly unused, remove it from the function signature

**Pre-commit:**
- Run `npm run fix` to auto-fix linting issues before committing
- Pre-commit hook runs ESLint + TypeScript checking automatically

### Error Handling & Logging
- Use `logError()` instead of `console.error()` or `console.log()`
- Use `logDebug()` for debug-level information
- Don't ignore potential errors silently - handle them or add intentional comments
- Don't log sensitive information
- **Add function/class prefix to logs**: e.g., `logError('[ClassName.methodName]', error)` to make debugging easier

### State Management
- Always handle errors from database operations
- Consider race conditions in async functions within effects
- Local state initialized with prop values won't update when props change - sync with `useEffect` if needed

### Performance
- Create parsers/expensive objects only once, not on every render (use refs or useMemo)
- Memoize AST output to avoid regenerating on every render
- Use named constants instead of magic numbers and check if one already exists.

### Localization (i18n)
- **CRITICAL**: Only update `en.json` - never modify other language files or Weblate gets corrupted
- Default messages in code must match JSON translations exactly, including newlines
- Translation IDs should be descriptive enough for translators to understand context
- Translate user-facing strings, not debug/error messages

### Markdown Component Usage
**Required props:**
- `baseTextStyle`, `value`, `theme`, `location`
- Use `Screens.CHANNEL` or appropriate constant from `@constants` for the `location` prop
- `textStyles`, `blockStyles`, `enableLatex`, and similar props are auto-generated via HOC

**Important Limitations:**
- **Cannot embed custom React components inline**: The Markdown component renders CommonMark to native components. You cannot insert custom React components (like badges, icons) inline within the markdown text flow
- **Link handling**: Links in markdown go through `openLink()` → deep link system → `tryOpenURL()`. Custom URL schemes (e.g., `citation:`, `action:`) will show error alerts unless you implement a full deep link handler in `app/utils/deep_link/`
- **Post-processing not possible**: Unlike web, you cannot post-process the rendered markdown JSX tree to replace markers with React components

### Adding New Post Types
When adding custom post types (e.g., for new products):
1. Add the type string to `PostType` union in `types/api/posts.d.ts`
2. Define constants in your product's constants file (e.g., `app/products/agents/constants.ts`)
3. Use the globally-available `Post` type (defined in `types/api/posts.d.ts`) - no import needed

### Platform-Specific
- iOS: Opt out of iOS 18+ features (liquid glass) until UI is properly addressed
- Android: Test on multiple API levels (34, 35, 36) to verify behavior with edge-to-edge changes
- Use `Set` instead of `Array` for exception lists (faster, ensures uniqueness)

### testID Convention
Components use hierarchical testIDs: `component.subcomponent.element`
- Example: `channel_list.category.CATEGORY.channel_item.ID.display_name`
- Example: `channel.post_draft.send_action.send.button`

## Common Mistakes to Avoid

### JavaScript Compatibility
- **Don't use `Object.hasOwn()`** - React Native doesn't support ES2022+ features
- ❌ `Object.hasOwn(obj, 'key')`
- ✅ `'key' in obj`

### Anti-Patterns
- Conditionals in tests for TypeScript satisfaction
- Creating new arrays/objects on every render when passed as props
- Over-engineering - follow YAGNI principle
- Impossible states with boolean + optional parameters that depend on each other
- Redundant checks - if `array.length >= 3`, indices 0,1,2 are guaranteed to exist
- Verbose error messages that reveal internal system details
- Mass assignment risks - whitelist fields instead of sending `Partial<Model>` objects
- Duplicate conditional branches that return identical results - consolidate into a single condition (e.g., `if (A && B)` and `if (A && !B)` both returning same thing should be just `if (A)`)

### Security
- Question whether showing secrets with "eye" toggle is a security concern
- Don't commit files that likely contain secrets (.env, credentials.json)
- Consider pre-populating sensitive fields with `*********` instead of actual values

## Configuration

- **Patches**: Applied via `patch-package` on postinstall (`patches/` directory)
- **Self-compiled apps**: Require your own Mattermost Push Notification Service
- **Self-signed certificates**: Not supported

## Development Notes

### Hot Reload & Build Times
- **Hot reload**: ~3 seconds for JS/TS changes; does NOT work for native code changes
- **Native rebuilds**: 10-30 minutes (avoid unless necessary)
- **Pre-commit hook**: Runs ESLint + incremental TypeScript checking

### Known Issues
- Many components require `theme` prop - check for `useTheme()` hook in parent component
