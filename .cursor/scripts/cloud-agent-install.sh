#!/usr/bin/env bash
# Cursor Cloud Agent install ("update") script for mattermost-mobile.
# Runs from project root on every boot. MUST be idempotent.

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
export JAVA_HOME="${JAVA_HOME:-/opt/java}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export ANDROID_AVD_HOME="${ANDROID_AVD_HOME:-$HOME/.android/avd}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:/usr/local/bin:$PATH"
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
ensure_tool java
ensure_tool sdkmanager
ensure_tool avdmanager
ensure_tool emulator
ensure_tool adb

# The Intune submodule is private and not required for cloud-agent work.
# Mark it as initialized-but-empty so postinstall doesn't choke on a missing dir.
if [ -d libraries/@mattermost/intune ] && [ ! -f libraries/@mattermost/intune/.gitkeep ]; then
  mkdir -p libraries/@mattermost/intune
  touch libraries/@mattermost/intune/.gitkeep
fi

# Hydrate Node deps. Cloud agents are Linux, so the postinstall script's
# CocoaPods step is a no-op (iOS is unsupported in cloud agents).
if ! is_true "${CLOUD_AGENT_SKIP_NPM_INSTALL:-}"; then
  if [ -f package-lock.json ]; then
    log "Installing Node deps (npm ci)"
    npm ci
  else
    log "Installing Node deps (npm install)"
    npm install
  fi
fi

# Create the AVD if missing. System-image arch matches the build host.
ensure_avd() {
  local avd_name="${CLOUD_AGENT_AVD_NAME:-cloud_agent_avd}"
  local platform_version="${CLOUD_AGENT_ANDROID_PLATFORM:-34}"
  local abi="x86_64"
  case "$(dpkg --print-architecture)" in
    arm64) abi="arm64-v8a" ;;
  esac
  local package="system-images;android-${platform_version};google_apis;${abi}"

  if avdmanager list avd 2>/dev/null | grep -q "Name: ${avd_name}$"; then
    log "AVD '${avd_name}' already exists"
    return 0
  fi

  log "Creating AVD '${avd_name}' (${package})"
  echo no | avdmanager create avd \
    --name "${avd_name}" \
    --package "${package}" \
    --device "pixel_6" \
    --force

  # Tune the config for headless cloud use: software GPU, reasonable memory, no boot animation.
  local cfg="${ANDROID_AVD_HOME}/${avd_name}.avd/config.ini"
  if [ -f "$cfg" ]; then
    {
      grep -v -E '^(hw\.gpu\.enabled|hw\.gpu\.mode|hw\.ramSize|disk\.dataPartition\.size|hw\.keyboard|skin\.dynamic|showDeviceFrame)=' "$cfg" || true
      echo 'hw.gpu.enabled=yes'
      echo 'hw.gpu.mode=swiftshader_indirect'
      echo 'hw.ramSize=4096'
      echo 'disk.dataPartition.size=8G'
      echo 'hw.keyboard=yes'
      echo 'skin.dynamic=yes'
      echo 'showDeviceFrame=no'
    } > "${cfg}.tmp" && mv "${cfg}.tmp" "$cfg"
    log "Tuned AVD config at $cfg"
  fi
}

if ! is_true "${CLOUD_AGENT_SKIP_AVD:-}"; then
  ensure_avd
fi

# agent-browser (computer use): re-run install in case the Dockerfile step failed.
if ! is_true "${CLOUD_AGENT_SKIP_AGENT_BROWSER_INSTALL:-}"; then
  if command -v agent-browser >/dev/null 2>&1; then
    agent-browser install >/dev/null 2>&1 || log "agent-browser browser download failed; will retry next boot"
  fi
fi

log "Tool versions:"
node --version 2>&1 | sed 's/^/  node /' >&2 || true
npm --version 2>&1 | sed 's/^/  npm /' >&2 || true
java -version 2>&1 | sed 's/^/  /' >&2 || true
sdkmanager --version 2>&1 | sed 's/^/  sdkmanager /' >&2 || true
adb --version 2>&1 | head -n 1 | sed 's/^/  /' >&2 || true
emulator -version 2>&1 | head -n 1 | sed 's/^/  /' >&2 || true

log "Install complete"
