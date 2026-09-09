// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/tsio-channel-notify-rollup.test.js`.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {
    bucketIdentity,
    mergeDetails,
    collectPerJobCounts,
} = require('./tsio-channel-notify-rollup');

const BASE_URL = 'https://test-io.test.mattermost.com';

const identityFor = (job) => ({
    repository: 'mattermost/mattermost-mobile',
    branch: 'refs/heads/main',
    commit_sha: 'a1b2c3d4e5f6',
    gh_run_id: '30424009936',
    name: `mobile-main-${job}`,
    run_group: `mobile-main-${job}`,
});

describe('tsio-channel-notify-rollup', () => {
    describe('bucketIdentity', () => {
        it('collapses a per-job group name to its routing bucket', () => {
            const rollup = bucketIdentity(identityFor('detox-ios'));
            assert.equal(rollup.name, 'mobile-main');
            assert.equal(rollup.run_group, 'mobile-main');
            assert.equal(rollup.commit_sha, 'a1b2c3d4e5f6');
        });
    });

    describe('mergeDetails', () => {
        it('sums stats, concatenates reports, and stays pending on a missing group', () => {
            const merged = mergeDetails([
                {
                    status: 'completed',
                    test_stats: {passed: 10, failed: 0, skipped: 2, flaky: 1},
                    reports: [{id: 'r1', gh_job_name: 'detox-ios', status: 'complete'}],
                },
                null,
            ]);
            assert.equal(merged.status, 'pending');
            assert.deepEqual(merged.test_stats, {passed: 10, failed: 0, skipped: 2, flaky: 1, total: 13});
            assert.equal(merged.reports.length, 1);
        });

        it('reports incomplete when every group is terminal but tests failed', () => {
            const merged = mergeDetails([
                {status: 'completed', test_stats: {passed: 5, failed: 0}, reports: []},
                {status: 'incomplete', test_stats: {passed: 4, failed: 1}, reports: []},
            ]);
            assert.equal(merged.status, 'incomplete');
            assert.equal(merged.test_stats.failed, 1);
        });
    });

    describe('collectPerJobCounts', () => {
        it('queries the consolidated view once per job identity and merges the counts', async () => {
            const seenNames = [];
            const counts = await collectPerJobCounts({
                baseUrl: BASE_URL,
                results: [
                    {identity: identityFor('detox-ios'), detail: {reports: [{id: 'r1', gh_job_name: 'detox-ios'}]}},
                    {identity: identityFor('detox-android'), detail: {reports: [{id: 'r2', gh_job_name: 'detox-android'}]}},
                ],
                fetchCounts: (baseUrl, identity) => {
                    assert.equal(baseUrl, BASE_URL);
                    seenNames.push(identity.name);
                    const job = identity.name.replace('mobile-main-', '');
                    return Promise.resolve({[job]: {passed: 10, failed: 1, skipped: 2, flaky: 0}});
                },
            });

            assert.deepEqual(seenNames, ['mobile-main-detox-ios', 'mobile-main-detox-android']);
            assert.deepEqual(counts, {
                'detox-ios': {passed: 10, failed: 1, skipped: 2, flaky: 0},
                'detox-android': {passed: 10, failed: 1, skipped: 2, flaky: 0},
            });
        });

        it('skips groups that never reported and tolerates a failed fetch', async () => {
            const warnings = [];
            const counts = await collectPerJobCounts({
                baseUrl: BASE_URL,
                results: [
                    {identity: identityFor('detox-ios'), detail: null},
                    {identity: identityFor('detox-android'), detail: {reports: []}},
                    {identity: identityFor('detox-ipad'), detail: {reports: []}},
                ],
                fetchCounts: (baseUrl, identity) => {
                    if (identity.name === 'mobile-main-detox-android') {
                        return Promise.reject(new Error('consolidated fetch failed: 500'));
                    }
                    return Promise.resolve({'detox-ipad': {passed: 3, failed: 0, skipped: 0, flaky: 1}});
                },
                warn: (msg) => warnings.push(msg),
            });

            assert.deepEqual(counts, {'detox-ipad': {passed: 3, failed: 0, skipped: 0, flaky: 1}});
            assert.equal(warnings.length, 1);
            assert.match(warnings[0], /mobile-main-detox-android/);
        });
    });
});
