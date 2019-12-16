// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const {join} = require('path');
const {config} = require('./shared.conf');

// ============
// Specs
// ============
config.specs = [
    './test_android/**/*_spec.js',
];

// ============
// Capabilities
// ============
// For all capabilities, refer to:
// http://appium.io/docs/en/writing-running-appium/caps/#general-capabilities
config.capabilities = [
    {

        // Default values for Android
        platformName: 'Android',
        maxInstances: 1,

        // For W3C, the Appium capabilities need to have an extension prefix of `appium:`
        // http://appium.io/docs/en/writing-running-appium/caps/

        // Should match with connected Android device or emulator
        'appium:avd': 'Pixel_2_API_27',
        'appium:deviceName': 'Pixel_2_API_27',

        'appium:orientation': 'PORTRAIT',
        'appium:automationName': 'UiAutomator2',

        // The path to the app
        'appium:app': join(process.cwd(), '../Mattermost-unsigned.apk'),

        // The app package and activity
        'appium:appPackage': 'com.mattermost.rn',
        'appium:appActivity': '.MainActivity',

        // Read the reset strategies very well, they differ per platform, see
        // http://appium.io/docs/en/writing-running-appium/other/reset-strategies/
        // 'appium:noReset': true,

        'appium:newCommandTimeout': 240,
        'appium:autoGrantPermissions': true,
    },
];

config.serverUrl = 'http://10.0.2.2:8065';

exports.config = config;
