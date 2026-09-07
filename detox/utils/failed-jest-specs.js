// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console -- CI utility script */

/**
 * Android CI retry helper: list specs to re-run after a failed shard, and merge
 * attempt-1 + attempt-2 Jest JSON so TSIO still sees the full shard.
 */

const fs = require('fs');
const path = require('path');

const {parseArgs} = require('./cli-args');

/**
 * Canonical key so repo-relative matrix paths and Jest's absolute `name` match.
 *
 * @param {string} filePath
 * @returns {string}
 */
function specKey(filePath) {
    const n = String(filePath || '').replace(/\\/g, '/');
    const detoxIdx = n.indexOf('detox/e2e/test/');
    if (detoxIdx >= 0) {
        return n.slice(detoxIdx);
    }
    const e2eIdx = n.indexOf('e2e/test/');
    if (e2eIdx >= 0) {
        return n.slice(e2eIdx);
    }
    return n.replace(/^\.\//, '');
}

/**
 * @param {object} suite
 * @returns {string}
 */
function suitePath(suite) {
    return suite?.testFilePath || suite?.name || '';
}

/**
 * @param {object} suite
 * @returns {boolean}
 */
function suiteFailed(suite) {
    if (!suite || typeof suite !== 'object') {
        return true;
    }
    if (suite.status === 'failed') {
        return true;
    }
    if (typeof suite.numFailingTests === 'number' && suite.numFailingTests > 0) {
        return true;
    }
    const cases = suite.assertionResults || suite.testResults || [];
    return cases.some((c) => c && c.status === 'failed');
}

/**
 * Specs from the shard that failed or never appeared in the Jest report.
 * Missing report → retry the whole shard (crash / timeout before JSON).
 *
 * @param {string} resultsPath
 * @param {string[]} shardSpecs
 * @returns {string[]}
 */
function listRetrySpecs(resultsPath, shardSpecs) {
    const specs = (shardSpecs || []).filter(Boolean);
    if (!resultsPath || !fs.existsSync(resultsPath)) {
        return specs;
    }

    let report;
    try {
        report = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    } catch {
        return specs;
    }

    const suites = Array.isArray(report.testResults) ? report.testResults : [];
    if (suites.length === 0) {
        return specs;
    }

    const byKey = new Map();
    for (const suite of suites) {
        const key = specKey(suitePath(suite));
        if (key) {
            byKey.set(key, suite);
        }
    }

    const retry = [];
    const seen = new Set();
    for (const spec of specs) {
        const key = specKey(spec);
        seen.add(key);
        const suite = byKey.get(key);
        if (!suite || suiteFailed(suite)) {
            retry.push(spec);
        }
    }

    // Failed suites not in the original matrix (shouldn't happen) still retry.
    for (const [key, suite] of byKey) {
        if (!seen.has(key) && suiteFailed(suite)) {
            retry.push(suitePath(suite));
        }
    }
    return retry;
}

/**
 * Later Jest JSON wins for the same spec. Keeps CLI shape (`name` + suites)
 * so merge-jest-results-for-tsio can ingest the result.
 *
 * @param {string[]} inputPaths
 * @returns {object}
 */
function mergeJestResultsPreferLater(inputPaths) {
    const byKey = new Map();
    for (const inputPath of inputPaths) {
        if (!inputPath || !fs.existsSync(inputPath)) {
            continue;
        }
        let report;
        try {
            report = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        } catch {
            continue;
        }
        const suites = Array.isArray(report.testResults) ? report.testResults : [];
        for (const suite of suites) {
            const key = specKey(suitePath(suite));
            if (key) {
                byKey.set(key, suite);
            }
        }
    }

    const testResults = [...byKey.values()];
    let numFailedTests = 0;
    let numPassedTests = 0;
    for (const suite of testResults) {
        const cases = suite.assertionResults || suite.testResults || [];
        for (const c of cases) {
            if (c?.status === 'failed') {
                numFailedTests += 1;
            } else if (c?.status === 'passed') {
                numPassedTests += 1;
            }
        }
    }

    return {
        success: numFailedTests === 0 && testResults.length > 0,
        numFailedTests,
        numPassedTests,
        testResults,
    };
}

function main() {
    const args = parseArgs(process.argv);

    if (args.output) {
        const inputs = [args.attempt1, args.attempt2].filter(Boolean);
        if (inputs.length === 0) {
            console.error('failed-jest-specs: --attempt1 and/or --attempt2 required with --output');
            process.exit(1);
        }
        const merged = mergeJestResultsPreferLater(inputs);
        fs.mkdirSync(path.dirname(args.output), {recursive: true});
        const tmp = `${args.output}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(merged));
        fs.renameSync(tmp, args.output);
        console.log(`Merged ${inputs.length} attempt JSON(s) -> ${merged.testResults.length} suite(s) -> ${args.output}`);
        return;
    }

    const shardSpecs = (args['shard-specs'] || '').split(/\s+/).filter(Boolean);
    const retry = listRetrySpecs(args.results, shardSpecs);
    for (const spec of retry) {
        console.log(spec);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    specKey,
    suiteFailed,
    listRetrySpecs,
    mergeJestResultsPreferLater,
};
