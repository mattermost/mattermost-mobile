// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/tsio-channel-notify-rollup.test.js`.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {describe, it} = require('node:test');

const {
    bucketIdentity,
    mergeDetails,
    collectPerJobCounts,
    collectFailures,
    loadTriageFindings,
    findChangesSinceLastRun,
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

        describe('collectFailures', () => {
            it('merges failures across jobs and tolerates a failed fetch', async () => {
                const warnings = [];
                const failures = await collectFailures({
                    baseUrl: BASE_URL,
                    results: [
                        {identity: identityFor('detox-ios'), detail: null},
                        {identity: identityFor('detox-android'), detail: {reports: []}},
                        {identity: identityFor('detox-ipad'), detail: {reports: []}},
                    ],
                    fetchFailures: (baseUrl, identity) => {
                        if (identity.name === 'mobile-main-detox-android') {
                            return Promise.reject(new Error('consolidated fetch failed: 500'));
                        }
                        return Promise.resolve([{job: 'detox-ipad', title: 'MM-T9 - case', error: 'boom', previousStatuses: [], passedOnRetry: false}]);
                    },
                    warn: (msg) => warnings.push(msg),
                });
                assert.equal(failures.length, 1);
                assert.equal(failures[0].title, 'MM-T9 - case');
                assert.equal(warnings.length, 1);
            });
        });

        describe('collectPerJobCounts', () => {
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

    describe('loadTriageFindings', () => {
        it('reads each run\'s schema 2 findings file and skips anything else', () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'triage-findings-'));
            fs.mkdirSync(path.join(dir, 'e2e-triage-findings-detox-android'));
            fs.writeFileSync(path.join(dir, 'e2e-triage-findings-detox-android', 'e2e-triage-findings.json'), JSON.stringify({schema: 2, lane: 'detox-android', findings: [], counts: {flaky: 4}}));
            fs.mkdirSync(path.join(dir, 'e2e-triage-findings-detox-ios'));
            fs.writeFileSync(path.join(dir, 'e2e-triage-findings-detox-ios', 'e2e-triage-findings.json'), JSON.stringify({schema: 1, findings: []}));
            fs.writeFileSync(path.join(dir, 'broken.json'), '{');
            const warnings = [];
            const loaded = loadTriageFindings(dir, (msg) => warnings.push(msg));
            assert.deepEqual(loaded.map((f) => f.lane), ['detox-android']);
            assert.equal(warnings.length, 2);
            assert.deepEqual(loadTriageFindings(path.join(dir, 'missing')), [], 'no findings when no run failed');
        });
    });

    describe('findChangesSinceLastRun', () => {
        const identity = {repository: 'mattermost/mattermost-mobile', name: 'mobile-main-maestro-android-e2e', branch: 'main', commit_sha: 'cccc'};
        const reports = [
            {commit: 'cccc', branch: 'main', created_at: '2026-10-28T21:43:46Z'},
            {commit: 'bbbb', branch: 'main', created_at: '2026-10-27T07:04:03Z'},
            {commit: 'aaaa', branch: 'main', created_at: '2026-10-27T06:59:31Z'},
            {commit: 'dddd', branch: 'release-2.35', created_at: '2026-10-28T10:00:00Z'},
        ];
        const fetchFor = (compare) => async (url) => {
            if (url.startsWith(BASE_URL)) {
                return {ok: true, json: async () => ({reports})};
            }
            assert.equal(url, 'https://api.github.com/repos/mattermost/mattermost-mobile/compare/bbbb...cccc', 'from the previous run on the same branch');
            return compare;
        };

        it('lists the PRs merged between the previous run and this one', async () => {
            const compare = {ok: true,
                json: async () => ({commits: [
                    {commit: {message: '[MM-71089] Log websocket client creation errors (#10266)\n\nbody'}},
                    {commit: {message: 'Merge branch main'}},
                ]})};
            assert.deepEqual(await findChangesSinceLastRun({baseUrl: BASE_URL, identity, fetchImpl: fetchFor(compare)}), {
                from: 'bbbb',
                to: 'cccc',
                prs: [{number: 10266, title: '[MM-71089] Log websocket client creation errors'}],
                partial: false,
            });
        });

        it('finds a previous run of the same commit, and then no change was merged', async () => {
            const again = [{commit: 'cccc', branch: 'main', created_at: '2026-10-28T23:10:00Z'}, ...reports];
            const fetchImpl = async (url) => {
                assert.ok(url.startsWith(BASE_URL), 'no compare for the same commit');
                return {ok: true, json: async () => ({reports: again})};
            };
            assert.deepEqual(await findChangesSinceLastRun({baseUrl: BASE_URL, identity, fetchImpl}), {from: 'cccc', to: 'cccc', prs: []});
        });

        it('selects the current report by run ID and attempt when another dispatch has the same commit', async () => {
            const currentIdentity = {...identity, gh_run_id: 'current-run', gh_run_attempt: '2'};
            const listedReports = [
                {commit: 'cccc', branch: 'main', created_at: '2026-10-28T23:10:00Z', gh_run_id: 'other-run', gh_run_attempt: '1'},
                {commit: 'cccc', branch: 'main', created_at: '2026-10-28T22:50:00Z', gh_run_id: 'current-run', gh_run_attempt: '1'},
                {commit: 'cccc', branch: 'main', created_at: '2026-10-28T22:10:00Z', gh_run_id: 'current-run', gh_run_attempt: '2'},
                {commit: 'bbbb', branch: 'main', created_at: '2026-10-28T21:10:00Z', gh_run_id: 'previous-run', gh_run_attempt: '1'},
            ];
            let compared = false;
            const fetchImpl = async (url) => {
                if (url.startsWith(BASE_URL)) {
                    return {ok: true, json: async () => ({reports: listedReports})};
                }
                compared = true;
                assert.equal(url, 'https://api.github.com/repos/mattermost/mattermost-mobile/compare/bbbb...cccc');
                return {ok: true, json: async () => ({commits: []})};
            };

            const changes = await findChangesSinceLastRun({baseUrl: BASE_URL, identity: currentIdentity, fetchImpl});
            assert.equal(compared, true);
            assert.deepEqual(changes, {from: 'bbbb', to: 'cccc', prs: [], partial: false});
        });

        it('does not take an earlier attempt of the same run as the previous run', async () => {
            const currentIdentity = {...identity, gh_run_id: 'current-run', gh_run_attempt: '2'};
            const attempt2 = {commit: 'cccc', branch: 'main', created_at: '2026-10-28T23:10:00Z', gh_run_id: 'current-run', gh_run_attempt: '2'};
            const attempt1 = {commit: 'cccc', branch: 'main', created_at: '2026-10-28T22:10:00Z', gh_run_id: 'current-run', gh_run_attempt: '1'};
            const previous = {commit: 'bbbb', branch: 'main', created_at: '2026-10-28T21:10:00Z', gh_run_id: 'previous-run', gh_run_attempt: '1'};
            const fetchFrom = (listedReports) => async (url) => {
                if (url.startsWith(BASE_URL)) {
                    return {ok: true, json: async () => ({reports: listedReports})};
                }
                assert.equal(url, 'https://api.github.com/repos/mattermost/mattermost-mobile/compare/bbbb...cccc');
                return {ok: true, json: async () => ({commits: [{commit: {message: 'Fix login (#10300)'}}]})};
            };
            const expected = {from: 'bbbb', to: 'cccc', prs: [{number: 10300, title: 'Fix login'}], partial: false};

            // Attempt 2 has reported.
            assert.deepEqual(await findChangesSinceLastRun({baseUrl: BASE_URL, identity: currentIdentity, fetchImpl: fetchFrom([attempt2, attempt1, previous])}), expected);

            // Attempt 2 has not reported yet.
            assert.deepEqual(await findChangesSinceLastRun({baseUrl: BASE_URL, identity: currentIdentity, fetchImpl: fetchFrom([attempt1, previous])}), expected);
        });

        it('uses the latest same-commit report as the previous run when the current run is missing', async () => {
            const currentIdentity = {...identity, gh_run_id: 'missing-run', gh_run_attempt: '1'};
            const listedReports = [
                {commit: 'cccc', branch: 'main', created_at: '2026-10-28T23:10:00Z', gh_run_id: 'previous-run', gh_run_attempt: '1'},
                {commit: 'bbbb', branch: 'main', created_at: '2026-10-28T21:10:00Z', gh_run_id: 'older-run', gh_run_attempt: '1'},
            ];
            const fetchImpl = async (url) => {
                assert.ok(url.startsWith(BASE_URL), 'no compare when the previous report has the same commit');
                return {ok: true, json: async () => ({reports: listedReports})};
            };

            assert.deepEqual(await findChangesSinceLastRun({baseUrl: BASE_URL, identity: currentIdentity, fetchImpl}), {from: 'cccc', to: 'cccc', prs: []});
        });

        it('says when GitHub lists only some of the commits merged', async () => {
            const compare = {ok: true, json: async () => ({total_commits: 300, commits: [{commit: {message: 'Fix login (#10300)'}}]})};
            const changes = await findChangesSinceLastRun({baseUrl: BASE_URL, identity, fetchImpl: fetchFor(compare)});
            assert.equal(changes.partial, true);
        });

        it('is unknown when GitHub cannot compare the two commits', async () => {
            assert.equal(await findChangesSinceLastRun({baseUrl: BASE_URL, identity, fetchImpl: fetchFor({ok: false})}), null);
        });
    });
});
