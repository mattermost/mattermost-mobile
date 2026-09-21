// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {generateShortSummary, getAllTestsFromJestResults} = require('./report');

describe('getAllTestsFromJestResults', () => {
    it('deduplicates retries, gives failures precedence, and preserves matching names in different files', () => {
        const report = {
            testResults: [
                {
                    testFilePath: 'first.e2e.ts',
                    perfStats: {start: 1000},
                    testResults: [
                        {fullName: 'passes once', status: 'passed', duration: 100},
                        {fullName: 'duplicate result', status: 'passed', duration: 200},
                        {fullName: 'skipped test', status: 'pending', duration: 0},
                    ],
                },
                {
                    testFilePath: 'first.e2e.ts',
                    perfStats: {start: 2000},
                    testResults: [
                        {fullName: 'duplicate result', status: 'failed', duration: 300, failureMessages: ['failed later']},
                    ],
                },
                {
                    testFilePath: 'second.e2e.ts',
                    testResults: [
                        {fullName: 'duplicate result', status: 'passed', duration: 500},
                        {fullName: 'another pass', status: 'passed', duration: 400},
                    ],
                },
            ],
        };

        const allTests = getAllTestsFromJestResults(report);
        const summary = generateShortSummary(allTests);

        assert.equal(summary.stats.tests, 5);
        assert.equal(summary.stats.passes, 3);
        assert.equal(summary.stats.failures, 1);
        assert.equal(summary.stats.skipped, 1);
        assert.equal(summary.stats.passPercent, '60.00');
        assert.equal(summary.stats.suites, 2);
    });
});
