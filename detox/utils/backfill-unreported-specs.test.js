// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {backfillUnreportedSpecs, parseSpecList, reportedPaths} = require('./backfill-unreported-specs');

// The five specs iOS machine-4 was handed on main d943628 (run 34884299661).
const MACHINE_4_SPECS = [
    'detox/e2e/test/products/channels/account/edit_profile.e2e.ts',
    'detox/e2e/test/products/channels/account/set_status.e2e.ts',
    'detox/e2e/test/products/channels/channels/channel_bookmarks.e2e.ts',
    'detox/e2e/test/products/channels/channels/find_channels.e2e.ts',
    'detox/e2e/test/products/channels/messaging/file_upload.e2e.ts',
];

// jest-stare had flushed only the two suites that finished before the kill, with
// the absolute CI paths a real shard report carries.
const partialReport = () => ({
    numTotalTestSuites: 2,
    numFailedTestSuites: 0,
    numTotalTests: 4,
    numFailedTests: 0,
    success: true,
    testResults: [
        {
            name: '/Users/runner/work/mattermost-mobile/mattermost-mobile/detox/e2e/test/products/channels/account/edit_profile.e2e.ts',
            status: 'passed',
            assertionResults: [{title: 'MM-T4989_1', status: 'passed'}],
        },
        {
            name: '/Users/runner/work/mattermost-mobile/mattermost-mobile/detox/e2e/test/products/channels/account/set_status.e2e.ts',
            status: 'passed',
            assertionResults: [{title: 'MM-T3251', status: 'passed'}],
        },
    ],
});

describe('backfillUnreportedSpecs', () => {
    it('should mark the three specs that never ran as failed instead of dropping them', () => {
        const {added, results} = backfillUnreportedSpecs(partialReport(), MACHINE_4_SPECS, {jobName: 'machine-4', now: 1});

        assert.deepEqual(added, [
            'detox/e2e/test/products/channels/channels/channel_bookmarks.e2e.ts',
            'detox/e2e/test/products/channels/channels/find_channels.e2e.ts',
            'detox/e2e/test/products/channels/messaging/file_upload.e2e.ts',
        ]);
        assert.equal(results.testResults.length, 5, 'every assigned spec must appear in the report');
        assert.equal(results.success, false, 'a shard that skipped specs must not report success');
        assert.equal(results.numFailedTestSuites, 3);
        assert.equal(results.numTotalTestSuites, 5);
    });

    it('should match an absolute CI path against the repo-relative spec the matrix passed', () => {
        const {added} = backfillUnreportedSpecs(partialReport(), [MACHINE_4_SPECS[0]], {now: 1});
        assert.deepEqual(added, [], 'edit_profile reported under an absolute path and must not be re-added');
    });

    it('should not touch a complete report', () => {
        const complete = partialReport();
        const {added, results} = backfillUnreportedSpecs(complete, MACHINE_4_SPECS.slice(0, 2), {now: 1});
        assert.deepEqual(added, []);
        assert.equal(results.success, true);
        assert.equal(results.numTotalTestSuites, 2);
    });

    it('should mark every spec failed when the report has no suites at all', () => {
        const {added, results} = backfillUnreportedSpecs({testResults: []}, MACHINE_4_SPECS, {jobName: 'machine-4', now: 1});
        assert.equal(added.length, 5);
        assert.equal(results.numFailedTests, 5);
        assert.equal(results.testResults[0].assertionResults[0].status, 'failed');
        assert.match(results.testResults[0].assertionResults[0].failureMessages[0], /produced no result/);
    });

    it('should not be fooled by a spec whose name is a suffix of another', () => {
        const report = {
            testResults: [{name: '/ci/detox/e2e/test/products/channels/messaging/edit_post.e2e.ts', status: 'passed'}],
        };
        const {added} = backfillUnreportedSpecs(report, ['detox/e2e/test/products/channels/messaging/post.e2e.ts'], {now: 1});
        assert.deepEqual(added, ['detox/e2e/test/products/channels/messaging/post.e2e.ts']);
    });
});

describe('parseSpecList', () => {
    it('should split the space-separated matrix value and drop padding', () => {
        assert.deepEqual(parseSpecList('  a.e2e.ts   b.e2e.ts '), ['a.e2e.ts', 'b.e2e.ts']);
        assert.deepEqual(parseSpecList(''), []);
    });
});

describe('reportedPaths', () => {
    it('should read both the Jest CLI key and the TSIO key', () => {
        assert.deepEqual(
            reportedPaths({testResults: [{name: 'a.e2e.ts'}, {testFilePath: 'b.e2e.ts'}, {}]}),
            ['a.e2e.ts', 'b.e2e.ts'],
        );
    });
});
