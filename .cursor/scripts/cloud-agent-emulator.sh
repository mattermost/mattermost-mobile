#!/usr/bin/env bash
# Launches the Android emulator for Mobile MCP.
# Runs in a tmux terminal pane so the agent and user can watch boot progress.
# Cloud agents lack /dev/kvm, so we force software acceleration with swiftshader_indirect.

set -Eeuo pipefail

log() { printf '[cloud-agent-emulator] %s\n' "$*" >&2; }

export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export ANDROID_AVD_HOME="${ANDROID_AVD_HOME:-$HOME/.android/avd}"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

AVD_NAME="${CLOUD_AGENT_AVD_NAME:-cloud_agent_avd}"

if ! avdmanager list avd 2>/dev/null | grep -q "Name: ${AVD_NAME}$"; then
  log "AVD '${AVD_NAME}' not found. Run '.cursor/scripts/cloud-agent-install.sh' first."
  exit 1
fi

log "Starting emulator '${AVD_NAME}' with software rendering (no KVM on cloud VMs)"

# -no-window:       headless
# -no-audio:        no host audio device in the cloud
# -no-snapshot:     don't try to use cached snapshots between runs
# -no-boot-anim:    faster cold boot
# -gpu swiftshader_indirect: software OpenGL (works without GPU passthrough)
# -accel off:       don't try to use KVM/HAXM
# -netfast:         skip slow network bring-up checks
exec emulator -avd "${AVD_NAME}" \
  -no-window \
  -no-audio \
  -no-snapshot \
  -no-boot-anim \
  -gpu swiftshader_indirect \
  -accel off \
  -netfast
