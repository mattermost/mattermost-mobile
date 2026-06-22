#!/bin/bash
# Reference: https://wix.github.io/Detox/docs/guide/android-dev-env

set -ex
set -o pipefail

SDK_VERSION=${1:-35}           # First argument is SDK version
AVD_BASE_NAME=${2:-"detox_pixel_8"}  # Second argument is AVD base name (no api suffix — added below)
AVD_NAME="${AVD_BASE_NAME}_api_${SDK_VERSION}"
TEST_FILES=("${@:3}")          # Capture all remaining arguments as Detox test files
EMULATOR_RAM_MB=${MM_ANDROID_EMULATOR_RAM_MB:-3072}

setup_avd_home() {
    if [[ "$CI" == "true" ]]; then
        export ANDROID_AVD_HOME=$(pwd)/.android/avd
        mkdir -p "$ANDROID_AVD_HOME"
    fi
}

get_cpu_architecture() {
    if [[ $(uname -p) == 'arm' ]]; then
        echo "arm64-v8a arm64"
    else
        echo "x86_64 x86_64"
    fi
}

create_avd() {
    local cpu_arch_family cpu_arch
    read cpu_arch_family cpu_arch < <(get_cpu_architecture)

    avdmanager create avd -n "$AVD_NAME" -k "system-images;android-${SDK_VERSION};google_apis;${cpu_arch_family}" -p "$AVD_NAME" -d 'pixel_4_xl'

    cp -r android_emulator/ "$AVD_NAME/"
    sed -i -e "s|AvdId = change_avd_id|AvdId = ${AVD_NAME}|g" "$AVD_NAME/config.ini"
    sed -i -e "s|avd.ini.displayname = change_avd_displayname|avd.ini.displayname = Detox Pixel 8 API ${SDK_VERSION}|g" "$AVD_NAME/config.ini"
    sed -i -e "s|abi.type = change_type|abi.type = ${cpu_arch_family}|g" "$AVD_NAME/config.ini"
    sed -i -e "s|hw.cpu.arch = change_cpu_arch|hw.cpu.arch = ${cpu_arch}|g" "$AVD_NAME/config.ini"
    sed -i -e "s|image.sysdir.1 = change_to_image_sysdir/|image.sysdir.1 = system-images/android-${SDK_VERSION}/google_apis/${cpu_arch_family}/|g" "$AVD_NAME/config.ini"
    sed -i -e "s|hw.ramSize = .*|hw.ramSize = ${EMULATOR_RAM_MB}|g" "$AVD_NAME/config.ini"

    echo "Android virtual device successfully created: ${AVD_NAME}"
}

update_existing_avd_memory() {
    local config_path="${AVD_NAME}/config.ini"
    if [[ -f "$config_path" ]]; then
        sed -i -e "s|hw.ramSize = .*|hw.ramSize = ${EMULATOR_RAM_MB}|g" "$config_path"
    fi
}

prepare_avd_for_boot() {
    # Cached AVDs may include snapshot/userdata state that causes
    # "snapshot operation is pending and timeout has expired" on boot.
    rm -rf "${AVD_NAME}/snapshots" 2>/dev/null || true
    rm -f "${AVD_NAME}"/userdata*.img* "${AVD_NAME}"/cache.img* 2>/dev/null || true

    if [[ "$CI" == "true" ]]; then
        # Restored AVD caches can retain lock files from a crashed prior boot, which
        # makes the emulator exit with "Running multiple emulators with the same AVD".
        rm -f "${AVD_NAME}"/*.lock "${AVD_NAME}"/multiinstance.lock 2>/dev/null || true
        # grep exits 1 when no emulators are listed; pipefail would abort bootstrap.
        while read -r serial; do
            [[ -z "$serial" ]] && continue
            adb -s "$serial" emu kill 2>/dev/null || true
        done < <( (adb devices 2>/dev/null | grep -E '^emulator-' | cut -f1) || true)
        sleep 2
    fi
}

start_adb_server() {
    echo "Restarting ADB server..."
    adb kill-server
    adb start-server
}

start_emulator() {
    echo "Starting the emulator..."
    local emulator_opts="-avd $AVD_NAME -no-snapshot -no-snapshot-load -no-snapshot-save -no-boot-anim -no-audio -gpu off -no-window"

    if [[ "$CI" == "true" || "$(uname -s)" == "Linux" ]]; then
        emulator $emulator_opts -gpu swiftshader_indirect -accel on -qemu -m "$EMULATOR_RAM_MB" &
    else
        emulator $emulator_opts -gpu guest -verbose -qemu -vnc :0
    fi
}

emulator_process_running() {
    pgrep -f "emulator.*${AVD_NAME}" >/dev/null 2>&1 || pgrep -f 'qemu-system-x86_64' >/dev/null 2>&1
}

wait_for_emulator() {
    if [[ "$CI" != "true" ]]; then return; fi

    echo "Waiting for emulator to boot..."
    local device_timeout=120
    local device_elapsed=0
    until adb devices | grep -qE '^emulator-[0-9]+\s+device'; do
        if [[ $device_elapsed -ge $device_timeout ]]; then
            echo "Emulator device did not appear within ${device_timeout}s"
            adb devices -l || true
            exit 1
        fi
        if ! emulator_process_running; then
            echo "Emulator process exited before device appeared (check snapshot/cache state)"
            exit 1
        fi
        sleep 5
        device_elapsed=$((device_elapsed + 5))
    done

    local boot_timeout=300  # 5 minutes max
    local boot_elapsed=0
    until [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; do
        if [[ $boot_elapsed -ge $boot_timeout ]]; then
            echo "Emulator failed to boot within 5 minutes"
            exit 1
        fi
        if ! emulator_process_running; then
            echo "Emulator process exited during boot"
            exit 1
        fi
        echo "Waiting for emulator to fully boot..."
        sleep 10
        boot_elapsed=$((boot_elapsed + 10))
    done
    echo "Emulator is fully booted."

    # API 35 emulators take longer to stabilize the instrumentation layer after
    # sys.boot_completed — 15s was insufficient, causing the first Detox app
    # launch to fail with "No activities in stage RESUMED".
    sleep 30
    adb shell pm list packages > /dev/null 2>&1
    echo "Emulator is fully ready."
}

resolve_app_apk() {
    if [[ "${MAESTRO_ANDROID:-}" == "true" ]]; then
        local release_apk="../android/app/build/outputs/apk/release/app-release.apk"
        if [[ -f "$release_apk" ]]; then
            echo "$release_apk"
            return 0
        fi
        echo "Maestro release APK not found at $release_apk" >&2
        ls -la ../android/app/build/outputs/apk/release/ 2>/dev/null || true
        exit 1
    fi
    echo "../android/app/build/outputs/apk/debug/app-debug.apk"
}

install_app() {
    local app_apk
    app_apk=$(resolve_app_apk)
    echo "Installing the app from $app_apk..."
    adb install -r "$app_apk"
    if [[ "${MAESTRO_ANDROID:-}" != "true" && "${BOOTSTRAP_ONLY:-}" != "true" ]]; then
        # Install the test/instrumentation APK — required by Detox (reinstallApp: false assumes
        # both the main APK and the test APK are already present on the device).
        adb install -r ../android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
    fi
    adb shell pm list packages | grep "com.mattermost.rnbeta" && echo "App is installed." || echo "App is not installed."
}

grant_android_runtime_permissions() {
    local bundle_id="com.mattermost.rnbeta"
    adb shell pm grant "$bundle_id" android.permission.POST_NOTIFICATIONS 2>/dev/null || true
    adb shell settings put secure show_ime_with_hard_keyboard 0 2>/dev/null || true
    adb shell settings put secure spell_checker_enabled 0 2>/dev/null || true
    adb shell settings put secure auto_text_enabled 0 2>/dev/null || true
}

configure_emulator_for_tests() {
    adb shell settings put global window_animation_scale 0
    adb shell settings put global transition_animation_scale 0
    adb shell settings put global animator_duration_scale 0
    adb shell input keyevent 82 2>/dev/null || true
    adb root 2>/dev/null || true
    adb shell setprop persist.sys.timezone "America/New_York" 2>/dev/null || true
    adb shell setprop sys.timezone "America/New_York" 2>/dev/null || true
    adb shell am broadcast -a android.intent.action.TIMEZONE_CHANGED \
        --ez bypassUserRestrictions true 2>/dev/null || true
    configure_chrome_for_ci
}

configure_chrome_for_ci() {
    adb shell 'mkdir -p /data/local/tmp' 2>/dev/null || true
    adb shell 'echo "chrome --disable-fre --no-first-run --no-default-browser-check" > /data/local/tmp/chrome-command-line' 2>/dev/null || true
    adb shell am start -n com.android.chrome/com.google.android.apps.chrome.Main 2>/dev/null || true
    sleep 3
    adb shell input keyevent 4 2>/dev/null || true
}

push_e2e_fixtures() {
    local fixture="../detox/e2e/support/fixtures/image.png"
    if [[ -f "$fixture" ]]; then
        adb push "$fixture" /sdcard/Download/test_bookmark.png
        echo "Pushed test fixture to /sdcard/Download/test_bookmark.png"
        adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
            -d file:///sdcard/Download/test_bookmark.png 2>/dev/null || true
    fi
}

start_server() {
    echo "Starting the server..."
    cd ..
    RUNNING_E2E=true npm run start &
    local timeout=120 interval=5 elapsed=0

    until nc -z localhost 8081; do
        if [[ $elapsed -ge $timeout ]]; then
            echo "Server did not start within 3 minutes."
            exit 1
        fi
        echo "Waiting for server to be ready..."
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    echo "Server is ready."
}

setup_adb_reverse() {
    echo "Setting up ADB reverse port forwarding..."
    # adb root (in configure_emulator_for_tests) restarts adbd and drops prior reverse mappings.
    adb reverse --remove-all 2>/dev/null || true
    adb reverse tcp:8081 tcp:8081
    if ! adb reverse --list | grep -q 'tcp:8081'; then
        echo "ERROR: adb reverse tcp:8081 is not active after setup"
        adb reverse --list || true
        exit 1
    fi
    echo "adb reverse verified: $(adb reverse --list)"
}

run_detox_tests() {
    echo "Running Detox tests... $@"

    cd detox
    AVD_NAME="$AVD_NAME" npm run detox:config-gen
    npm run e2e:android-test -- "$@"
}

main() {
    setup_avd_home

    if ! emulator -list-avds | grep -q "$AVD_NAME"; then
        create_avd
    else
        echo "'${AVD_NAME}' Android virtual device already exists."
        update_existing_avd_memory
    fi

    prepare_avd_for_boot
    start_adb_server
    start_emulator
    wait_for_emulator

    if [[ "$CI" == "true" ]]; then
        install_app
        # Maestro uses a release APK with an embedded bundle (mirrors iOS simulator builds).
        if [[ "${MAESTRO_ANDROID:-}" != "true" ]]; then
            start_server
        fi
        grant_android_runtime_permissions
        configure_emulator_for_tests
        if [[ "${MAESTRO_ANDROID:-}" != "true" ]]; then
            setup_adb_reverse
        fi
        push_e2e_fixtures
    fi

    if [[ "${BOOTSTRAP_ONLY:-}" == "true" ]]; then
        echo "Bootstrap complete (BOOTSTRAP_ONLY=true) — skipping Detox tests"
        exit 0
    fi

    run_detox_tests "${TEST_FILES[@]}"
}

main
