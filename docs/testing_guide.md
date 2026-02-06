# Unit testing guide

This document describes how to add and structure unit tests in the Mattermost Mobile project. For high-level testing notes and patterns, see the **Testing** section in [CLAUDE.md](../CLAUDE.md). For concrete examples, see [app/products/playbooks](../app/products/playbooks), which is the canonical reference for test layout and patterns.

## Where tests live

- Tests are **co-located** with source files: `*.test.ts` or `*.test.tsx` next to the file under test (e.g. `channel.test.ts` beside `channel.ts`).
- Screen entry points often have an `index.test.tsx` that tests the wrapper and passes through to the main screen component.
- Reference: [app/products/playbooks](../app/products/playbooks) for the full pattern.

## What to test by layer

### Local actions (`app/actions/local/`)

- Use a **real in-memory database**: `DatabaseManager.init([serverUrl])` in `beforeEach` and `DatabaseManager.destroyServerDatabase(serverUrl)` in `afterEach`.
- Use **TestHelper** for fake entities: `TestHelper.fakeChannel()`, `TestHelper.fakePost()`, `TestHelper.fakeChannelMember()`, etc.
- Cover: **not-found database** (invalid `serverUrl`), **not-found entity** (e.g. channel/post missing), **success path**, and **error path** (e.g. mock `database.write` or `operator.batchRecords` to throw).
- Example: [app/products/playbooks/actions/local/channel.test.ts](../app/products/playbooks/actions/local/channel.test.ts), [app/actions/local/post.test.ts](../app/actions/local/post.test.ts).

### Remote actions (`app/actions/remote/`)

- **Mock** `NetworkManager.getClient` in `beforeAll` to return a client with the methods used (e.g. `setChannelAutotranslation`, `setMyChannelAutotranslation`).
- Assert the client was called with the expected arguments and that the action returns `{data}` on success and `{error}` on failure.
- On error, assert `forceLogoutIfNecessary` (and any logging) is called when applicable.
- Example: [app/products/playbooks/actions/remote/playbooks.test.ts](../app/products/playbooks/actions/remote/playbooks.test.ts), [app/actions/remote/channel.test.ts](../app/actions/remote/channel.test.ts).

### Queries (`app/queries/servers/`)

- For **query** functions that return a WatermelonDB `Query`: use a real DB, create the relevant records with the operator, run the query, and assert on the fetched results.
- For **observe** functions that return RxJS observables (canonical pattern from playbooks):
  1. Use a **real database**: `DatabaseManager.init([serverUrl])` in `beforeEach`, destroy in `afterEach`.
  2. **Set up data** in the DB with the operator (e.g. `handleChannel`, `handleMyChannel`, `handleSystem`) so the observe under test has real records to emit.
  3. If the observe function depends on other observables from a **mocked module** (e.g. `observeConfigBooleanValue` from `./system`), mock that dependency to return an Observable (e.g. `jest.mocked(observeConfigBooleanValue).mockReturnValue(of$(true))`) so `combineLatest` and similar operators receive valid observables.
  4. Call the observe function with `database` (and any ids), then **subscribe** with a spy: `const subscriptionNext = jest.fn(); result.subscribe({ next: subscriptionNext });`
  5. **Assert** the emitted value: `expect(subscriptionNext).toHaveBeenCalledWith(expectedValue)`.
- You can also use `firstValueFrom(observable)` to await the first emission when that is clearer.
- Example: [app/products/playbooks/database/queries/run.test.ts](../app/products/playbooks/database/queries/run.test.ts) (`observePlaybookRunById`, `observePlaybookRunProgress`), [app/products/playbooks/database/queries/version.test.ts](../app/products/playbooks/database/queries/version.test.ts) (`observeIsPlaybooksEnabled`), [app/queries/servers/channel.test.ts](../app/queries/servers/channel.test.ts) (`observeChannelAutotranslation`, `observeMyChannelAutotranslation`, `observeIsChannelAutotranslated`).

### Screens and UI

- Use **`renderWithEverything`** from `@test/intl-test-helper` when the component needs database or server URL (pass `{database}` and optionally `serverUrl`). Use **`renderWithIntlAndTheme`** when it only needs theme/intl (no DB).
- Mock heavy or external deps: navigation, remote actions, `useServerUrl`, etc., with `jest.mock(...)`. Mock child components with `mockImplementation((props) => React.createElement('ComponentName', { testID: '...', ...props }))` so they render with a stable `testID` and forward props.
- **Asserting on props passed to children:** Query the **screen** for the rendered element (e.g. `getByTestId('...')` or `getAllByTestId('...')`), then assert with `expect(element).toHaveProp('propName', value)`. **Do not** use `jest.mocked(Component).mock.calls` or `mock.calls[0][0]` to inspect props—assert on what is in the tree, as in playbooks screen tests.
- Assert that key elements render (e.g. by `testID`) and that user actions (e.g. toggle, button press) call the expected handlers or actions.
- Use `fireEvent.press()` for button/toggle interactions; wrap async updates in `act()` or `waitFor` when needed.
- Use a **`getBaseProps()`** helper typed as `ComponentProps<typeof Component>` for default props and `beforeEach(() => jest.clearAllMocks())` where appropriate.
- Example: [app/products/playbooks/screens/select_user/select_user.test.tsx](../app/products/playbooks/screens/select_user/select_user.test.tsx), [app/screens/show_translation/show_translation.test.tsx](../app/screens/show_translation/show_translation.test.tsx).

### Client REST (`app/client/rest/`)

- Create the client (e.g. `TestHelper.createClient()`), then mock `client.doFetch`.
- Assert the request URL (and query string if any) and options (method, body, etc.), and that the return value or thrown error matches expectations.
- Example: [app/products/playbooks/client/rest.test.ts](../app/products/playbooks/client/rest.test.ts), [app/client/rest/channels.test.ts](../app/client/rest/channels.test.ts).

## Helpers and setup

- **TestHelper** (`test/test_helper.ts`): `fakeChannel`, `fakePost`, `fakeUser`, `fakeChannelMember`, etc.; `createClient()` for REST client tests.
- **Database**: `DatabaseManager.init([serverUrl])` and `DatabaseManager.destroyServerDatabase(serverUrl)`; get `database` and `operator` from `DatabaseManager.getServerDatabaseAndOperator(serverUrl)`.
- **Rendering**: `renderWithEverything(ui, { database, serverUrl })` when the component needs DB or server context.
- **Events**: `DeviceEventEmitter.addListener(Events.SOME_EVENT, callback)` to assert that an event was emitted; call `listener.remove()` in cleanup.

## Jest configuration

- Setup: `test/setup.ts` is run before tests; avoid adding one-off mocks there.
- Coverage: `coveragePathIgnorePatterns` in `jest.config.js` exclude `/components/` and `/screens/`, but tests for critical screens and components are still encouraged for regression safety.
