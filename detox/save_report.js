// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console, no-process-env */

/*
 * This is used for saving artifacts to AWS S3, sending data to automation dashboard and
 * publishing quick summary to community channels.
 *
 * Usage: [ENV] node save_report.js
 *
 * Environment variables:
 *   BRANCH=[branch]            : Branch identifier from CI
 *   BUILD_ID=[build_id]        : Build identifier from CI
 *
 *   For saving artifacts to AWS S3
 *      - AWS_S3_BUCKET, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
 *   For saving test cases to Test Management
 *      - TM4J_ENABLE=true|false
 *      - TM4J_API_KEY=[api_key]
 *      - JIRA_PROJECT_KEY=[project_key], e.g. "MM",
 *      - TM4J_FOLDER_ID=[folder_id], e.g. 847997
 *   For sending hooks to Mattermost channels
 *      - FULL_REPORT, WEBHOOK_URL and DIAGNOSTIC_WEBHOOK_URL
 *   Test type
 *      - TYPE=[type], e.g. "MASTER", "PR", "RELEASE", "GEKIDOU"
 */

const assert = require('assert');

const fse = require('fs-extra');

const {saveArtifacts} = require('./utils/artifacts');
const {ARTIFACTS_DIR} = require('./utils/constants');
const {
    convertXmlToJson,
    generateDiagnosticReport,
    generateShortSummary,
    generateTestReport,
    getAllTests,
    removeOldGeneratedReports,
    sendReport,
    readJsonFromFile,
    writeJsonToFile,
} = require('./utils/report');
const {createTestCycle, createTestExecutions} = require('./utils/test_cases');

require('dotenv').config();

const saveReport = async () => {
    const {
        DIAGNOSTIC_WEBHOOK_URL,
        DIAGNOSTIC_USER_ID,
        DIAGNOSTIC_TEAM_ID,
        FAILURE_MESSAGE,
        TM4J_ENABLE,
        TM4J_CYCLE_KEY,
        TYPE,
        WEBHOOK_URL,
    } = process.env;

    // Remove old generated reports
    removeOldGeneratedReports();

    // Read XML from a file
    const platform = process.env.IOS ? 'ios' : 'android';
    const xml = fse.readFileSync(`${ARTIFACTS_DIR}/${platform}-junit.xml`);
    const {testsuites} = convertXmlToJson(xml);

    // Generate short summary, write to file and then send report via webhook
    const allTests = getAllTests(testsuites);
    const summary = generateShortSummary(allTests);
    console.log(summary);
    writeJsonToFile(summary, 'summary.json', ARTIFACTS_DIR);

    const result = await saveArtifacts();
    if (result && result.success) {
        console.log('Successfully uploaded artifacts to S3:', result.reportLink);
    }

    // Create or use an existing test cycle
    let testCycle = {};
    if (TM4J_ENABLE === 'true') {
        const {start, end} = summary.stats;
        testCycle = TM4J_CYCLE_KEY ? {key: TM4J_CYCLE_KEY} : await createTestCycle(start, end);
    }

    // Send test report to "QA: Mobile Test Automation Report" channel via webhook
    if (TYPE && TYPE !== 'NONE' && WEBHOOK_URL) {
        const environment = readJsonFromFile(`${ARTIFACTS_DIR}/environment.json`);
        const data = generateTestReport(summary, result && result.success, result && result.reportLink, environment, testCycle.key);
        await sendReport('summary report to Community channel', WEBHOOK_URL, data);
    }

    // Send diagnostic report via webhook
    // Send on "RELEASE" type only
    if (TYPE === 'RELEASE' && DIAGNOSTIC_WEBHOOK_URL && DIAGNOSTIC_USER_ID && DIAGNOSTIC_TEAM_ID) {
        const data = generateDiagnosticReport(summary, {userId: DIAGNOSTIC_USER_ID, teamId: DIAGNOSTIC_TEAM_ID});
        await sendReport('test info for diagnostic analysis', DIAGNOSTIC_WEBHOOK_URL, data);
    }

    // Save test cases to Test Management
    if (TM4J_ENABLE === 'true') {
        await createTestExecutions(allTests, testCycle);
    }

    assert(summary.stats.failures === 0, FAILURE_MESSAGE);
};

saveReport();
