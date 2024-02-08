#!/bin/bash

# Reference: Download Android (AOSP) Emulators - https://github.com/wix/Detox/blob/master/docs/guide/android-dev-env.md#android-aosp-emulators
# sdkmanager "system-images;android-31;default;arm64-v8a"
# sdkmanager --licenses

set -ex
set -o pipefail

SDK_VERSION=31
NAME="detox_pixel_4_xl_api_${SDK_VERSION}"

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
