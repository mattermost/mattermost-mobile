#!/usr/bin/env node
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Writes a minimal valid test-results file when a CI leg dies before the
// real reporter output exists, so TSIO still receives a shard entry.

import fs from 'fs';
import path from 'path';
import {createRequire} from 'module';

const {parseArgs} = createRequire(import.meta.url)('./cli-args.js');

function writeJestStub(outputPath, jobName, reason) {
    // Shape must match TSIO extractDetox (testFilePath + nested testResults),
    // not Jest CLI (name + assertionResults).
    const now = Date.now();
    const payload = {
        testResults: [{
            testFilePath: `ci/${jobName}.stub`,
            perfStats: {start: now},
            testResults: [{
                ancestorTitles: [jobName],
                duration: 0,
                failureMessages: [reason],
                fullName: `${jobName} — job failed before test JSON was written`,
                status: 'failed',
                title: 'CI infrastructure failure',
            }],
        }],
    };
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
}

function escapeXml(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function writeJunitStub(outputPath, jobName, reason) {
    const safeName = escapeXml(jobName);
    const escaped = escapeXml(reason);
    const filePath = escapeXml(`ci/${jobName}.stub`);
    // `file` is read by TSIO extractMaestro into suite FilePath (avoids "Missing file path").
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${safeName}" tests="1" failures="1" errors="0" skipped="0" time="0">
  <testsuite name="${safeName}" tests="1" failures="1" errors="0" skipped="0" time="0">
    <testcase classname="${safeName}" name="CI infrastructure failure" file="${filePath}" time="0">
      <failure message="job failed before report was written">${escaped}</failure>
    </testcase>
  </testsuite>
</testsuites>
`;
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, xml);
}

const args = parseArgs(process.argv);
const format = args.format || 'jest';
const output = args.output;
const jobName = args['job-name'] || 'unknown-shard';
const reason = args.reason || 'Job failed or was cancelled before test results were written';

if (!output) {
    console.error('write-tsio-failure-stub: --output is required');
    process.exit(1);
}

if (format === 'junit') {
    writeJunitStub(output, jobName, reason);
} else {
    writeJestStub(output, jobName, reason);
}

console.log(`Wrote ${format} failure stub -> ${output}`);
