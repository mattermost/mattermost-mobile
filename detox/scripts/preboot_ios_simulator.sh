#!/bin/bash
# Pre-boot an iOS simulator for Detox/Maestro CI.
#
# Optimized vs the former inline Detox workflow script:
#   - One blocking bootstatus for sims that already have CoreSimulator dirs (typical CI).
#   - Autofill plists written while shutdown — no "init boot just to mkdir" on warm sims.
#   - Skips autofill re-configuration when already applied (marker + plist check).
#   - Drops the redundant 8–10s bootstatus poll after bootstatus already completed.
#   - Brand-new simulators (simctl create) still use boot → shutdown → configure → boot.
#
# Requires: DEVICE_NAME, DEVICE_OS_VERSION. Writes SIMULATOR_ID to GITHUB_ENV when set.
# Optional:
#   PREBOOT_COUNT=N            — boot N simulators of the same type (default 1). Use 2 with
#                                DETOX_MAX_WORKERS=2 so Jest can run specs in parallel.
#   PREBOOT_SKIP_PREWARM=1     — Maestro only (uses listapps readiness). Detox must pre-warm.
#   PREBOOT_PREWARM_SECS       — first pre-warm wait (default 15; iPad often needs 10–15s).
#
# Grants notifications only. Maestro's Calls flows need mic/camera and grant them
# themselves per batch (detox/maestro/scripts/run_ci_batches.sh
# grant_ios_calls_permissions), so this script does not — see grant_notifications
# for why extra privacy grants are avoided here.

set -euo pipefail

readonly BUNDLE_ID="com.mattermost.rnbeta"
# v2: also writes Library/UserConfigurationProfiles mirrors + WebUI AutoFillPasswords
# (v1 only touched ConfigurationProfiles/UserSettings and missed the Effective mirrors
# Settings.app updates — iOS 18+/26 still showed Passwords.app "Save Password?").
readonly AUTOFILL_MARKER="mattermost-ci-autofill-v2"
readonly PREWARM_SECS="${PREBOOT_PREWARM_SECS:-15}"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log() {
    echo "[preboot $(date +%H:%M:%S)] $*"
}

sim_state() {
    xcrun simctl list devices 2>/dev/null | grep "$SIMULATOR_ID" | sed -E 's/.*\((Booted|Shutdown|Booting|Creating)\)$/\1/' || echo "Unknown"
}

shutdown_if_booted() {
    if [ "$(sim_state)" = "Booted" ] || [ "$(sim_state)" = "Booting" ]; then
        log "Shutting down simulator to edit autofill plists..."
        xcrun simctl shutdown "$SIMULATOR_ID" || true
        # Autofill plist writes fail verification if the sim is still Booted
        # (seen as "Critical allowPasswordAutoFill=NO not verified").
        for _ in $(seq 60); do
            [ "$(sim_state)" = "Shutdown" ] && return 0
            sleep 0.5
        done
        log "Warning: simulator may not have reached Shutdown state (state=$(sim_state))"
    fi
}

boot_and_wait() {
    log "Booting simulator $SIMULATOR_ID..."
    xcrun simctl boot "$SIMULATOR_ID" 2>/dev/null || true
    log "Waiting for boot to complete (blocking bootstatus)..."
    xcrun simctl bootstatus "$SIMULATOR_ID"
}

library_effective_plist() {
    echo "$HOME/Library/Developer/CoreSimulator/Devices/$SIMULATOR_ID/data/Library/UserConfigurationProfiles/EffectiveUserSettings.plist"
}

library_public_effective_plist() {
    echo "$HOME/Library/Developer/CoreSimulator/Devices/$SIMULATOR_ID/data/Library/UserConfigurationProfiles/PublicInfo/PublicEffectiveUserSettings.plist"
}

autofill_key_is_false() {
    local plist="$1"
    [ -f "$plist" ] || return 1
    plutil -extract restrictedBool.allowPasswordAutoFill.value raw "$plist" 2>/dev/null | grep -qi 'false'
}

autofill_already_configured() {
    [ -f "$AUTOFILL_STAMP" ] || return 1
    autofill_key_is_false "$SETTINGS_PLIST" || return 1
    autofill_key_is_false "$(library_effective_plist)" || return 1
    autofill_key_is_false "$(library_public_effective_plist)" || return 1
}

configure_autofill_offline() {
    log "Disabling password AutoFill / Save Password (simulator shut down)..."
    # Must be fully Shutdown — disable_ios_autofill.js exits 1 if it observes Booted.
    if [ "$(sim_state)" != "Shutdown" ]; then
        shutdown_if_booted
    fi
    if [ "$(sim_state)" != "Shutdown" ]; then
        echo "Simulator $SIMULATOR_ID not Shutdown before autofill configure (state=$(sim_state))"
        exit 1
    fi
    mkdir -p "$SETTINGS_DIR"
    mkdir -p "$HOME/Library/Developer/CoreSimulator/Devices/$SIMULATOR_ID/data/Library/UserConfigurationProfiles/PublicInfo"
    local attempt
    for attempt in 1 2; do
        if (cd "$REPO_ROOT/detox" && node utils/disable_ios_autofill.js --simulator-id "$SIMULATOR_ID"); then
            touch "$AUTOFILL_STAMP"
            return 0
        fi
        log "Autofill configure attempt ${attempt} failed — forcing shutdown and retrying"
        shutdown_if_booted
        sleep 2
    done
    echo "Failed to disable password autofill / Save Password restrictions"
    exit 1
}

seed_password_defaults() {
    log "Seeding Passwords.app / WebUI defaults on booted simulator..."
    if ! (cd "$REPO_ROOT/detox" && node utils/disable_ios_autofill.js --simulator-id "$SIMULATOR_ID" --seed-defaults); then
        log "Warning: defaults seed reported failure (continuing; plists are source of truth)"
    fi
}

# iOS sometimes regenerates EffectiveUserSettings after first boot and flips
# allowPasswordAutoFill back to YES. Re-apply while shut down, then boot again.
enforce_autofill_after_boot() {
    log "Verifying AutoFill restrictions survived boot..."
    if autofill_already_configured; then
        log "Restrictions still in place after boot"
        seed_password_defaults
        return 0
    fi

    log "Restrictions missing/reverted after boot — re-applying offline + reboot"
    shutdown_if_booted
    configure_autofill_offline
    boot_and_wait
    seed_password_defaults

    if ! autofill_already_configured; then
        echo "::error::Failed to keep allowPasswordAutoFill=NO after reboot — Save Password? will block Detox"
        exit 1
    fi
    log "Restrictions verified after re-apply"
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
    # Match proven Detox CI: notifications only. Deny camera/photos corrupts TCC on iOS 26.x;
    # keep grants minimal so a failed privacy call does not cascade into broken UI hit-testing.
    log "Pre-granting notification permission..."
    if ! xcrun simctl privacy "$SIMULATOR_ID" grant notifications "$BUNDLE_ID"; then
        log "Warning: notification grant failed (continuing; Detox may re-request at launch)"
    fi
}

kill_app_via_launchd() {
    local app_pid
    app_pid=$(xcrun simctl spawn "$SIMULATOR_ID" launchctl list 2>/dev/null | \
        grep "$BUNDLE_ID" | awk '{print $1}' | grep -E '^[0-9]+$' || true)
    if [ -z "$app_pid" ]; then
        return 0
    fi
    xcrun simctl spawn "$SIMULATOR_ID" kill -9 "$app_pid" 2>/dev/null || true
    # launchd teardown is asynchronous — poll until the bundle leaves the job list
    # so a timeout is not reported as a successful kill.
    for _ in $(seq 12); do
        if ! xcrun simctl spawn "$SIMULATOR_ID" launchctl list 2>/dev/null | grep -q "$BUNDLE_ID"; then
            log "Killed app via launchd (PID $app_pid)"
            return 0
        fi
        sleep 0.25
    done
    log "Warning: app still listed in launchd 3s after kill -9 (PID $app_pid)"
    return 1
}

prewarm_app() {
    local sleep_time="${1:-$PREWARM_SECS}"
    log "Pre-warming app (${sleep_time}s launch window)..."
    xcrun simctl launch "$SIMULATOR_ID" "$BUNDLE_ID" 2>/dev/null &
    local launch_pid=$!
    sleep "$sleep_time"
    kill "$launch_pid" 2>/dev/null || true
    wait "$launch_pid" 2>/dev/null || true
    if ! kill_app_via_launchd; then
        log "Pre-warm cleanup did not complete — treating pre-warm as failed"
        return 1
    fi
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
    local instance="${1:-1}"
    unset SIMULATOR_NEEDS_INIT_BOOT

    # Instance 1 may reuse a warm CI image simulator; additional instances always create.
    if [ "$instance" -eq 1 ]; then
        log "Looking for simulator: $device_name ($os_version)"
        SIMULATOR_ID=$(xcrun simctl list devices | grep "$device_name" | grep "$os_version" | head -1 | grep -oE '([0-9A-F-]{36})' || true)
        if [ -z "$SIMULATOR_ID" ]; then
            SIMULATOR_ID=$(xcrun simctl list devices "$os_version" 2>/dev/null | grep "$device_name" | head -1 | grep -oE '([0-9A-F-]{36})' || true)
        fi

        if [ -n "$SIMULATOR_ID" ]; then
            log "Found existing simulator: $SIMULATOR_ID"
            return 0
        fi
    fi

    log "Creating simulator (instance $instance)..."
    local device_type runtime sim_name
    device_type=$(xcrun simctl list devicetypes | grep "${device_name} (" | head -1 | awk -F'[()]' '{print $(NF-1)}')
    runtime=$(xcrun simctl list runtimes | grep "$os_version" | head -1 | sed 's/.* - \(.*\)/\1/')
    if [ -z "$device_type" ] || [ -z "$runtime" ]; then
        echo "Could not resolve device type or runtime for $device_name / $os_version"
        exit 1
    fi
    sim_name="CI-${device_name}"
    if [ "$instance" -gt 1 ]; then
        sim_name="CI-${device_name}-${instance}"
    fi
    SIMULATOR_ID=$(xcrun simctl create "$sim_name" "$device_type" "$runtime")
    log "Created simulator: $SIMULATOR_ID ($sim_name)"
    export SIMULATOR_NEEDS_INIT_BOOT=1
}

prepare_and_boot_simulator() {
    SETTINGS_DIR="$HOME/Library/Developer/CoreSimulator/Devices/$SIMULATOR_ID/data/Containers/Shared/SystemGroup/systemgroup.com.apple.configurationprofiles/Library/ConfigurationProfiles"
    SETTINGS_PLIST="$SETTINGS_DIR/UserSettings.plist"
    AUTOFILL_STAMP="$SETTINGS_DIR/.$AUTOFILL_MARKER"

    if autofill_already_configured; then
        log "Autofill restrictions already configured (v2) — skipping offline plist edit"
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

    # Always verify (and re-apply if iOS reverted EffectiveUserSettings on boot).
    enforce_autofill_after_boot
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
}

# ─── Main ────────────────────────────────────────────────────────────────────

PREBOOT_COUNT="${PREBOOT_COUNT:-1}"
if ! [[ "$PREBOOT_COUNT" =~ ^[1-9][0-9]*$ ]]; then
    echo "PREBOOT_COUNT must be a positive integer, got: $PREBOOT_COUNT"
    exit 1
fi

BOOTED_IDS=()
for ((instance = 1; instance <= PREBOOT_COUNT; instance++)); do
    log "=== Pre-boot instance ${instance}/${PREBOOT_COUNT} ==="
    find_or_create_simulator "$instance"
    prepare_and_boot_simulator
    BOOTED_IDS+=("$SIMULATOR_ID")
done

# First UDID kept as SIMULATOR_ID for single-worker / Maestro compatibility.
SIMULATOR_ID="${BOOTED_IDS[0]}"
SIMULATOR_IDS=$(IFS=,; echo "${BOOTED_IDS[*]}")

if [ -n "${GITHUB_ENV:-}" ]; then
    echo "SIMULATOR_ID=$SIMULATOR_ID" >> "$GITHUB_ENV"
    echo "SIMULATOR_IDS=$SIMULATOR_IDS" >> "$GITHUB_ENV"
fi

log "Done. SIMULATOR_ID=$SIMULATOR_ID SIMULATOR_IDS=$SIMULATOR_IDS"
