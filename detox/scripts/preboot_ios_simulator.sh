#!/bin/bash
# Pre-boot an iOS simulator for Detox CI.
#
# Optimized vs the inline workflow script:
#   - One blocking bootstatus for sims that already have CoreSimulator dirs (typical CI).
#   - Autofill plists written while shutdown — no "init boot just to mkdir" on warm sims.
#   - Skips autofill re-configuration when already applied (marker + plist check).
#   - Drops the redundant 8–10s bootstatus poll after bootstatus already completed.
#   - Brand-new simulators (simctl create) still use boot → shutdown → configure → boot.
#
# Requires: DEVICE_NAME, DEVICE_OS_VERSION. Writes SIMULATOR_ID to GITHUB_ENV when set.
# Optional: PREBOOT_SKIP_PREWARM=1, PREBOOT_PREWARM_SECS (default 15).

set -euo pipefail

readonly BUNDLE_ID="com.mattermost.rnbeta"
readonly AUTOFILL_MARKER="mattermost-ci-autofill-v1"
readonly PREWARM_SECS="${PREBOOT_PREWARM_SECS:-15}"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log() {
    echo "[preboot $(date +%H:%M:%S)] $*"
}

sim_state() {
    xcrun simctl list devices 2>/dev/null | grep "$SIMULATOR_ID" | sed -E 's/.*\((Booted|Shutdown|Booting|Creating)\)$/\1/' || echo "Unknown"
}

shutdown_if_booted() {
    if [ "$(sim_state)" = "Booted" ]; then
        log "Shutting down simulator to edit autofill plists..."
        xcrun simctl shutdown "$SIMULATOR_ID" || true
        for _ in 1 2 3 4 5 6 7 8; do
            [ "$(sim_state)" = "Shutdown" ] && return 0
            sleep 0.5
        done
        log "Warning: simulator may not have reached Shutdown state"
    fi
}

boot_and_wait() {
    log "Booting simulator $SIMULATOR_ID..."
    xcrun simctl boot "$SIMULATOR_ID" 2>/dev/null || true
    log "Waiting for boot to complete (blocking bootstatus)..."
    xcrun simctl bootstatus "$SIMULATOR_ID"
}

autofill_already_configured() {
    [ -f "$AUTOFILL_STAMP" ] && return 0
    [ -f "$SETTINGS_PLIST" ] || return 1
    plutil -extract restrictedBool.allowPasswordAutoFill.value raw "$SETTINGS_PLIST" 2>/dev/null | grep -qi 'false'
}

configure_autofill_offline() {
    log "Disabling password autofill (simulator shut down)..."
    mkdir -p "$SETTINGS_DIR"
    if ! (cd "$REPO_ROOT/detox" && node utils/disable_ios_autofill.js --simulator-id "$SIMULATOR_ID"); then
        echo "Failed to disable password autofill"
        exit 1
    fi
    touch "$AUTOFILL_STAMP"
}

seed_password_defaults() {
    log "Seeding Passwords.app defaults (best-effort)..."
    xcrun simctl spawn "$SIMULATOR_ID" defaults write com.apple.Passwords AutoFill -bool NO 2>/dev/null || true
    xcrun simctl spawn "$SIMULATOR_ID" defaults write com.apple.Passwords AutoSave -bool NO 2>/dev/null || true
    xcrun simctl spawn "$SIMULATOR_ID" defaults write com.apple.Passwords credentialSaveNotificationsEnabled -bool NO 2>/dev/null || true
    xcrun simctl spawn "$SIMULATOR_ID" defaults write com.apple.springboard AutoFillPasswords -bool NO 2>/dev/null || true
}

install_app() {
    local app_path
    app_path=$(ls -d "$REPO_ROOT"/mobile-artifacts/*.app 2>/dev/null | head -1)
    if [ -z "$app_path" ]; then
        echo "No .app bundle found in mobile-artifacts/"
        ls -la "$REPO_ROOT/mobile-artifacts/" || true
        exit 1
    fi
    log "Installing $app_path..."
    xcrun simctl install "$SIMULATOR_ID" "$app_path"
}

grant_notifications() {
    log "Pre-granting notification permission..."
    xcrun simctl privacy "$SIMULATOR_ID" grant notifications "$BUNDLE_ID" || true
}

kill_app_via_launchd() {
    local app_pid
    app_pid=$(xcrun simctl spawn "$SIMULATOR_ID" launchctl list 2>/dev/null | \
        grep "$BUNDLE_ID" | awk '{print $1}' | grep -E '^[0-9]+$' || true)
    if [ -n "$app_pid" ]; then
        xcrun simctl spawn "$SIMULATOR_ID" kill -9 "$app_pid" 2>/dev/null || true
        log "Killed app via launchd (PID $app_pid)"
    fi
}

prewarm_app() {
    local sleep_time="${1:-$PREWARM_SECS}"
    log "Pre-warming app (${sleep_time}s launch window)..."
    xcrun simctl launch "$SIMULATOR_ID" "$BUNDLE_ID" 2>/dev/null &
    local launch_pid=$!
    sleep "$sleep_time"
    kill "$launch_pid" 2>/dev/null || true
    wait "$launch_pid" 2>/dev/null || true
    kill_app_via_launchd
    if xcrun simctl get_app_container "$SIMULATOR_ID" "$BUNDLE_ID" data 2>/dev/null; then
        log "Data container verified"
        return 0
    fi
    log "Data container not found after pre-warm"
    return 1
}

wait_ready_quick() {
    # bootstatus already blocked until ready; one -b check avoids an extra fixed sleep.
    if xcrun simctl bootstatus "$SIMULATOR_ID" -b 2>/dev/null; then
        log "Simulator ready"
        return 0
    fi
    log "Quick readiness check failed — waiting up to 5s..."
    for _ in 1 2 3 4 5; do
        sleep 1
        xcrun simctl bootstatus "$SIMULATOR_ID" -b 2>/dev/null && return 0
    done
    log "Warning: simulator may not be fully ready"
    return 0
}

verify_health() {
    if ! xcrun simctl bootstatus "$SIMULATOR_ID" -b 2>/dev/null; then
        log "Simulator unresponsive — rebooting..."
        xcrun simctl shutdown "$SIMULATOR_ID" || true
        sleep 2
        boot_and_wait
        open -a Simulator --args -CurrentDeviceUDID "$SIMULATOR_ID" || true
    fi
    if ! xcrun simctl get_app_container "$SIMULATOR_ID" "$BUNDLE_ID" 2>/dev/null; then
        log "App missing — reinstalling..."
        install_app
    fi
    sudo mdutil -a -i off 2>/dev/null || true
}

find_or_create_simulator() {
    local device_name="${DEVICE_NAME:?DEVICE_NAME is required}"
    local os_version="${DEVICE_OS_VERSION:?DEVICE_OS_VERSION is required}"

    log "Looking for simulator: $device_name ($os_version)"
    SIMULATOR_ID=$(xcrun simctl list devices | grep "$device_name" | grep "$os_version" | head -1 | grep -oE '([0-9A-F-]{36})' || true)

    if [ -n "$SIMULATOR_ID" ]; then
        log "Found existing simulator: $SIMULATOR_ID"
        return 0
    fi

    log "Creating simulator..."
    local device_type runtime
    device_type=$(xcrun simctl list devicetypes | grep "${device_name} (" | head -1 | awk -F'[()]' '{print $(NF-1)}')
    runtime=$(xcrun simctl list runtimes | grep "$os_version" | head -1 | sed 's/.* - \(.*\)/\1/')
    if [ -z "$device_type" ] || [ -z "$runtime" ]; then
        echo "Could not resolve device type or runtime for $device_name / $os_version"
        exit 1
    fi
    SIMULATOR_ID=$(xcrun simctl create "CI-${device_name}" "$device_type" "$runtime")
    log "Created simulator: $SIMULATOR_ID"
    export SIMULATOR_NEEDS_INIT_BOOT=1
}

# ─── Main ────────────────────────────────────────────────────────────────────

find_or_create_simulator

SETTINGS_DIR="$HOME/Library/Developer/CoreSimulator/Devices/$SIMULATOR_ID/data/Containers/Shared/SystemGroup/systemgroup.com.apple.configurationprofiles/Library/ConfigurationProfiles"
SETTINGS_PLIST="$SETTINGS_DIR/UserSettings.plist"
AUTOFILL_STAMP="$SETTINGS_DIR/.$AUTOFILL_MARKER"

if autofill_already_configured; then
    log "Autofill restrictions already configured — skipping plist edit"
    if [ "$(sim_state)" != "Booted" ]; then
        boot_and_wait
    else
        log "Simulator already booted"
    fi
elif [ -n "${SIMULATOR_NEEDS_INIT_BOOT:-}" ] || [ ! -d "$SETTINGS_DIR" ]; then
    # Fresh simulator: one boot creates system group dirs, then configure offline, then boot again.
    log "New simulator — init boot to create CoreSimulator dirs..."
    boot_and_wait
    shutdown_if_booted
    configure_autofill_offline
    boot_and_wait
else
    # Warm simulator on CI image: configure offline, single boot.
    log "Warm simulator — applying autofill offline, then single boot"
    shutdown_if_booted
    configure_autofill_offline
    boot_and_wait
fi

seed_password_defaults
install_app
grant_notifications

if [ "${PREBOOT_SKIP_PREWARM:-}" != "1" ]; then
    if ! prewarm_app "$PREWARM_SECS"; then
        log "Retrying pre-warm with 25s window..."
        prewarm_app 25 || log "Pre-warm failed — first Detox launch may be slow"
    fi
else
    log "Skipping pre-warm (PREBOOT_SKIP_PREWARM=1)"
fi

open -a Simulator --args -CurrentDeviceUDID "$SIMULATOR_ID" || true
wait_ready_quick
verify_health

if [ -n "${GITHUB_ENV:-}" ]; then
    echo "SIMULATOR_ID=$SIMULATOR_ID" >> "$GITHUB_ENV"
fi

log "Done. SIMULATOR_ID=$SIMULATOR_ID"
