#!/bin/bash
# Reference: Download Android (AOSP) Emulators - https://github.com/wix/Detox/blob/master/docs/guide/android-dev-env.md#android-aosp-emulators

set -ex
set -o pipefail

SDK_VERSION=${1:-34}  # First argument is SDK version
AVD_BASE_NAME=${2:-"detox_pixel_4_xl_api_34"}  # Second argument is AVD base name
AVD_NAME="${AVD_BASE_NAME}_api_${SDK_VERSION}"
TEST_FILES=${@:3} # Capture all remaining arguments as Detox test files

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

    avdmanager create avd -n "$AVD_NAME" -k "system-images;android-${SDK_VERSION};google_apis;${cpu_arch_family}" -p "$AVD_NAME" -d 'pixel_5'

    cp -r android_emulator/ "$AVD_NAME/"
    sed -i -e "s|AvdId = change_avd_id|AvdId = ${AVD_NAME}|g" "$AVD_NAME/config.ini"
    sed -i -e "s|avd.ini.displayname = change_avd_displayname|avd.ini.displayname = Detox Pixel 4 XL API ${SDK_VERSION}|g" "$AVD_NAME/config.ini"
    sed -i -e "s|abi.type = change_type|abi.type = ${cpu_arch_family}|g" "$AVD_NAME/config.ini"
    sed -i -e "s|hw.cpu.arch = change_cpu_arch|hw.cpu.arch = ${cpu_arch}|g" "$AVD_NAME/config.ini"
    sed -i -e "s|image.sysdir.1 = change_to_image_sysdir/|image.sysdir.1 = system-images/android-${SDK_VERSION}/default/${cpu_arch_family}/|g" "$AVD_NAME/config.ini"
    sed -i -e "s|skin.path = change_to_absolute_path/pixel_4_xl_skin|skin.path = $(pwd)/${AVD_NAME}/pixel_4_xl_skin|g" "$AVD_NAME/config.ini"

    echo "hw.cpu.ncore=5" >> "$AVD_NAME/config.ini"
    echo "Android virtual device successfully created: ${AVD_NAME}"
}

start_adb_server() {
    echo "Restarting ADB server..."
    adb kill-server
    adb start-server
}

start_emulator() {
    echo "Starting the emulator..."
    local emulator_opts="-avd $AVD_NAME -no-snapshot -no-boot-anim -no-audio -gpu off -no-window"
    
    if [[ "$CI" == "true" || "$(uname -s)" == "Linux" ]]; then
        emulator $emulator_opts -gpu host -accel on -qemu -m 4096 &
    else
        emulator $emulator_opts -gpu guest -verbose -qemu -vnc :0
    fi
}

wait_for_emulator() {
    if [[ "$CI" != "true" ]]; then return; fi

    echo "Waiting for emulator to boot..."
    adb wait-for-device
    until [[ "$(adb shell getprop sys.boot_completed | tr -d '\r')" == "1" ]]; do
        echo "Waiting for emulator to fully boot..."
        sleep 10
    done
    echo "Emulator is fully booted."
}

install_app() {
    echo "Installing the app..."
    adb install -r ../android/app/build/outputs/apk/debug/app-debug.apk
    adb shell pm list packages | grep "com.mattermost.rnbeta" && echo "App is installed." || echo "App is not installed."
}

start_server() {
    echo "Starting the server..."
    cd ..
    RUNNING_E2E=true npm run start &
    local timeout=120 interval=5 elapsed=0
    sleep $timeout

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
    adb reverse tcp:8081 tcp:8081
}

run_detox_tests() {
    echo "Running Detox tests... $@"

    cd detox
    npm run e2e:android-test -- "$@"
}

main() {
    setup_avd_home
    
    if ! emulator -list-avds | grep -q "$AVD_NAME"; then
        create_avd
    else
        echo "'${AVD_NAME}' Android virtual device already exists."
    fi

    start_adb_server
    start_emulator
    wait_for_emulator

    if [[ "$CI" == "true" ]]; then
        install_app
        start_server
        setup_adb_reverse
    fi

    run_detox_tests $TEST_FILES
}

main
