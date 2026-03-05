# AGENTS.md

## Cursor Cloud specific instructions

This is a React Native mobile app (Mattermost Mobile v2). On a headless Linux cloud VM, native iOS/Android builds and simulators are not available. Development workflow is limited to JS/TS tooling.

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

### Key caveats

- **`npm install` must use `--ignore-scripts`** on this VM because the `preinstall` script runs `npx solidarity` which checks for platform-specific tools (Android SDK, Xcode, watchman) that are not available. After `npm install --ignore-scripts`, manually run:
  1. `npx patch-package`
  2. Copy compass icons: `cp node_modules/@mattermost/compass-icons/font/compass-icons.ttf assets/fonts/ && cp node_modules/@mattermost/compass-icons/font/compass-icons.ttf android/app/src/main/assets/fonts`
  3. Generate assets: `node scripts/generate-assets.js`
  4. Copy sounds: `mkdir -p android/app/src/main/res/raw/ && cp assets/sounds/* android/app/src/main/res/raw/`
- **Node.js version**: 22.14.0 (per `.nvmrc`). The VM uses nvm; run `nvm use` to activate.
- **Full test suite is slow** with `--runInBand` (can take 20+ minutes). For targeted testing, use `npx jest --runInBand --testPathPattern="<regex>"`.
- **Jest "did not exit" warning** is expected on some test files due to LokiJS autosave timers; it does not indicate failure.
- **Pre-commit hook** (`.husky/pre-commit`) runs ESLint on staged JS/TS files and incremental TypeScript checking. Run `npm run check` to replicate this before committing.
- **Metro bundler** starts on `127.0.0.1:8081` but cannot serve to a device/simulator in this environment. Useful for verifying JS bundle compilation.
- See `CLAUDE.md` for full architecture details, testing patterns, and coding conventions.
