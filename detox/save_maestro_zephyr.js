// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console, no-process-env */

/* Publish Maestro JUnit to Zephyr Scale (npm run e2e:save-maestro-zephyr). Requires ZEPHYR_ENABLE=true and Zephyr env vars. */

const path = require('path');

require('dotenv').config();

const {saveMaestroTestCases} = require('./utils/maestro_test_cases');

const saveMaestroZephyr = async () => {
    const {ZEPHYR_ENABLE} = process.env;
    if (ZEPHYR_ENABLE !== 'true') {
        console.log('Maestro Zephyr: skipped (ZEPHYR_ENABLE is not true)');
        return;
    }

    const xmlPath = process.argv[2] || path.join(__dirname, '../build/maestro-report.xml');
    const repoRoot = path.join(__dirname, '..');

    await saveMaestroTestCases(xmlPath, repoRoot);
};

saveMaestroZephyr();
