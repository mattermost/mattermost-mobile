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

### Gotchas

- **Do not use `npm install`** directly — the `preinstall` script calls `npx solidarity` which will fail on Linux (expects macOS toolchain). Always use `npm ci --ignore-scripts` then run post-steps manually.
- **patch-package** must run after `npm ci --ignore-scripts` — the 30 patches in `patches/` are critical for the app to work.
- **Tests take ~7 minutes** to run the full suite (~570 suites, ~7200 tests) with `--runInBand`. Use `npx jest <path>` to run individual test files for faster iteration.
- **Metro bundler** binds to `127.0.0.1:8081`. Verify with `curl http://127.0.0.1:8081/status`.
- **Pre-commit hook** (`scripts/pre-commit.sh`) runs ESLint on staged files and incremental TypeScript checking. It will run automatically via Husky if git hooks are set up.
