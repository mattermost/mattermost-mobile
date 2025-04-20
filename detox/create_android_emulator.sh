#!/bin/bash
# Cross-platform emulator setup + Detox runner for CI and local

# Add this to your script's header comments
# Usage: 
#   ./create_android_emulator.sh [SDK_VERSION] [AVD_BASE_NAME] [TEST_FILES]
# Options:
#   --headed  Run emulator with GUI (local development only)

if [[ "$DEBUG" == "true" ]]; then
    set -ex
    set -o pipefail
else
    set -e
fi

# ----------- Params --------------

SDK_VERSION=${1:-34}
AVD_BASE_NAME=${2:-"detox_pixel_4_xl"}
AVD_NAME="${AVD_BASE_NAME}_api_${SDK_VERSION}"
TEST_FILES=${@:3}

if [[ "$CI" != "true" && "$*" == *"--headed"* ]]; then
    HEADLESS=false
fi

# ----------- Utility --------------

log() { echo -e "\033[1;36m👉 $1\033[0m"; }

# ----------- Environment Setup --------------

setup_avd_home() {
    if [[ "$CI" == "true" ]]; then
        export ANDROID_AVD_HOME=$(pwd)/.android/avd
        mkdir -p "$ANDROID_AVD_HOME"
    fi
}

ensure_sdk_image() {
    local cpu_arch=$1
    local image="system-images;android-${SDK_VERSION};google_apis;${cpu_arch}"

    if ! "$ANDROID_HOME"/cmdline-tools/latest/bin/sdkmanager --list | grep -q "$image"; then
        log "Installing system image: $image"
        yes | "$ANDROID_HOME"/cmdline-tools/latest/bin/sdkmanager "$image"
    fi
}

get_cpu_architecture() {
    if [[ $(uname -m) == 'arm64' ]]; then
        echo "arm64-v8a arm64"
    else
        echo "x86_64 x86_64"
    fi
}

# ----------- AVD Creation --------------

create_avd() {
    local cpu_arch_family cpu_arch
    read cpu_arch_family cpu_arch < <(get_cpu_architecture)

    ensure_sdk_image "$cpu_arch_family"

    log "Creating AVD: $AVD_NAME"
    "$ANDROID_HOME"/cmdline-tools/latest/bin/avdmanager create avd \
        -n "$AVD_NAME" \
        -k "system-images;android-${SDK_VERSION};google_apis;${cpu_arch_family}" \
        -d "pixel" -f

    cp -r android_emulator/ "$AVD_NAME/"
    sed -i.bak -e "s|AvdId = change_avd_id|AvdId = ${AVD_NAME}|g" "$AVD_NAME/config.ini"
    sed -i -e "s|avd.ini.displayname = change_avd_displayname|avd.ini.displayname = Detox Pixel 4 XL API ${SDK_VERSION}|g" "$AVD_NAME/config.ini"
    sed -i -e "s|abi.type = change_type|abi.type = ${cpu_arch_family}|g" "$AVD_NAME/config.ini"
    sed -i -e "s|hw.cpu.arch = change_cpu_arch|hw.cpu.arch = ${cpu_arch}|g" "$AVD_NAME/config.ini"
    sed -i -e "s|image.sysdir.1 = change_to_image_sysdir/|image.sysdir.1 = system-images/android-${SDK_VERSION}/google_apis/${cpu_arch_family}/|g" "$AVD_NAME/config.ini"
    sed -i -e "s|skin.path = change_to_absolute_path/pixel_4_xl_skin|skin.path = $(pwd)/${AVD_NAME}/pixel_4_xl_skin|g" "$AVD_NAME/config.ini"
    echo "hw.cpu.ncore=4" >> "$AVD_NAME/config.ini"

    log "AVD created successfully"
}

# ----------- Emulator Control --------------

start_emulator() {
    log "Starting emulator..."
    local emulator_opts="-avd $AVD_NAME -no-boot-anim -no-audio -no-snapshot -no-window -read-only"
    local grpc_port="8554"

    # Clear previous log
    rm -f .emulator_port.log
    
    if [[ "$HEADLESS" == "true" ]]; then
        emulator_opts="$emulator_opts -no-window"
        log "Running in headless mode"
    else
        log "Running in headed mode (GUI visible)"
    fi

    if [[ "$CI" == "true" || "$(uname -s)" == "Linux" ]]; then
        emulator $emulator_opts -gpu swiftshader_indirect -accel on -grpc $grpc_port > .emulator_port.log 2>&1 &
    else
        emulator $emulator_opts -gpu host -grpc $grpc_port > .emulator_port.log 2>&1 &
    fi

    EMULATOR_PID=$!
    echo $EMULATOR_PID > .emulator_pid
    log "Emulator started with PID: $EMULATOR_PID"
    log "Waiting for port assignment..."
    
    # Wait for port to be assigned
    local max_wait=30 elapsed=0
    while ! grep -q "control console listening on port" .emulator_port.log && [ $elapsed -lt $max_wait ]; do
        sleep 1
        ((elapsed++))
    done
}

kill_existing_emulators() {
    log "Checking for existing emulators..."
    # Kill all running emulators
    pgrep -f "emulator.*-avd" | xargs kill -9 >/dev/null 2>&1 || true
    # Clear any existing ADB connections
    adb kill-server >/dev/null 2>&1
    adb start-server >/dev/null 2>&1
}

wait_for_emulator() {
    log "Waiting for emulator to boot..."
    
    # Get the specific emulator port from our log
    local emulator_port=$(grep -Eo "emulator:.*port \K\d+" .emulator_port.log | head -1)
    local emulator_serial="emulator-${emulator_port:-5554}"
    
    # Use specific serial for all adb commands
    local adb_cmd="adb -s $emulator_serial"
    
    # Wait for our specific emulator
    $adb_cmd wait-for-device

    boot_completed=""
    retries=0
    until [[ "$boot_completed" == "1" || $retries -gt 20 ]]; do
        boot_completed=$($adb_cmd shell getprop sys.boot_completed | tr -d '\r')
        sleep 5
        ((retries++))
        echo " ⏳ still waiting ($retries)..."
    done

    if [[ "$boot_completed" != "1" ]]; then
        echo "❌ Emulator failed to boot."
        exit 1
    fi

    # Get emulator information
    local sdk_version=$($adb_cmd shell getprop ro.build.version.sdk)
    local device_model=$($adb_cmd shell getprop ro.product.model)
    local grpc_port="8554"

    # Print detailed information
    echo -e "\n\033[1;35mEmulator Information:\033[0m"
    echo -e "AVD Name: \033[1;33m$AVD_NAME\033[0m"
    echo -e "Serial: \033[1;33m$emulator_serial\033[0m"
    echo -e "Android API: \033[1;33m$sdk_version\033[0m"
    echo -e "Device Model: \033[1;33m$device_model\033[0m"
    echo -e "gRPC Port: \033[1;33m$grpc_port\033[0m"
    echo -e "PID: \033[1;33m$EMULATOR_PID\033[0m"
    echo -e "\n\033[1;35mManagement Commands:\033[0m"
    echo -e "Stop emulator: \033[1;32madb -s $emulator_serial emu kill\033[0m"
    echo -e "Restart emulator: \033[1;32memulator -avd $AVD_NAME -grpc $grpc_port\033[0m"
    echo -e "View logs: \033[1;32mtail -f .emulator_port.log\033[0m"
    echo -e "Kill by PID: \033[1;32mkill $EMULATOR_PID\033[0m"
    echo -e "ADB commands: \033[1;32madb -s $emulator_serial <command>\033[0m"

    log "✅ Emulator is ready -> $AVD_NAME (Serial: $emulator_serial)"
}

cleanup() {
    if [[ -f ".emulator_pid" ]]; then
        local pid=$(cat .emulator_pid)
        if ps -p $pid > /dev/null; then
            log "Stopping emulator (PID: $pid)..."
            kill $pid
            rm .emulator_pid
        fi
    fi
    rm -f .emulator_port.log
}

# Trap Ctrl+C to ensure cleanup
trap cleanup EXIT

update_detox_config() {
    local config_file=".detoxrc.json"
    
    if [ -f "$config_file" ]; then
        # Use jq to ONLY update the avdName while preserving all other structure
        jq --arg avdName "$AVD_NAME" \
           '.devices["android.emulator"].device.avdName = $avdName' \
           "$config_file" > "${config_file}.tmp" && \
        mv "${config_file}.tmp" "$config_file"
        
        log "Updated detoxrc.json AVD name to: $AVD_NAME"
    else
        log "Warning: detoxrc.json not found in current directory"
    fi
}

# ----------- App + Server Setup --------------

install_app() {
    log "Installing app..."
    adb install -r ../android/app/build/outputs/apk/debug/app-debug.apk || true
    adb shell pm list packages | grep "com.mattermost.rnbeta" && log "App is installed."
}

start_server() {
    log "Starting Metro bundler..."
    cd ..
    RUNNING_E2E=true npm run start &
    
    local max_wait=120 elapsed=0
    until nc -z localhost 8081; do
        [[ $elapsed -ge $max_wait ]] && echo "❌ Metro bundler did not start." && exit 1
        sleep 5
        ((elapsed+=5))
    done
    log "✅ Metro bundler is ready"
}

setup_adb_reverse() {
    log "Setting up ADB reverse..."
    adb reverse tcp:8081 tcp:8081 || true
}

run_detox_tests() {
    log "Running Detox tests: $@"
    cd detox
    npm run e2e:android-test -- "$@"
}

# ----------- Main Logic --------------

main() {
    kill_existing_emulators  # Add this line first
    setup_avd_home

    if ! emulator -list-avds | grep -q "$AVD_NAME"; then
        create_avd
    else
        log "AVD '$AVD_NAME' already exists."
    fi

    update_detox_config
    start_emulator
    wait_for_emulator

    if [[ "$CI" == "true" ]]; then
        install_app
        start_server
        setup_adb_reverse
        run_detox_tests $TEST_FILES
    else
        log "Emulator is running in interactive mode. Press Ctrl+C to stop."
        wait $EMULATOR_PID
    fi
}

main
