#!/bin/bash

# Reference: Download Android (AOSP) Emulators - https://github.com/wix/Detox/blob/master/docs/guide/android-dev-env.md#android-aosp-emulators
# sdkmanager "system-images;android-31;default;arm64-v8a"
# sdkmanager --licenses

set -ex
set -o pipefail

SDK_VERSION=31
NAME="detox_pixel_4_xl_api_${SDK_VERSION}"

# Check if the AVD already exists
if emulator -list-avds | grep -q $NAME; then
    echo "'${NAME}' Android virtual device already exists. Deleting it now..."
    avdmanager delete avd -n $NAME
    echo "'${NAME}' has been deleted."
fi

# Define the correct CPU architecture and system image path
CPU_ARCH_FAMILY=''
CPU_ARCH=''
if [[ $(uname -p) == 'arm' ]]; then
    CPU_ARCH_FAMILY=arm64-v8a
    CPU_ARCH=arm64
else
    CPU_ARCH_FAMILY=x86_64
    CPU_ARCH=x86_64
fi
SYSTEM_IMAGE="system-images;android-${SDK_VERSION};default;${CPU_ARCH_FAMILY}"

# Install the system image if it's not already installed
sdkmanager --install "$SYSTEM_IMAGE"

# Create virtual device in a relative "detox_pixel_4_xl_api_${SDK_VERSION}" folder
avdmanager create avd -n $NAME -k "$SYSTEM_IMAGE" -p $NAME -d 'pixel'

# Copy predefined config and skin
mkdir -p android_emulator/

cp -r android_emulator/ $NAME/
sed -i -e "s|AvdId = change_avd_id|AvdId = ${NAME}|g" $NAME/config.ini
sed -i -e "s|avd.ini.displayname = change_avd_displayname|avd.ini.displayname = Detox Pixel 4 XL API ${SDK_VERSION}|g" $NAME/config.ini
sed -i -e "s|abi.type = change_type|abi.type = ${CPU_ARCH_FAMILY}|g" $NAME/config.ini
sed -i -e "s|hw.cpu.arch = change_cpu_arch|hw.cpu.arch = ${CPU_ARCH}|g" $NAME/config.ini
sed -i -e "s|image.sysdir.1 = change_to_image_sysdir/|image.sysdir.1 = system-images/android-${SDK_VERSION}/default/${CPU_ARCH_FAMILY}/|g" $NAME/config.ini
sed -i -e "s|skin.path = change_to_absolute_path/pixel_4_xl_skin|skin.path = $(pwd)/${NAME}/pixel_4_xl_skin|g" $NAME/config.ini

echo "Android virtual device successfully created: ${NAME}"

echo "*****************************************"
which emulator
echo "*****************************************"

# Start the emulator in headless mode and log output
nohup emulator -avd $NAME -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect -verbose > emulator.log 2>&1 &
sleep 30  # Adjust based on emulator startup time

# Output the emulator logs for debugging
cat emulator.log

# Start adb server
adb start-server

# Wait for adb to detect the emulator
echo "Waiting for the emulator to be detected by adb..."
adb_devices=$(adb devices | grep emulator | wc -l | xargs)

# Retry until the emulator is detected
while [[ "$adb_devices" -eq "0" ]]; do
    echo "Waiting for adb to detect the emulator..."
    sleep 10  # Increased wait time for adb to detect the device
    adb start-server  # Ensure adb server is running
    adb devices  # List devices
    adb_devices=$(adb devices | grep emulator | wc -l | xargs)
done

echo "Emulator detected by adb."

# Wait for the emulator to fully boot
BOOT_STATUS=$(adb shell getprop sys.boot_completed | tr -d '\r')
while [[ "$BOOT_STATUS" != "1" ]]; do
    echo "Waiting for the emulator to boot..."
    sleep 5
    BOOT_STATUS=$(adb shell getprop sys.boot_completed | tr -d '\r')
done

echo "Emulator booted successfully!"
