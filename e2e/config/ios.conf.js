// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const {join} = require('path');
const {config} = require('./shared.conf');

// ============
// Specs
// ============
config.specs = [
    './test_ios/**/*_spec.js',
];

// ============
// Capabilities
// ============
// For all capabilities, refer to:
// http://appium.io/docs/en/writing-running-appium/caps/#general-capabilities
config.capabilities = [
    {

        // Default values for iOS
        platformName: 'iOS',
        maxInstances: 1,

        // For W3C, the Appium capabilities need to have an extension prefix of `appium:`
        // http://appium.io/docs/en/writing-running-appium/caps/

        // Should match with available iOS device or simulator
        'appium:deviceName': 'iPhone 11',
        'appium:platformVersion': '13.2',

        'appium:orientation': 'PORTRAIT',
        'appium:automationName': 'XCUITest',

        // The path to the app
        'appium:app': join(process.cwd(), '../Mattermost-simulator-x86_64.app.zip'),

        // The bundle id
        'appium:bundleId': 'com.mattermost.rn',

        // Read the reset strategies very well, they differ per platform, see
        // http://appium.io/docs/en/writing-running-appium/other/reset-strategies/
        // 'appium:noReset': true,

        'appium:newCommandTimeout': 240,
    },
];

config.serverUrl = 'http://localhost:8065';

exports.config = config;
