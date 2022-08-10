// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop, no-console, no-process-env */

/*
 * This command, which normally use in CI, runs Detox test in full or partial
 * depending on test metadata and environment capabilities.
 *
 * Usage: [ENVIRONMENT] node run_tests.js [options]
 *
 * Options:
 *   --target=[target command and pattern]
 *      Selects and runs spec files with matching target command and pattern.
 *      E.g. "--target='ios-test -- e2e/test/**'" will select and run files under test folder and its subfolders.

 *
 * Environment:
 *   DEVICE_NAME=[device_name]             : Name of the device to be used in testing. Passed for reporting purposes only, e.g. 'iPhone 13'
 *   DEVICE_OS_VERSION=[device_os_version] : OS version of the device to be used in testing. Passed for reporting purposes only, e.g. 'iOS 13.5'
 *   HEADLESS=[boolean]                    : Headed by default (false) or true to run on headless mode.
 *   IOS=[boolean]                         : Android by default (false) or true to run on iOS mode.
 *
 * Example:
 * 1. "node run_tests.js target='ios-test'"
 *      - will run all the specs on default test environment
 * 2. "node run_tests.js target='ios-test -- e2e/test/smoke_test'"
 *      - will run all the specs under smoke_test folder
 * 3. "node run_tests.js target='ios-test -- e2e/test/smoke_test/autocomplete.e2e.ts'"
 *      - will run a specific spec
 * 4. "node run_tests.js target='ios-test -- e2e/test/smoke_test/s*'"
 *      - will run specs based on a pattern
 */

const shell = require('shelljs');
const argv = require('yargs').argv;

const {ARTIFACTS_DIR} = require('./utils/constants');
const {writeJsonToFile} = require('./utils/report');

require('dotenv').config();

async function runTests() {
    const {
        DEVICE_NAME,
        DEVICE_OS_VERSION,
        HEADLESS,
        IOS,
    } = process.env;

    const detox_version = shell.exec('npm list detox').stdout.split('\n')[1].split('@')[1].trim();
    const headless = IOS ? false : HEADLESS === 'true';
    const os_lines = shell.exec('sw_vers').stdout.split('\n');
    const os_name = os_lines[0].split(':')[1].trim();
    const os_version = os_lines[1].split(':')[1].trim();
    const node_version = process.version;
    const npm_version = shell.exec('npm --version').stdout.trim();

    // Write environment details to file
    const environment = {
        detox_version,
        device_name: DEVICE_NAME,
        device_os_version: DEVICE_OS_VERSION,
        headless,
        os_name,
        os_version,
        node_version,
        npm_version,
    };
    writeJsonToFile(environment, 'environment.json', ARTIFACTS_DIR);

    // Run tests
    const headlessParam = headless ? ' --headless' : '';
    shell.exec(`npm run e2e:${argv.target}${headlessParam}`);
}

runTests();
