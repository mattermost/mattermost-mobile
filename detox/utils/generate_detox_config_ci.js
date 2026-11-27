// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-env */
/* eslint-disable no-console */
const fs = require('fs');
const deviceName = process.env.DEVICE_NAME || 'iPhone 17 Pro';
const deviceOSVersion = process.env.DEVICE_OS_VERSION || 'iOS 26.2';
const avdName = process.env.AVD_NAME || 'detox_pixel_8_api_35';
const simulatorId = process.env.SIMULATOR_ID || '';

const detoxConfigTemplate = fs.readFileSync('../.detoxrc.json', 'utf8');
const configString = detoxConfigTemplate.
    replace(/__DEVICE_NAME__/g, deviceName).
    replace(/__DEVICE_OS_VERSION__/g, deviceOSVersion).
    replace(/__AVD_NAME__/g, avdName);

const detoxConfig = JSON.parse(configString);

// When CI provides a pre-booted simulator UDID, pin Detox to that exact
// simulator so it never creates a "-Detox" clone (which won't have the app).
if (simulatorId) {
    for (const deviceKey of Object.keys(detoxConfig.devices)) {
        const dev = detoxConfig.devices[deviceKey];
        if (dev.type === 'ios.simulator') {
            dev.device = {id: simulatorId};
            console.log(`Pinned ${deviceKey} to simulator ${simulatorId}`);
        }
    }
}

// .detoxrc.json names a fixed AVD; CI boots the one create_android_emulator.sh made.
if (process.env.AVD_NAME) {
    detoxConfig.devices['android.emulator'].device = {avdName: process.env.AVD_NAME};
    console.log(`Pinned android.emulator to AVD ${process.env.AVD_NAME}`);
}

fs.writeFileSync('../.detoxrc.json', JSON.stringify(detoxConfig, null, 2));

console.log('Detox configuration generated successfully');
