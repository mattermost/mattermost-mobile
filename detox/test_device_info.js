// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-process-env */
/* eslint-disable no-console */
/* eslint-disable no-process-exit */
const fs = require('fs');

function getDeviceInfo(platform) {
    const detoxConfig = JSON.parse(fs.readFileSync('./.detoxrc.json', 'utf-8'));

    let deviceName = '';
    let deviceOSVersion = '';

    if (platform === 'ios' && detoxConfig.devices.ios) {
        deviceName = detoxConfig.devices.ios.device.type;
        deviceOSVersion = detoxConfig.devices.ios.device.os;
    } else if (platform === 'android' && detoxConfig.devices.android) {
        deviceName = detoxConfig.devices.android.device.avdName;
        deviceOSVersion = 'Android';
    } else {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    return {deviceName, deviceOSVersion};
}

function main(platform) {
    try {
        const {deviceName, deviceOSVersion} = getDeviceInfo(platform);
        const buildID = `${process.env.GITHUB_RUN_ID}-${deviceName}-${deviceOSVersion}`.replace(/ /g, '_');

        // Set environment variables
        process.env.BUILD_ID = buildID;
        process.env.DEVICE_NAME = deviceName;
        process.env.DEVICE_OS_VERSION = deviceOSVersion;
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

const args = process.argv.slice(2);
if (args.length !== 1 || (args[0] !== 'ios' && args[0] !== 'android')) {
    console.error('Usage: node test_device_info.js <platform>');
    process.exit(1);
}

const PLATFORM = args[0];
main(PLATFORM);
