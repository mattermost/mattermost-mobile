// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console */

const fse = require('fs-extra');
const xml2js = require('xml2js');

/**
 * Parse a Maestro JUnit XML file and return a summary object
 * matching the shape produced by report.js generateShortSummary().
 *
 * @param {string} xmlPath - Path to maestro-report.xml
 * @returns {{stats: object, statsFieldValue: string} | null}
 */
function parseMaestroReport(xmlPath) {
    if (!fse.existsSync(xmlPath)) {
        console.log(`Maestro report not found at ${xmlPath}`);
        return null;
    }

    const xml = fse.readFileSync(xmlPath, 'utf-8');
    let parsed;
    xml2js.parseString(xml, {mergeAttrs: true}, (err, result) => {
        if (err) {
            console.log('Failed to parse Maestro XML:', err.message);
            return;
        }
        parsed = result;
    });

    if (!parsed || !parsed.testsuites) {
        console.log('Maestro XML has unexpected structure');
        return null;
    }

    const testsuites = parsed.testsuites;
    let tests = 0;
    let failures = 0;
    let errors = 0;
    let skipped = 0;
    let duration = 0;
    const failedNames = [];

    const suites = testsuites.testsuite || [];
    for (const suite of suites) {
        tests += parseInt(suite.tests?.[0] || '0', 10);
        failures += parseInt(suite.failures?.[0] || '0', 10);
        errors += parseInt(suite.errors?.[0] || '0', 10);
        skipped += parseInt(suite.skipped?.[0] || '0', 10);
        duration += parseFloat(suite.time?.[0] || '0') * 1000;

        const testcases = suite.testcase || [];
        for (const tc of testcases) {
            if (tc.failure) {
                failedNames.push(tc.name?.[0] || 'unknown');
            }
        }
    }

    const passes = tests - (failures + errors + skipped);
    const passPercent = tests > 0 ? ((passes / tests) * 100).toFixed(2) : '0.00';
    const now = new Date().toISOString();

    const stats = {
        suites: suites.length,
        tests,
        skipped,
        failures,
        errors,
        duration,
        start: now,
        end: now,
        passes,
        passPercent,
    };

    let statsFieldValue = `
| Key | Value |
|:---|:---|
| Passing Rate | ${stats.passPercent}% |
| Duration | ${(stats.duration / (60 * 1000)).toFixed(4)} mins |
| Tests | ${stats.tests} |
| :white_check_mark: Passed | ${stats.passes} |
| :x: Failed | ${stats.failures} |
| :fast_forward: Skipped | ${stats.skipped} |
`;

    if (failedNames.length > 0) {
        const maxShow = 5;
        const display = failedNames.length > maxShow
            ? [...failedNames.slice(0, maxShow - 1).map((f) => `- ${f}`), '- more...']
            : failedNames.map((f) => `- ${f}`);
        statsFieldValue += '###### Failed Tests:\n' + display.join('\n');
    }

    return {stats, statsFieldValue};
}

module.exports = {parseMaestroReport};
