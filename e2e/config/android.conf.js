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
// For all capabilities please check
// http://appium.io/docs/en/writing-running-appium/caps/#general-capabilities
config.capabilities = [
    {

        // The defaults you need to have in your config
        platformName: 'Android',
        maxInstances: 1,

        // For W3C the appium capabilities need to have an extension prefix
        // http://appium.io/docs/en/writing-running-appium/caps/
        // This is `appium:` for all Appium Capabilities which can be found here
        'appium:deviceName': 'Pixel_2_API_27_2',

        // 'appium:platformVersion': '10.0',
        // 'appium:orientation': 'PORTRAIT',

        // `automationName` will be mandatory, see
        // https://github.com/appium/appium/releases/tag/v1.13.0
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

        // 'appium:noReset': true,
        // 'appium:fullReset': false
    },
];

config.baseUrl = 'http://10.0.2.2:8065';

exports.config = config;
