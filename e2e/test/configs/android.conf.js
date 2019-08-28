// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
const {join} = require('path');
const {config} = require('./shared.conf');

// ============
// Specs
// ============
config.specs = ['./test/specs/**/*.test.js'];

// ============
// Capabilities
// ============
// For all capabilities please check
// http://appium.io/docs/en/writing-running-appium/caps/#general-capabilities
config.capabilities = [
    {
        automationName: 'UiAutomator2',
        deviceName: 'Android Emulator',
        platformName: 'Android',
        platformVersion: '8.1',
        orientation: 'PORTRAIT',
        maxInstances: 1,
        app: join(process.cwd(), '../Mattermost.apk'),
        fullReset: true,
        noReset: false,
        newCommandTimeout: 240,
        autoGrantPermissions: true,
        appActivity: '.MainActivity',
    },
];

exports.config = config;
