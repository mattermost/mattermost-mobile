// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
exports.config = {

    // ====================
    // Runner and framework
    // Configuration
    // ====================
    runner: 'local',
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 90000,
    },
    sync: true,
    logLevel: 'error',
    deprecationWarnings: true,
    bail: 0,
    waitforTimeout: 30000,
    connectionRetryTimeout: 90000,
    connectionRetryCount: 1,
    reporters: ['spec'],
    services: ['appium'],
    port: 4723,

    // ====================
    // Hooks
    // ====================
    before: () => {
        var chai = require('chai');
        global.expect = chai.expect;
    },
};
