#!/bin/bash
# Cross-platform emulator setup + Detox runner for CI and local

# Usage: 
#   ./avd_creation.sh [SDK_VERSION] [AVD_BASE_NAME] [TEST_FILES]
# Options:
#   --headed  Run emulator with GUI (local development only)
#   --debug  Run emulator with debug mode (local development only)

# Enable Debug mode
DEBUG=false
# Override for local development if --debug flag is present
if [[ "$CI" != "true" && "$*" == *"--debug"* ]]; then
    DEBUG=true
fi

if [[ "$DEBUG" == "true" ]]; then
    set -ex
    set -o pipefail
else
    set -e
fi

# ----------- Params --------------

SDK_VERSION=${1:-34}
AVD_BASE_NAME=${2:-"detox_pixel_4_xl_api_34"}
AVD_NAME="${AVD_BASE_NAME}_api_${SDK_VERSION}"
TEST_FILES=${@:3}

# Default to headless mode
HEADLESS=true
# Override for local development if --headed flag is present
if [[ "$CI" != "true" && "$*" == *"--headed"* ]]; then
    HEADLESS=false
fi

# ----------- Utility --------------

log() { echo -e "\033[1;36m👉 $1\033[0m"; }
error() { echo -e "\033[1;31m❌ $1\033[0m"; }
success() { echo -e "\033[1;32m✅ $1\033[0m"; }

# ----------- Environment Setup --------------

setup_avd_home() {
    if [[ "$CI" == "true" ]]; then
        export ANDROID_AVD_HOME=$(pwd)/.android/avd
        mkdir -p "$ANDROID_AVD_HOME"
    fi

    # Always ensure the .android/avd directory exists in the home directory
    # This fixes the error on Linux runners
    mkdir -p "$HOME/.android/avd"
}

ensure_sdk_image() {
    local cpu_arch=$1
    local image="system-images;android-${SDK_VERSION};google_apis;${cpu_arch}"

    # Verify sdkmanager exists
    if [ ! -f "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
        error "sdkmanager not found. Please ensure Android SDK is properly installed."
        exit 1
    fi

    log "Checking for system image: $image"
    if ! "$ANDROID_HOME"/cmdline-tools/latest/bin/sdkmanager --list | grep -q "$image"; then
        log "Installing system image: $image"
        yes | "$ANDROID_HOME"/cmdline-tools/latest/bin/sdkmanager --install "$image"
    else
        log "System image already installed: $image"
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

    # Make sure avdmanager exists
    if [ ! -f "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" ]; then
        error "avdmanager not found. Please ensure Android SDK is properly installed."
        exit 1
    fi

    # Delete the AVD if it already exists to ensure clean creation
    "$ANDROID_HOME"/cmdline-tools/latest/bin/avdmanager delete avd -n "$AVD_NAME" 2>/dev/null || true

    # Ensure the directory structure exists to avoid null path errors
    mkdir -p "$(pwd)/.android/avd/${AVD_NAME}.avd"

    # Create the AVD and log output for debugging
    local avd_log_file=".avd_creation.log"
    if ! "$ANDROID_HOME"/cmdline-tools/latest/bin/avdmanager create avd -n "$AVD_NAME" -k "system-images;android-${SDK_VERSION};google_apis;${cpu_arch_family}" -p "$(pwd)/.android/avd/${AVD_NAME}.avd" -d 'pixel_5' --force > "$avd_log_file" 2>&1; then
        error "Failed to create AVD. Check the log file for details: $avd_log_file"
        cat "$avd_log_file"

        # Retry with a default hardware profile
        log "Retrying AVD creation with default hardware profile..."
        if ! "$ANDROID_HOME"/cmdline-tools/latest/bin/avdmanager create avd -n "$AVD_NAME" -k "system-images;android-${SDK_VERSION};google_apis;${cpu_arch_family}" -p "$(pwd)/.android/avd/${AVD_NAME}.avd" -d 'pixel_5' --force > "$avd_log_file" 2>&1; then
            error "Retry failed. Please check the log file for details: $avd_log_file"
            exit 1
        fi
    fi

    # Ensure the .ini file exists in the appropriate directory
    INI_PATH="$HOME/.android/avd/${AVD_NAME}.ini"
    if [ ! -f "$INI_PATH" ]; then
        log "Creating .ini file for AVD: $AVD_NAME"
        # Make sure parent directory exists
        mkdir -p "$HOME/.android/avd"
        echo "avd.ini.encoding=UTF-8" > "$INI_PATH"
        echo "path=$(pwd)/.android/avd/${AVD_NAME}.avd" >> "$INI_PATH"
        echo "path.rel=avd/${AVD_NAME}.avd" >> "$INI_PATH"

        # Set proper permissions for the .ini file
        chmod 644 "$INI_PATH"
    fi

    # Ensure config.ini exists
    CONFIG_PATH="$(pwd)/.android/avd/${AVD_NAME}.avd/config.ini"
    if [ ! -f "$CONFIG_PATH" ]; then
        error "AVD config file not found at: $CONFIG_PATH"
        # Create minimal config if it doesn't exist
        mkdir -p "$(pwd)/.android/avd/${AVD_NAME}.avd"
        touch "$CONFIG_PATH"
    fi

    # Ensure android_emulator directory exists or skip this step
    if [ -d "android_emulator/" ]; then
        # Copy android_emulator directory if it exists
        mkdir -p "$AVD_NAME"
        cp -r android_emulator/ "$AVD_NAME/" || true
    else
        log "android_emulator directory not found, creating minimal AVD configuration"
        mkdir -p "$AVD_NAME/pixel_4_xl_skin"
        touch "$AVD_NAME/config.ini"
    fi

    # Update config.ini with required properties
    # First check if config.ini exists in the target directory
    if [ -f "$AVD_NAME/config.ini" ]; then
        sed -i -e "s|AvdId = change_avd_id|AvdId = ${AVD_NAME}|g" "$AVD_NAME/config.ini" || true
        sed -i -e "s|avd.ini.displayname = change_avd_displayname|avd.ini.displayname = Detox Pixel 4 XL API ${SDK_VERSION}|g" "$AVD_NAME/config.ini" || true
        sed -i -e "s|abi.type = change_type|abi.type = ${cpu_arch_family}|g" "$AVD_NAME/config.ini" || true
        sed -i -e "s|hw.cpu.arch = change_cpu_arch|hw.cpu.arch = ${cpu_arch}|g" "$AVD_NAME/config.ini" || true
        sed -i -e "s|image.sysdir.1 = change_to_image_sysdir/|image.sysdir.1 = system-images/android-${SDK_VERSION}/default/${cpu_arch_family}/|g" "$AVD_NAME/config.ini" || true
        sed -i -e "s|skin.path = change_to_absolute_path/pixel_4_xl_skin|skin.path = $(pwd)/${AVD_NAME}/pixel_4_xl_skin|g" "$AVD_NAME/config.ini" || true
    else
        # Create a new config.ini with required properties
        echo "AvdId=${AVD_NAME}" > "$AVD_NAME/config.ini"
        echo "avd.ini.displayname=Detox Pixel 4 XL API ${SDK_VERSION}" >> "$AVD_NAME/config.ini"
        echo "abi.type=${cpu_arch_family}" >> "$AVD_NAME/config.ini"
        echo "hw.cpu.arch=${cpu_arch}" >> "$AVD_NAME/config.ini"
        echo "image.sysdir.1=system-images/android-${SDK_VERSION}/default/${cpu_arch_family}/" >> "$AVD_NAME/config.ini"
        echo "skin.path=$(pwd)/${AVD_NAME}/pixel_4_xl_skin" >> "$AVD_NAME/config.ini"
    fi

    echo "hw.cpu.ncore=5" >> "$AVD_NAME/config.ini"
    
    # Copy the config to the AVD directory
    cp "$AVD_NAME/config.ini" "$(pwd)/.android/avd/${AVD_NAME}.avd/config.ini" || true

    echo "Android virtual device successfully created: ${AVD_NAME}"
    success "AVD created and configured successfully: $AVD_NAME"
}

# ----------- Emulator Control --------------

start_emulator() {
    log "Starting emulator..."

    # Common emulator options
    local emulator_opts="-avd $AVD_NAME -no-boot-anim -no-audio -gpu swiftshader_indirect"
    
    # Add headless mode if needed
    if [[ "$HEADLESS" == "true" ]]; then
        emulator_opts="$emulator_opts -no-window"
        log "Running in headless mode"
    else
        log "Running in headed mode (GUI visible)"
    fi

    # Add platform-specific optimizations
    case "$(uname -s)" in
        Darwin)
            # macOS specific settings
            emulator_opts="$emulator_opts -accel hvf"
            ;;
        Linux)
            # Linux specific settings
            if [[ -z "$DISPLAY" ]]; then
                # Set default display if not set
                export DISPLAY=:0
                log "DISPLAY not set, using default: $DISPLAY"
            else
                log "Using DISPLAY: $DISPLAY"
            fi
            emulator_opts="$emulator_opts -accel on"
            ;;
        *)
            log "Unknown OS, using default emulator acceleration"
            ;;
    esac

    # Clear previous log
    rm -f .emulator_port.log

    # Start the emulator
    local emulator_cmd="emulator"
    if ! command -v emulator &> /dev/null; then
        emulator_cmd="$ANDROID_HOME/emulator/emulator"
    fi

    log "Running emulator command: $emulator_cmd $emulator_opts"
    
    # Start the emulator and save its output
    $emulator_cmd $emulator_opts > .emulator_port.log 2>&1 &
    
    EMULATOR_PID=$!
    echo $EMULATOR_PID > .emulator_pid
    log "Emulator started with PID: $EMULATOR_PID"
    
    # Wait a moment to detect immediate failures
    sleep 5
    
    # Check if emulator process is still running
    if ! ps -p $EMULATOR_PID > /dev/null; then 
        # Check for specific error in log and adjust options
        if grep -q "Invalid '-accel hvf' parameter" .emulator_port.log; then
            log "Falling back to '-accel auto' due to invalid '-accel hvf' parameter"
            kill $EMULATOR_PID 2>/dev/null || true
            $emulator_cmd ${emulator_opts/-accel hvf/-accel auto} > .emulator_port.log 2>&1 &
            EMULATOR_PID=$!
            echo $EMULATOR_PID > .emulator_pid
            sleep 5
        fi

        # Check again if the emulator is running
        if ! ps -p $EMULATOR_PID > /dev/null; then
            error "Emulator process terminated immediately after launch!"
            error "Check .emulator_port.log for details:"
            cat .emulator_port.log
            return 1
        fi
    fi
    
    return 0
}

kill_existing_emulators() {
    log "Checking for existing emulators..."

    # Kill running emulators based on platform
    case "$(uname -s)" in
        Darwin)
            # macOS
            pgrep -f "emulator.*-avd" | xargs kill -9 2>/dev/null || true
            ;;
        Linux)
            # Linux
            pkill -f "emulator.*-avd" 2>/dev/null || true
            ;;
        *)
            log "Unknown OS, skipping emulator cleanup"
            ;;
    esac

    # Clear any existing ADB connections
    adb kill-server >/dev/null 2>&1 || true
    adb start-server >/dev/null 2>&1 || true
}

wait_for_emulator() {
    log "Waiting for emulator to boot..."
    
    # Wait for ADB device to appear
    local max_attempts=60
    local attempt=0
    local device_found=false

    while [ $attempt -lt $max_attempts ]; do
        if adb devices | grep -q "emulator"; then
            device_found=true
            break
        fi
        
        # Check if emulator process is still running
        if ! ps -p $EMULATOR_PID > /dev/null; then
            error "Emulator process terminated unexpectedly!"
            error "Check .emulator_port.log for details:"
            cat .emulator_port.log
            return 1
        fi
        
        sleep 2
        ((attempt++))
        log "Waiting for device to appear in adb devices... (Attempt $attempt/$max_attempts)"
    done

    if [ "$device_found" != "true" ]; then
        error "Emulator failed to start properly. Check .emulator_port.log for details."
        cat .emulator_port.log
        return 1
    fi

    # Get the emulator serial
    local emulator_serial=$(adb devices | grep emulator | head -1 | cut -f1)

    log "Device found: $emulator_serial, waiting for boot completion..."
    
    # Use specific serial for all adb commands
    local adb_cmd="adb -s $emulator_serial"
    
    # Wait for boot completion
    boot_completed=""
    retries=0
    until [[ "$boot_completed" == "1" || $retries -gt 60 ]]; do
        boot_completed=$($adb_cmd shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || echo "")

        if [[ -z "$boot_completed" ]]; then
            # If the command failed, wait and try again
            sleep 2
            ((retries++))
            echo " ⏳ Waiting for device to respond ($retries)..."
            continue
        elif [[ "$boot_completed" == "1" ]]; then
            break
        fi

        sleep 3
        ((retries++))
        echo " ⏳ Waiting for boot completion ($retries)..."
    done

    if [[ "$boot_completed" != "1" ]]; then
        error "Emulator failed to boot within the timeout period."
        return 1
    fi

    # Get emulator information
    local sdk_version=$($adb_cmd shell getprop ro.build.version.sdk | tr -d '\r')
    local device_model=$($adb_cmd shell getprop ro.product.model | tr -d '\r')

    # Print detailed information
    echo -e "\n\033[1;35mEmulator Information:\033[0m"
    echo -e "AVD Name: \033[1;33m$AVD_NAME\033[0m"
    echo -e "Serial: \033[1;33m$emulator_serial\033[0m"
    echo -e "Android API: \033[1;33m$sdk_version\033[0m"
    echo -e "Device Model: \033[1;33m$device_model\033[0m"
    echo -e "PID: \033[1;33m$EMULATOR_PID\033[0m"
    echo -e "\n\033[1;35mManagement Commands:\033[0m"
    echo -e "Stop emulator: \033[1;32madb -s $emulator_serial emu kill\033[0m"
    echo -e "View logs: \033[1;32mtail -f .emulator_port.log\033[0m"
    echo -e "Kill by PID: \033[1;32mkill $EMULATOR_PID\033[0m"
    echo -e "ADB commands: \033[1;32madb -s $emulator_serial <command>\033[0m"

    success "Emulator is ready -> $AVD_NAME (Serial: $emulator_serial)"

    # Save emulator serial for later use
    echo "$emulator_serial" > .emulator_serial
    
    return 0
}

cleanup() {
    log "Running cleanup..."
    
    if [[ -f ".emulator_pid" ]]; then
        local pid=$(cat .emulator_pid)
        if ps -p $pid > /dev/null 2>&1; then
            log "Stopping emulator (PID: $pid)..."
            kill $pid 2>/dev/null || true
            rm .emulator_pid
        fi
    fi

    if [[ -f ".emulator_serial" ]]; then
        local serial=$(cat .emulator_serial)
        log "Stopping emulator via adb (Serial: $serial)..."
        adb -s $serial emu kill 2>/dev/null || true
        rm .emulator_serial
    fi

    # Additional cleanup
    adb devices | grep emulator | cut -f1 | xargs -I{} adb -s {} emu kill 2>/dev/null || true
    
    # Kill any remaining metro processes if applicable
    if [[ -n "$METRO_PID" ]]; then
        log "Stopping Metro bundler (PID: $METRO_PID)..."
        kill $METRO_PID 2>/dev/null || true
    fi
}

update_detox_config() {
    local config_file=".detoxrc.json"
    
    if [ -f "$config_file" ]; then
        # Check if jq is available
        if command -v jq &> /dev/null; then
            # Use jq to update the avdName
            jq --arg avdName "$AVD_NAME" \
               '.devices["android.emulator"].device.avdName = $avdName' \
               "$config_file" > "${config_file}.tmp" && \
            mv "${config_file}.tmp" "$config_file"
            
            log "Updated detoxrc.json AVD name to: $AVD_NAME"
        else
            log "Warning: jq is not installed - skipping detoxrc.json update"
        fi
    else
        log "Warning: detoxrc.json not found in current directory"
    fi
}

# ----------- App + Server Setup --------------

install_app() {
    log "Installing app..."
    local apk_path="../android/app/build/outputs/apk/debug/app-debug.apk"

    if [ ! -f "$apk_path" ]; then
        error "APK not found at: $apk_path"
        return 1
    fi

    adb install -r "$apk_path"
    if adb shell pm list packages | grep -q "com.mattermost.rnbeta"; then
        success "App is installed."
        return 0
    else
        error "App installation failed."
        return 1
    fi
}

start_server() {
    log "Starting Metro bundler..."
    cd ..
    RUNNING_E2E=true npm run start > metro.log 2>&1 &
    METRO_PID=$!
    log "Metro bundler started with PID: $METRO_PID"
    
    local max_wait=120 elapsed=0

    log "Waiting for Metro to start on port 8081..."
    until nc -z localhost 8081 2>/dev/null; do
        if [[ $elapsed -ge $max_wait ]]; then
            error "Metro bundler did not start within the timeout period."
            cat metro.log
            return 1
        fi
        sleep 5
        ((elapsed+=5))
        log "Still waiting for Metro bundler ($elapsed/$max_wait seconds)..."
    done

    success "Metro bundler is ready"
    return 0
}

setup_adb_reverse() {
    log "Setting up ADB reverse..."

    # Get the emulator serial if available
    local emulator_serial=""
    if [[ -f ".emulator_serial" ]]; then
        emulator_serial=$(cat .emulator_serial)
        adb -s "$emulator_serial" reverse tcp:8081 tcp:8081 || {
            error "Failed to set up ADB reverse for port 8081"
            return 1
        }
    else
        # Fallback to using the first emulator in the list
        adb reverse tcp:8081 tcp:8081 || {
            error "Failed to set up ADB reverse for port 8081"
            return 1
        }
    fi
    
    return 0
}

run_detox_tests() {
    local test_files="$@"
    log "Running Detox tests: $test_files"
    cd detox
    
    # Capture the return value of the test command
    local test_result=0

    # Check if any test files were specified
    if [ -z "$test_files" ]; then
        log "No test files specified, running all tests"
        npm run e2e:android-test || test_result=$?
    else
        log "Running specified test files: $test_files"
        npm run e2e:android-test -- $test_files || test_result=$?
    fi
    
    log "Detox tests completed with exit code: $test_result"
    return $test_result
}

# ----------- Main Logic --------------

main() {
    local main_result=0
    
    # Disable trap during setup to prevent premature cleanup
    trap - EXIT INT TERM
    
    kill_existing_emulators
    setup_avd_home

    if ! emulator -list-avds | grep -q "$AVD_NAME"; then
        create_avd
    else
        log "AVD '$AVD_NAME' already exists."
        
        # Delete and recreate to ensure correct config
        log "Deleting existing AVD to ensure proper configuration"
        "$ANDROID_HOME"/cmdline-tools/latest/bin/avdmanager delete avd -n "$AVD_NAME" 2>/dev/null || true
        create_avd
    fi

    update_detox_config
    
    # Start emulator and handle potential failures
    if ! start_emulator; then
        error "Failed to start emulator properly."
        cleanup
        exit 1
    fi
    
    # Now enable the trap for subsequent operations
    trap cleanup EXIT INT TERM
    
    # Wait for emulator to boot
    if ! wait_for_emulator; then
        error "Emulator failed to boot properly."
        main_result=1
    fi

    # Only proceed with tests if emulator is working
    if [[ $main_result -eq 0 && "$CI" == "true" ]]; then
        if ! install_app; then
            error "Failed to install app."
            main_result=1
        fi
        
        if [[ $main_result -eq 0 ]] && ! start_server; then
            error "Failed to start Metro server."
            main_result=1
        fi
        
        if [[ $main_result -eq 0 ]] && ! setup_adb_reverse; then
            error "Failed to set up ADB reverse."
            main_result=1
        fi
        
        if [[ $main_result -eq 0 ]]; then
            # Run the tests and capture the result
            if ! run_detox_tests $TEST_FILES; then
                log "Tests completed with failures."
                main_result=1
            else
                success "All tests passed successfully!"
            fi
        fi
    elif [[ "$CI" != "true" ]]; then
        log "Emulator is running in interactive mode. Press Ctrl+C to stop."
        # Wait for emulator process in non-CI mode
        wait $EMULATOR_PID || true
    fi
    
    # Run cleanup manually before exiting
    cleanup
    
    log "Script completed with exit code: $main_result"
    exit $main_result
}

main
