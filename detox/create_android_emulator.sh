#!/bin/bash

# Reference: Download Android (AOSP) Emulators - https://github.com/wix/Detox/blob/master/docs/guide/android-dev-env.md#android-aosp-emulators
# sdkmanager "system-images;android-31;default;arm64-v8a"
# sdkmanager --licenses

set -ex
set -o pipefail

SDK_VERSION=33
NAME="detox_pixel_4_xl_api_${SDK_VERSION}"

# Set ANDROID_AVD_HOME to the current directory
if [[ "$CI" == "true" ]]; then
    export ANDROID_AVD_HOME=$(pwd)/.android/avd
    mkdir -p $ANDROID_AVD_HOME
fi

if emulator -list-avds | grep -q $NAME; then
    echo "'${NAME}' Android virtual device already exists."
else
    CPU_ARCH_FAMILY=''
    CPU_ARCH=''
    if [[ $(uname -p) == 'arm' ]]; then
        CPU_ARCH_FAMILY=arm64-v8a
        CPU_ARCH=arm64
    else
        CPU_ARCH_FAMILY=x86_64
        CPU_ARCH=x86_64
    fi

    # Create virtual device in a relative "detox_pixel_4_xl_api_${SDK_VERSION}" folder
    avdmanager create avd -n $NAME -k "system-images;android-${SDK_VERSION};default;${CPU_ARCH_FAMILY}" -p $NAME -d 'pixel'

    # Copy predefined config and skin
    cp -r android_emulator/ $NAME/
    sed -i -e "s|AvdId = change_avd_id|AvdId = ${NAME}|g" $NAME/config.ini
    sed -i -e "s|avd.ini.displayname = change_avd_displayname|avd.ini.displayname = Detox Pixel 4 XL API ${SDK_VERSION}|g" $NAME/config.ini
    sed -i -e "s|abi.type = change_type|abi.type = ${CPU_ARCH_FAMILY}|g" $NAME/config.ini
    sed -i -e "s|hw.cpu.arch = change_cpu_arch|hw.cpu.arch = ${CPU_ARCH}|g" $NAME/config.ini
    sed -i -e "s|image.sysdir.1 = change_to_image_sysdir/|image.sysdir.1 = system-images/android-${SDK_VERSION}/default/${CPU_ARCH_FAMILY}/|g" $NAME/config.ini
    sed -i -e "s|skin.path = change_to_absolute_path/pixel_4_xl_skin|skin.path = $(pwd)/${NAME}/pixel_4_xl_skin|g" $NAME/config.ini

    echo "Android virtual device successfully created: ${NAME}"
fi

# Kill existing ADB server
echo "Killing existing ADB server..."
adb kill-server

# Start ADB server
echo "Starting ADB server..."
adb start-server

# Start the emulator
echo "Starting the emulator..."

if [[ "$CI" == "true" || "$(uname -s)" == "Linux" ]]; then
    echo "Starting the emulator with KVM..."
    emulator -avd $NAME -no-snapshot -no-boot-anim -no-audio -no-window -gpu swiftshader_indirect -accel on -qemu -m 4096 -cores 5 &
else
    emulator -avd $NAME -no-snapshot -no-boot-anim -no-audio -no-window -gpu guest -verbose -qemu -vnc :0
fi

if [[ "$CI" == "true" ]]; then
    # Wait for the emulator to boot
    echo "Waiting for the emulator to boot..."
    adb wait-for-device

    # Check if the emulator is fully booted
    echo "Checking if the emulator is fully booted..."
    while true; do
        boot_completed=$(adb shell getprop sys.boot_completed | tr -d '\r')
        if [[ "$boot_completed" == "1" ]]; then
            echo "Emulator is fully booted."
            break
        fi
        echo "Waiting for emulator to boot..."
        sleep 10
    done
fi

# Start the server
cd ..
npm run start &
sleep 180

# Run tests
echo "Running tests..."
cd detox
npm run e2e:android-test -- about.e2e.ts
