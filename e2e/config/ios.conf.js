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
    IOS_APP_BUNDLE_ID,
    IOS_APP_FILE_PATH,
    IOS_DEVICE_NAME,
    IOS_PLATFORM_VERSION,
    REMOTE_TEST_SERVER_URL,
} = process.env;

// ============
// Specs
// ============
config.specs = [
    './test_ios/**/*_spec.js',
];

// ============
// Suites
// For grouping test specs
// ============
config.suites = {
    login: ['./test_ios/login/**/*_spec.js'],
    messaging: ['./test_ios/messaging/**/*_spec.js'],
};

// ============
// Capabilities
// ============
// For all capabilities, refer to:
// http://appium.io/docs/en/writing-running-appium/caps/
config.capabilities = [
    {
        platformName: 'iOS',
        maxInstances: 1,

        // Should match with available iOS device or simulator
        'appium:deviceName': IOS_DEVICE_NAME,
        'appium:platformVersion': IOS_PLATFORM_VERSION,

        'appium:orientation': 'PORTRAIT',
        'appium:automationName': 'XCUITest',

        'appium:newCommandTimeout': 240,
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
    config.capabilities[0]['appium:bundleId'] = 'com.mattermost.rnbeta';
} else {
    config.capabilities[0]['appium:bundleId'] = IOS_APP_BUNDLE_ID;

    // The path to the app
    config.capabilities[0]['appium:app'] = join(process.cwd(), IOS_APP_FILE_PATH || '../Mattermost-simulator-x86_64.app.zip');
}

config.serverUrl = REMOTE_TEST_SERVER_URL || 'http://localhost:8065';

exports.config = config;
