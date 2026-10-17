// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console -- CI utility script */

// iOS CI: spec files whose every failing test died in a runner route loss (~2 s, DNS included, -1009).
// Only those may be re-run once; any failing test without the signature in its device.log stays red.

const fs = require('fs');
const path = require('path');

const {parseArgs} = require('./cli-args');
const {specKey} = require('./failed-jest-specs');

const ROUTE_LOSS = /No network route/;
const REQUEST_FAILED_NO_ROUTE = /(?:error code: |Code=|error \[)-1009\b/;

/**
 * @param {string} deviceLog
 * @returns {boolean}
 */
function hasRouteLossSignature(deviceLog) {
    return ROUTE_LOSS.test(deviceLog) && REQUEST_FAILED_NO_ROUTE.test(deviceLog);
}

/**
 * Detox names each test's artifact folder after its full name, minus filename-unsafe characters.
 *
 * @param {string} name
 * @returns {string}
 */
function normalizeName(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Latest device.log recorded for the test, or null when Detox kept none.
 *
 * @param {string} artifactsDir
 * @param {string} fullName
 * @returns {string | null}
 */
function findTestDeviceLog(artifactsDir, fullName) {
    const wanted = normalizeName(fullName);
    if (!wanted || !fs.existsSync(artifactsDir)) {
        return null;
    }
    const matches = [];
    for (const runDir of fs.readdirSync(artifactsDir, {withFileTypes: true})) {
        if (!runDir.isDirectory()) {
            continue;
        }
        const runPath = path.join(artifactsDir, runDir.name);
        for (const testDir of fs.readdirSync(runPath, {withFileTypes: true})) {
            const dirName = normalizeName(testDir.name);

            // Long names are truncated on disk, so a stored prefix of the full name counts.
            if (!testDir.isDirectory() || !dirName || !(dirName === wanted || (dirName.length >= 40 && wanted.startsWith(dirName)))) {
                continue;
            }
            const log = path.join(runPath, testDir.name, 'device.log');
            if (fs.existsSync(log)) {
                matches.push(log);
            }
        }
    }
    matches.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return matches[0] || null;
}

/**
 * @param {object} testCase
 * @returns {string}
 */
function caseFullName(testCase) {
    if (testCase.fullName) {
        return testCase.fullName;
    }
    return [...(testCase.ancestorTitles || []), testCase.title].filter(Boolean).join(' ');
}

/**
 * @param {string} resultsPath
 * @param {string} artifactsDir
 * @returns {{specs: string[], tests: string[]}}
 */
function listNetworkOutageSpecs(resultsPath, artifactsDir) {
    const out = {specs: [], tests: []};
    if (!resultsPath || !fs.existsSync(resultsPath)) {
        return out;
    }
    let report;
    try {
        report = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    } catch {
        return out;
    }
    for (const suite of report.testResults || []) {
        const cases = suite.assertionResults || suite.testResults || [];
        const failing = cases.filter((c) => c?.status === 'failed');
        if (failing.length === 0) {
            continue;
        }
        const outageTests = [];
        for (const testCase of failing) {
            const name = caseFullName(testCase);
            const log = findTestDeviceLog(artifactsDir, name);
            if (!log || !hasRouteLossSignature(fs.readFileSync(log, 'utf8'))) {
                console.error(`[network-outage] keep red: ${name} (${log ? 'no route-loss signature' : 'no device.log'})`);
                break;
            }
            outageTests.push(name);
        }
        if (outageTests.length === failing.length) {
            out.specs.push(specKey(suite.testFilePath || suite.name));
            out.tests.push(...outageTests);
        }
    }
    return out;
}

function main() {
    const args = parseArgs(process.argv);
    const {specs, tests} = listNetworkOutageSpecs(args.results, args.artifacts);
    for (const test of tests) {
        console.error(`[network-outage] runner lost its route during: ${test}`);
    }
    for (const spec of specs) {
        console.log(spec);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    hasRouteLossSignature,
    findTestDeviceLog,
    listNetworkOutageSpecs,
};
