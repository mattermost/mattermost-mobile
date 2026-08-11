# E2E plan: Android full / iOS partial

Companion plan for [PR #10032](https://github.com/mattermost/mattermost-mobile/pull/10032) (Detox + Maestro orchestration via [Test System IO](https://github.com/mattermost/mattermost-test-system-io)).

## Goal

Cut the iOS critical path on **PR** E2E while keeping coverage. **Android owns the full functional matrix**; **iOS only covers complementary surfaces**. `MAIN` / `MASTER` / `RELEASE` keep full Detox iOS phone suite.

## How PR specs are identified / tagged

### Maestro — platform tags on each flow

Every flow under `detox/maestro/flows/**/*.yml` declares its Zephyr id plus **exactly one** platform tag:

| Tag | PR dispatch |
|---|---|
| `shared` | Android only |
| `android-only` | Android only |
| `ios-only` | iOS only |

Filter: `detox/maestro/config/exclude_tags.json` → Test System IO `maestro-exclude-tags`.

### Detox — `// Tags:` on each complementary spec file

Test System IO discovers Detox specs as normal `*.e2e.ts` paths under `detox/e2e/test` (excluding `ipad/`), then filters by preamble tags:

```ts
// Copyright …
// See LICENSE.txt for license information.

// Tags: @ios_complementary
```

| Input | Meaning |
|---|---|
| `detox-include-tags: @ios_complementary` | PR iOS phone — only tagged files are registered as dispatch units |
| (empty) | Android / full iOS / iPad — no include filter |

Requires Test System IO `test-system-io-dispatch-begin` with `detox-include-tags` ([PR #106](https://github.com/mattermost/mattermost-test-system-io/pull/106)).

**Important:** units keep real paths (`e2e/test/products/channels/…/*.e2e.ts`). Workers lease and report them like any other Detox run — no symlink trees or side JSON allowlists.

| Leg | PR selection |
|---|---|
| Detox Android | Full tree (`e2e/test`, exclude `ipad`) |
| Detox iPad | `…/ipad` (unchanged) |
| Detox iOS phone | Full tree + `@ios_complementary` (~30 screen-representative specs, 4 workers) |

| Run type | Detox iOS phone filter | Workers |
|---|---|---|
| `PR` | `@ios_complementary` | 4 |
| `MAIN` / `MASTER` / `RELEASE` | none (full suite) | 20 |

Add/remove complementary coverage by editing the `// Tags:` line on the spec file (grep `@ios_complementary`).

## Out of scope

- No orchestrator retries (`retest-on-fail: false` stays)
- No rename of `e2e-detox-pr.yml` (Matterwick entry)

## Checklist

- [x] Maestro platform tags + exclude_tags filters
- [x] Detox `// Tags: @ios_complementary` + Test System IO include-tags discovery
- [x] ~30 screen-representative iOS complementary specs
- [x] PR workflows register real paths through orchestration
- [ ] Re-run PR E2E and confirm all platforms green
