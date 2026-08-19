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
 *   BRANCH=[branch]                 : Branch identifier from CI
 *   BUILD_ID=[build_id]             : Build identifier from CI
 *   COMMIT_HASH=[commit_hash]       : Commit hash from repo
 *   DEVICE_NAME=[device_name]       : Name of the device used for testing
 *   DEVICE_OS_NAME=[device_os_name] : OS of the device used for testing
 *   HEADLESS=[boolean]              : Headed by default (false) or headless (true)
 *   IOS=[boolean]                   : Android by default (false) or iOS (true)
 *
 *   For saving artifacts to AWS S3
 *      - DETOX_AWS_S3_BUCKET, DETOX_AWS_ACCESS_KEY_ID and DETOX_AWS_SECRET_ACCESS_KEY
 *   For saving test cases to Test Management
 *      - ZEPHYR_ENABLE=true|false
 *      - ZEPHYR_API_KEY=[api_key]
 *      - JIRA_PROJECT_KEY=[project_key], e.g. "MM",
 *      - ZEPHYR_FOLDER_ID=[folder_id], e.g. 847997
 *   For sending hooks to Mattermost channels
 *      - FULL_REPORT, WEBHOOK_URL and TEST_CYCLE_LINK_PREFIX
 *   Test type
 *      - TYPE=[type], e.g. "PR", "RELEASE", "MAIN"
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const fse = require('fs-extra');
const {mergeFiles} = require('junit-report-merger');
const shell = require('shelljs');

const {saveArtifacts} = require('./utils/artifacts');
const {ARTIFACTS_DIR} = require('./utils/constants');
const {
    generateJestStareHtmlReport,
    mergeJestStareJsonFiles,
} = require('./utils/jest_stare');
const {
    convertXmlToJson,
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

// Two kinds of text artifact dominate the upload:
//
//   *.log            Detox's `--record-logs failing` raw simulator/emulator system log,
//                    50-70 MB for a single failing iOS shard in run 32184155037.
//   detox.trace.json Detox's own file stream. BunyanLogger.installFileStream pins it to
//                    level 'trace' regardless of --loglevel, so this is where the
//                    `testFailed` payloads (and the view hierarchy the console output
//                    only teases with "HINT: To print view hierarchy on failed
//                    actions/matches, use log-level verbose or higher") actually live.
//
// Uploading either verbatim would put hundreds of MB per run in S3. Both are plain text
// and compress by more than an order of magnitude, so store them gzipped; the debugging
// flow in detox/CLAUDE.md just needs a `gunzip -c` in front of the usual awk/jq.
// Screenshots are left alone — PNG is already compressed.
const COMPRESSIBLE_ARTIFACT = /(\.log|\.trace\.json)$/;

function gzipDeviceLogs(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const target = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            gzipDeviceLogs(target);
        } else if (entry.isFile() && COMPRESSIBLE_ARTIFACT.test(entry.name)) {
            try {
                fs.writeFileSync(`${target}.gz`, zlib.gzipSync(fs.readFileSync(target)));
                fs.rmSync(target);
            } catch (error) {
                console.log(`Failed to gzip ${target}:`, error.message);
            }
        }
    }
}

const saveReport = async () => {
    const {
        DEVICE_NAME,
        DEVICE_OS_VERSION,
        HEADLESS,
        IOS,
        TYPE,
        WEBHOOK_URL,
        ZEPHYR_ENABLE,
        ZEPHYR_CYCLE_KEY,
    } = process.env;

    // Remove old generated reports
    removeOldGeneratedReports();

    const detox_version = shell.exec('npm list detox').stdout.split('\n')[1].split('@')[1].trim();
    const headless = IOS === 'true' ? 'false' : HEADLESS === 'true';
    const os_name = os.platform();
    const os_version = os.release();
    const node_version = process.version;
    const npm_version = shell.exec('npm --version').stdout.trim();
    const device_name = DEVICE_NAME;
    const device_os_version = DEVICE_OS_VERSION;

    // Write environment details to file
    const environmentDetails = {
        detox_version,
        device_name,
        device_os_version,
        headless,
        os_name,
        os_version,
        node_version,
        npm_version,
    };
    writeJsonToFile(environmentDetails, 'environment.json', ARTIFACTS_DIR);

    // Merge all XML reports into one single XML report.
    // download-artifact v8 extracts a single matched artifact directly into
    // ARTIFACTS_DIR (flat layout). Multiple shards land in ARTIFACTS_DIR/{platform}-results-*.
    const platform = process.env.IOS === 'true' ? 'ios' : 'android';
    const combinedFilePath = `${ARTIFACTS_DIR}/${platform}-combined.xml`;
    const junitPatterns = [
        `${ARTIFACTS_DIR}/${platform}-results*/${platform}-junit*.xml`,
        `${ARTIFACTS_DIR}/${platform}-junit*.xml`,
    ];

    await mergeFiles(path.join(__dirname, combinedFilePath), junitPatterns);
    console.log(`Merged, check ${combinedFilePath}`);

    // Read XML from a file
    const xml = fse.readFileSync(combinedFilePath);
    const {testsuites} = convertXmlToJson(xml, platform);

    // Generate short summary, write to file and then send report via webhook
    const allTests = getAllTests(testsuites);
    const summary = generateShortSummary(allTests);
    console.log(summary);
    writeJsonToFile(summary, 'summary.json', ARTIFACTS_DIR);

    // Generate jest-stare report
    const jestStareOutputDir = path.join(__dirname, `${ARTIFACTS_DIR}/jest-stare`);
    const jestStareCombinedFilePath = `${jestStareOutputDir}/${platform}-combined.json`;
    if (!fs.existsSync(jestStareOutputDir)) {
        fs.mkdirSync(jestStareOutputDir, {recursive: true});
    }

    const jestStarePatterns = [
        `${ARTIFACTS_DIR}/${platform}-results*/jest-stare/${platform}-data*.json`,
        `${ARTIFACTS_DIR}/jest-stare/${platform}-data*.json`,
    ];
    await mergeJestStareJsonFiles(jestStareCombinedFilePath, jestStarePatterns);
    await generateJestStareHtmlReport(jestStareOutputDir, `${platform}-report.html`, jestStareCombinedFilePath, platform);

    if (process.env.CI) {
        // Prune the per-shard {platform}-results-* folders before the S3 upload, but
        // keep what is actually needed to debug a failure.
        //
        // Removing these folders wholesale also removed every per-test artifact Detox
        // wrote into them — the `device.log` from `--record-logs failing` and the
        // `testFnFailure.png` from `--take-screenshots failing` — so the S3 report only
        // ever carried the HTML summary and the merged JSON. That is why
        // path_builder.js goes to the trouble of naming each folder after the Jest
        // fullName "so TSIO can reverse it": the linking is set up, the files just
        // never arrive. The only surviving copy is the GitHub Actions artifact zip,
        // which expires and is awkward to reach from CI tooling.
        //
        // Uploading them is cheap: video is disabled in .detoxrc.json and the
        // screenshot plugin runs with keepOnlyFailedTestsArtifacts, so a shard only
        // carries artifacts for the tests that failed (1-5 MB for the worst shards of
        // run 32184155037). What is safe to drop is only what has already been merged
        // into the top-level report: the per-shard jest-stare data, the junit XML, and
        // the per-shard jest-results.json.
        const MERGED_INTO_TOP_LEVEL = /^(jest-stare|jest-results\.json|.*-junit.*\.xml)$/;
        const entries = fs.readdirSync(ARTIFACTS_DIR, {withFileTypes: true});
        for (const entry of entries) {
            if (!entry.isDirectory() || !entry.name.startsWith(`${platform}-results-`)) {
                continue;
            }
            const shardDir = path.join(ARTIFACTS_DIR, entry.name);
            for (const shardEntry of fs.readdirSync(shardDir)) {
                if (MERGED_INTO_TOP_LEVEL.test(shardEntry)) {
                    fs.rmSync(path.join(shardDir, shardEntry), {recursive: true, force: true});
                }
            }
            gzipDeviceLogs(shardDir);
        }
    }
    const result = await saveArtifacts(platform);
    if (result && result.success) {
        console.log('Successfully uploaded artifacts to S3:', result.reportLink);
    }

    // Create or use an existing test cycle
    let testCycle = {};
    if (ZEPHYR_ENABLE === 'true') {
        const {start, end} = summary.stats;
        testCycle = ZEPHYR_CYCLE_KEY ? {key: ZEPHYR_CYCLE_KEY} : await createTestCycle(start, end);
        if (!testCycle?.key) {
            console.log('Failed to create test cycle');
        }
    }

    // Send test report to "QA: Mobile Test Automation Report" channel via webhook
    if (TYPE && TYPE !== 'NONE' && WEBHOOK_URL) {
        const environment = readJsonFromFile(`${ARTIFACTS_DIR}/environment.json`);
        const data = generateTestReport(summary, result && result.success, result && result.reportLink, environment, testCycle.key);
        await sendReport('summary report to Community channel', WEBHOOK_URL, data);
    }

    // Save test cases to Test Management
    if (ZEPHYR_ENABLE === 'true') {
        await createTestExecutions(allTests, testCycle);
    }
};

saveReport();
