// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const {join} = require('path');
const {config} = require('./shared.conf');

/* eslint-disable no-process-env */

require('dotenv').config();
const {
    DEV,
    FULL_RESET,
    NO_RESET,
    ANDROID_APP_FILE_PATH,
    ANDROID_APP_PACKAGE,
    ANDROID_DEVICE_NAME,
    ANDROID_PLATFORM_VERSION,
    REMOTE_TEST_SERVER_URL,
} = process.env;

// ============
// Specs
// ============
config.specs = [
    './test_android/**/*_spec.js',
];

// ============
// Suites
// For grouping test specs
// ============
config.suites = {
    login: ['./test_android/login/**/*_spec.js'],
    messaging: ['./test_android/messaging/**/*_spec.js'],
};

// ============
// Capabilities
// ============
// For all capabilities, refer to:
// http://appium.io/docs/en/writing-running-appium/caps/
config.capabilities = [
    {

        // Default values for Android
        platformName: 'Android',
        maxInstances: 1,

        // For W3C, the Appium capabilities need to have an extension prefix of `appium:`
        // http://appium.io/docs/en/writing-running-appium/caps/

        // Should match with connected Android device or emulator
        'appium:deviceName': ANDROID_DEVICE_NAME,
        'appium:platformVersion': ANDROID_PLATFORM_VERSION,

        'appium:orientation': 'PORTRAIT',
        'appium:automationName': 'UiAutomator2',
        'appium:appActivity': '.MainActivity',

        'appium:newCommandTimeout': 240,
        'appium:autoGrantPermissions': true,
    },
];

// Refer to reset strategies and note the difference per platform
// http://appium.io/docs/en/writing-running-appium/other/reset-strategies/

if (FULL_RESET === 'true') {
    config.capabilities[0]['appium:fullReset'] = true;
}

if (NO_RESET === 'true') {
    config.capabilities[0]['appium:noReset'] = true;
}

if (DEV === 'true') {
    config.capabilities[0]['appium:appPackage'] = 'com.mattermost.rnbeta';
} else {
    config.capabilities[0]['appium:appPackage'] = ANDROID_APP_PACKAGE;

    // The path to the app
    config.capabilities[0]['appium:app'] = join(process.cwd(), ANDROID_APP_FILE_PATH || '../Mattermost-unsigned.apk');
}

config.serverUrl = REMOTE_TEST_SERVER_URL || 'http://10.0.2.2:8065';

exports.config = config;
