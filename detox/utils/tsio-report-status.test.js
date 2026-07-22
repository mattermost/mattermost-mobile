// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/tsio-report-status.test.js`.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {
    buildDisplayReportUrl,
    decideStatus,
    decideTargetUrl,
} = require('./tsio-report-status');

describe('tsio-report-status', () => {
    describe('decideStatus', () => {
        it('returns success for completed report with no failures when upstream succeeded', () => {
            assert.deepEqual(
                decideStatus(
                    {status: 'completed', test_stats: {passed: 10, failed: 0, skipped: 2}},
                    true,
                ),
                {
                    state: 'success',
                    description: '10 passed, 2 skipped',
                    both_terminal: true,
                    timed_out: false,
                },
            );
        });

        it('returns failure for completed report with failures', () => {
            assert.deepEqual(
                decideStatus(
                    {status: 'completed', test_stats: {passed: 8, failed: 2, skipped: 1}},
                    true,
                ),
                {
                    state: 'failure',
                    description: '8 passed, 2 failed, 1 skipped',
                    both_terminal: true,
                    timed_out: false,
                },
            );
        });

        it('returns failure for incomplete terminal status even with zero failures', () => {
            assert.deepEqual(
                decideStatus(
                    {status: 'incomplete', test_stats: {passed: 5, failed: 0, skipped: 0}},
                    true,
                ),
                {
                    state: 'failure',
                    description: 'Report incomplete — 5 passed, 0 skipped',
                    both_terminal: true,
                    timed_out: false,
                },
            );
        });

        it('uses timeout path for non-terminal status', () => {
            assert.deepEqual(
                decideStatus({status: 'processing', test_stats: {passed: 1, failed: 0}}, true),
                {
                    state: 'success',
                    description: 'TSIO poll timed out (status=processing) — using CI job status',
                    both_terminal: false,
                    timed_out: true,
                },
            );
        });

        it('overrides pass when upstreamSucceeded is false on completed clean report', () => {
            assert.deepEqual(
                decideStatus(
                    {status: 'completed', test_stats: {passed: 10, failed: 0, skipped: 0}},
                    false,
                ),
                {
                    state: 'failure',
                    description: '10 passed, 0 skipped',
                    both_terminal: true,
                    timed_out: false,
                },
            );
        });

        it('returns failure on timeout when upstreamSucceeded is false', () => {
            assert.equal(
                decideStatus({status: 'pending'}, false).state,
                'failure',
            );
            assert.equal(decideStatus({status: 'pending'}, false).timed_out, true);
        });
    });

    describe('decideTargetUrl', () => {
        const display = 'https://test-io.test.mattermost.com/reports/mattermost-mobile/main/abc1234/mobile-pr';
        const runUrl = 'https://github.com/mattermost/mattermost-mobile/actions/runs/99';

        it('returns TSIO URL with gid when both terminal and success', () => {
            assert.equal(
                decideTargetUrl('success', true, display, 'gid-1', runUrl, {
                    failed: 0,
                    reportStatus: 'completed',
                }),
                `${display}?gid=gid-1`,
            );
        });

        it('returns TSIO URL when tests failed but report uploaded', () => {
            assert.equal(
                decideTargetUrl('failure', true, display, 'gid-1', runUrl, {
                    failed: 187,
                    reportStatus: 'completed',
                    upstreamSucceeded: false,
                }),
                `${display}?gid=gid-1`,
            );
        });

        it('returns TSIO URL for incomplete terminal report', () => {
            assert.equal(
                decideTargetUrl('failure', true, display, 'gid-1', runUrl, {
                    failed: 0,
                    reportStatus: 'incomplete',
                    upstreamSucceeded: true,
                }),
                `${display}?gid=gid-1`,
            );
        });

        it('returns run URL when CI failed outside tests with a clean completed report', () => {
            assert.equal(
                decideTargetUrl('failure', true, display, 'gid-1', runUrl, {
                    failed: 0,
                    reportStatus: 'completed',
                    upstreamSucceeded: false,
                }),
                runUrl,
            );
        });

        it('returns run URL when not both terminal', () => {
            assert.equal(
                decideTargetUrl('success', false, display, 'gid-1', runUrl),
                runUrl,
            );
        });

        it('returns run URL when report id is missing', () => {
            assert.equal(
                decideTargetUrl('failure', true, display, null, runUrl, {
                    failed: 2,
                    reportStatus: 'completed',
                }),
                runUrl,
            );
        });
    });

    describe('buildDisplayReportUrl', () => {
        const base = 'https://test-io.test.mattermost.com';

        it('strips refs/heads/ and encodes path slashes as ~', () => {
            assert.equal(
                buildDisplayReportUrl(base, {
                    repository: 'mattermost/mattermost-mobile',
                    branch: 'refs/heads/feat/tsio-mobile',
                    commit_sha: 'abcdef1234567890',
                    name: 'mobile-pr',
                }),
                `${base}/reports/mattermost-mobile/feat~tsio-mobile/abcdef1/mobile-pr`,
            );
        });

        it('prefers run_group over name', () => {
            assert.equal(
                buildDisplayReportUrl(base, {
                    repository: 'mattermost/mattermost-mobile',
                    branch: 'main',
                    commit_sha: 'deadbeef',
                    name: 'detox-ios',
                    run_group: 'mobile-pr',
                }),
                `${base}/reports/mattermost-mobile/main/deadbee/mobile-pr`,
            );
        });

        it('falls back to name when run_group is absent', () => {
            assert.equal(
                buildDisplayReportUrl(base, {
                    repository: 'mattermost/mattermost-mobile',
                    branch: 'main',
                    commit_sha: 'deadbeef',
                    name: 'cmt-mobile',
                }),
                `${base}/reports/mattermost-mobile/main/deadbee/cmt-mobile`,
            );
        });
    });
});
