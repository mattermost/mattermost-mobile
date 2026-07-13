#!/usr/bin/env node
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Minimal passing test-results file for TSIO context smoke tests.

import fs from 'fs';
import path from 'path';

function parseArgs(argv) {
    const out = {};
    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg.startsWith('--')) continue;
        const key = arg.slice(2);
        if (key.includes('=')) {
            const idx = key.indexOf('=');
            out[key.slice(0, idx)] = key.slice(idx + 1);
        } else {
            const next = argv[i + 1];
            if (next === undefined || next.startsWith('--')) {
                out[key] = 'true';
            } else {
                out[key] = next;
                i++;
            }
        }
    }
    return out;
}

function writeJestPassStub(outputPath, jobName) {
    const payload = {
        numFailedTestSuites: 0,
        numFailedTests: 0,
        numPassedTestSuites: 1,
        numPassedTests: 1,
        numPendingTestSuites: 0,
        numPendingTests: 0,
        numRuntimeErrorTestSuites: 0,
        numTodoTests: 0,
        numTotalTestSuites: 1,
        numTotalTests: 1,
        openHandles: [],
        snapshot: {added: 0, didUpdate: false, failure: false, filesAdded: 0, filesRemoved: 0, filesRemovedList: [], filesUnmatched: 0, filesUpdated: 0, matched: 0, total: 0, unchecked: 0, uncheckedKeysByFile: [], unmatched: 0, updated: 0},
        startTime: Date.now(),
        success: true,
        testResults: [{
            assertionResults: [{
                ancestorTitles: [],
                duration: 1,
                failureDetails: [],
                failureMessages: [],
                fullName: `${jobName} — TSIO context smoke stub`,
                invocations: 1,
                location: null,
                numPassingAsserts: 1,
                retryReasons: [],
                status: 'passed',
                title: 'TSIO context smoke stub',
            }],
            endTime: Date.now(),
            message: '',
            name: jobName,
            startTime: Date.now(),
            status: 'passed',
            summary: '',
        }],
        wasInterrupted: false,
    };
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
}

function writeJunitPassStub(outputPath, jobName) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${jobName}" tests="1" failures="0" errors="0" skipped="0" time="0.001">
  <testsuite name="${jobName}" tests="1" failures="0" errors="0" skipped="0" time="0.001">
    <testcase classname="${jobName}" name="TSIO context smoke stub" time="0.001"/>
  </testsuite>
</testsuites>
`;
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, xml);
}

const args = parseArgs(process.argv);
const format = args.format || 'jest';
const output = args.output;
const jobName = args['job-name'] || 'smoke-shard';

if (!output) {
    console.error('write-tsio-pass-stub: --output is required');
    process.exit(1);
}

if (format === 'junit') {
    writeJunitPassStub(output, jobName);
} else {
    writeJestPassStub(output, jobName);
}

console.log(`Wrote ${format} pass stub -> ${output}`);
