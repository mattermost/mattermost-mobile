#!/bin/bash

set -ex
set -o pipefail

NAME=detox_pixel_4_xl_api_31

if emulator -list-avds | grep -q $NAME; then
    echo "'${NAME}' Android virtual device already exists."
else
    # Create virtual device in a relative "detox_pixel_4_xl_api_31" folder
    avdmanager create avd -n $NAME -k 'system-images;android-31;google_apis;x86_64' -g google_apis -p $NAME -d 'pixel'

    # Copy predefined config and skin
    cp -r android_emulator/ $NAME/
    sed -i -e "s|skin.path = /change_to_absolute_path/pixel_4_xl_skin|skin.path = $(pwd)/${NAME}/pixel_4_xl_skin|g" $NAME/config.ini

    echo "Android virtual device successfully created: ${NAME}"
fi
