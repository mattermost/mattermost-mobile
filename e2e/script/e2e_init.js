// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable */

require('shelljs/global');

const argv = require('yargs').argv;
const spawn = require('child_process').spawn;

const retryExec = require('./retry_exec');
const timesToRetry = argv.retries || 1;

let SERVER_PID;
let APPIUM_PID;
let exitCode;

// packages
const APPIUM = 'appium@1.12.1';
const WD = 'wd@1.11.2';
const TAPE = 'tape@4.10.1';
const TAP_SPEC = 'tap-spec@5.0.0';

try {
    if (argv.install) {
        installTestFramework();
    }

    startPackagerServer();
    startAppiumServer();

    if (argv.android) {
        testAndroid();
    }

    exitCode = 0;

    logStep('Success: completed E2E tests!');
} catch {
    logStep('Failed: error encountered');
} finally {
    stopPackagerServer();
    stopAppiumServer();
}

exit(exitCode);

// Helper functions

function logStep(message) {
    echo(`
    ---------------------------------------
    ${message}
    ---------------------------------------
    `);
}

function installTestFramework() {
    logStep('Installing end-to-end framework');

    if (
        retryExec(
            () => {
                return exec(
                    `npm i --no-save ${APPIUM} ${WD} ${TAPE} ${TAP_SPEC}`,
                    {silent: true},
                ).code;
            },
            timesToRetry,
            () => exec('sleep 10s'),
        )
    ) {
        echo('Failed to execute npm install Appium and utility packages');
        echo('Most common reason is npm registry connectivity, try again');
        exitCode = 1;
        throw Error(exitCode);
    }
}

function startAppiumServer() {
    const appiumProcess = spawn('node', ['./node_modules/.bin/appium']);
    APPIUM_PID = appiumProcess.pid;

    // Time for Appium to completely initialize and start
    exec('sleep 10s');

    echo(`Started appium server, pid @${APPIUM_PID}`);
}

function stopAppiumServer() {
    if (SERVER_PID) {
        exec(`kill -9 ${SERVER_PID}`);
        exec("lsof -i tcp:8081 | awk 'NR!=1 {print $2}' | xargs kill");
        echo(`Stopped packager ${SERVER_PID}`);
    }
}

function startPackagerServer() {
    const packagerProcess = spawn('npm', ['start', '--max-workers 1'], {
      env: process.env,
    });
    SERVER_PID = packagerProcess.pid;

    exec('sleep 15s');

    echo(`Started packager server, pid @${SERVER_PID}`);
}

function stopPackagerServer() {
    if (APPIUM_PID) {
        exec(`kill -9 ${APPIUM_PID}`);
        echo(`Stopped appium ${APPIUM_PID}`);
    }
}

function testAndroid() {
    logStep('Running E2E tests');
    if (
        exec('$(npm bin)/tape ./e2e/android/index.js | tap-spec').code
    ) {
        echo('Error thrown running E2E tests');
        exitCode = 1;
        throw Error(exitCode);
    }
}
