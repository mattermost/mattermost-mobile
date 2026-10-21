#!/usr/bin/env bash
# Cursor Cloud Agent install ("update") script.
# Hydrates JS deps the same way PR CI does. Must be idempotent.

set -Eeuo pipefail

log() { printf '[cloud-agent-install] %s\n' "$*" >&2; }

is_true() {
  case "${1:-}" in
    1|true|TRUE|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
ROOT="$PWD"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
export PATH="/usr/local/bin:$PATH"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

ensure_tool() {
  local tool="$1"
  if ! command -v "$tool" >/dev/null 2>&1; then
    log "Required tool '$tool' is not on PATH (Dockerfile should provide it)"
    return 1
  fi
}

ensure_tool node
ensure_tool npm
ensure_tool gh
ensure_tool jq

log "node $(node --version); npm $(npm --version); gh $(gh --version | head -n 1)"

if ! is_true "${CLOUD_AGENT_SKIP_NPM_DEPS:-}"; then
  log "Hydrating Node deps (npm ci --ignore-scripts)"
  # Match .github/actions/prepare-node-deps. A plain `npm ci`/`npm install`
  # runs Solidarity, which requires ANDROID_HOME and an emulator binary.
  NODE_ENV=development npm ci --ignore-scripts

  if [ -f node_modules/@sentry/cli/scripts/install.js ]; then
    log "Installing Sentry CLI binary"
    node node_modules/@sentry/cli/scripts/install.js
  fi

  log "Applying patch-package"
  npx patch-package

  log "Generating assets and Compass glyph map"
  node ./scripts/generate-assets.js
  COMPASS_ICONS="node_modules/@mattermost/compass-icons/font/compass-icons.ttf"
  mkdir -p assets/fonts android/app/src/main/assets/fonts
  cp "$COMPASS_ICONS" assets/fonts/
  cp "$COMPASS_ICONS" android/app/src/main/assets/fonts
  node scripts/generate-compass-glyph-map.mjs

  # Lifecycle scripts were skipped; still wire husky so agent commits run pre-commit.
  if ! is_true "${CLOUD_AGENT_SKIP_HUSKY:-}"; then
    log "Enabling husky git hooks"
    npx husky
  fi
else
  log "Skipping Node deps (CLOUD_AGENT_SKIP_NPM_DEPS set)"
fi

if ! is_true "${CLOUD_AGENT_SKIP_DETOX_DEPS:-}"; then
  if [ -f "$ROOT/detox/package-lock.json" ]; then
    log "Hydrating detox/ deps for typecheck"
    npm ci --prefix "$ROOT/detox"
  fi
else
  log "Skipping detox deps (CLOUD_AGENT_SKIP_DETOX_DEPS set)"
fi

log "Install complete"
