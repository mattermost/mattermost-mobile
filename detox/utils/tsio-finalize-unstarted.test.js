// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/tsio-finalize-unstarted.test.js`.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {buildTsioJobConfigMap, jobKeysForPlatform} = require('./build-tsio-job-config');
const {affectedJobKeys, finalizeUnstartedLanes, planUnstartedFinalizations, readE2eOverrideLabel} = require('./tsio-finalize-unstarted');

const REPO = 'mattermost/mattermost-mobile';
const RUN_ID = '9001';
const RUN_URL = `https://github.com/${REPO}/actions/runs/${RUN_ID}`;
const OTHER_URL = `https://github.com/${REPO}/actions/runs/8888`;

const baseIdentity = {
    repository: REPO,
    commit_sha: 'abc1234',
    gh_run_id: RUN_ID,
    gh_run_attempt: '1',
    branch: 'feat',
    name: 'mobile-pr',
    run_group: 'mobile-pr',
    gh_pr_number: '10364',
    framework: 'detox',
};

const ALL_CONFIGS = buildTsioJobConfigMap(baseIdentity, jobKeysForPlatform('both'));

const pendingRows = (configs = ALL_CONFIGS, targetUrl = RUN_URL) => Object.values(configs).map((cfg) => ({
    context: cfg.status_context,
    state: 'pending',
    target_url: targetUrl,
}));

describe('tsio-finalize-unstarted', () => {
    describe('affectedJobKeys', () => {
        it('maps build-ios-simulator failure to detox-ios, detox-ipad, and maestro-ios-e2e', () => {
            const affected = affectedJobKeys({
                'provision-servers': 'success',
                'validate-maestro-flow-headers': 'success',
                'build-ios-simulator': 'failure',
                'build-android-apk': 'success',
                'build-android-apk-maestro': 'success',
            }, ALL_CONFIGS);

            assert.deepEqual(
                affected.map((a) => a.key),
                ['detox-ios', 'detox-ipad', 'maestro-ios-e2e'],
            );
            assert.deepEqual(
                affected.map((a) => a.config.status_context),
                ['e2e-test/detox-ios', 'e2e-test/detox-ipad', 'e2e-test/maestro-ios'],
            );
        });

        it('maps build-android-apk failure only to detox-android', () => {
            const affected = affectedJobKeys({
                'provision-servers': 'success',
                'validate-maestro-flow-headers': 'success',
                'build-ios-simulator': 'success',
                'build-android-apk': 'failure',
                'build-android-apk-maestro': 'success',
            }, ALL_CONFIGS);

            assert.deepEqual(affected.map((a) => a.key), ['detox-android']);
        });

        it('maps build-android-apk-maestro failure only to maestro-android-e2e', () => {
            const affected = affectedJobKeys({
                'provision-servers': 'success',
                'validate-maestro-flow-headers': 'success',
                'build-ios-simulator': 'success',
                'build-android-apk': 'success',
                'build-android-apk-maestro': 'failure',
            }, ALL_CONFIGS);

            assert.deepEqual(affected.map((a) => a.key), ['maestro-android-e2e']);
        });

        it('maps validate-maestro-flow-headers non-success to both maestro lanes', () => {
            const affected = affectedJobKeys({
                'provision-servers': 'success',
                'validate-maestro-flow-headers': 'failure',
                'build-ios-simulator': 'success',
                'build-android-apk': 'success',
                'build-android-apk-maestro': 'success',
            }, ALL_CONFIGS);

            assert.deepEqual(affected.map((a) => a.key), ['maestro-ios-e2e', 'maestro-android-e2e']);
        });

        it('maps provision-servers failure or skipped to all configured lanes', () => {
            for (const state of ['failure', 'skipped']) {
                const affected = affectedJobKeys({
                    'provision-servers': state,
                    'validate-maestro-flow-headers': 'success',
                    'build-ios-simulator': 'success',
                    'build-android-apk': 'success',
                    'build-android-apk-maestro': 'success',
                }, ALL_CONFIGS);

                assert.deepEqual(
                    affected.map((a) => a.key),
                    ['detox-ios', 'detox-android', 'detox-ipad', 'maestro-ios-e2e', 'maestro-android-e2e'],
                );
            }
        });

        it('treats skipped build-* jobs as non-failing (e.g. PLATFORM=android or fingerprint failure)', () => {
            const androidConfigs = buildTsioJobConfigMap(baseIdentity, jobKeysForPlatform('android'));
            const affected = affectedJobKeys({
                'provision-servers': 'success',
                'validate-maestro-flow-headers': 'success',
                'build-ios-simulator': 'skipped',
                'build-android-apk': 'skipped',
                'build-android-apk-maestro': 'skipped',
            }, androidConfigs);

            assert.deepEqual(affected, []);
        });

        it('filters affected keys to those present in jobConfigs', () => {
            const androidConfigs = buildTsioJobConfigMap(baseIdentity, jobKeysForPlatform('android'));
            const affected = affectedJobKeys({
                'provision-servers': 'success',
                'validate-maestro-flow-headers': 'failure',
                'build-ios-simulator': 'failure',
                'build-android-apk': 'success',
                'build-android-apk-maestro': 'success',
            }, androidConfigs);

            assert.deepEqual(affected.map((a) => a.key), ['maestro-android-e2e']);
        });
    });

    describe('planUnstartedFinalizations', () => {
        const upstream = {
            'provision-servers': 'success',
            'validate-maestro-flow-headers': 'success',
            'build-ios-simulator': 'failure',
            'build-android-apk': 'success',
            'build-android-apk-maestro': 'success',
        };

        it('posts failure for pending run-owned contexts affected by upstream failure', () => {
            const updates = planUnstartedFinalizations({
                jobConfigs: ALL_CONFIGS,
                upstreamResults: upstream,
                rows: pendingRows(),
                repository: REPO,
                runId: RUN_ID,
                runUrl: RUN_URL,
                e2eOverride: false,
            });

            assert.equal(updates.length, 3);
            assert.deepEqual(updates.map((u) => u.context), [
                'e2e-test/detox-ios',
                'e2e-test/detox-ipad',
                'e2e-test/maestro-ios',
            ]);
            for (const u of updates) {
                assert.equal(u.state, 'failure');
                assert.equal(u.target_url, RUN_URL);
                assert.match(u.description, /^Upstream build-ios-simulator failed; tests did not run$/);
                assert.ok(u.description.length <= 140);
            }
        });

        it('skips contexts that are already finalized, missing, or owned by another run', () => {
            const rows = [
                {context: 'e2e-test/detox-ios', state: 'success', target_url: RUN_URL},
                {context: 'e2e-test/detox-ipad', state: 'pending', target_url: OTHER_URL},

                // e2e-test/maestro-ios missing from rows
            ];
            const updates = planUnstartedFinalizations({
                jobConfigs: ALL_CONFIGS,
                upstreamResults: upstream,
                rows,
                repository: REPO,
                runId: RUN_ID,
                runUrl: RUN_URL,
            });

            assert.deepEqual(updates, []);
        });

        it('honors newest status first when older statuses for the same context were pending', () => {
            const rows = [
                {context: 'e2e-test/detox-ios', state: 'failure', target_url: RUN_URL},
                {context: 'e2e-test/detox-ios', state: 'pending', target_url: RUN_URL},
                {context: 'e2e-test/detox-ipad', state: 'pending', target_url: RUN_URL},
                {context: 'e2e-test/maestro-ios', state: 'error', target_url: RUN_URL},
            ];
            const updates = planUnstartedFinalizations({
                jobConfigs: ALL_CONFIGS,
                upstreamResults: upstream,
                rows,
                repository: REPO,
                runId: RUN_ID,
                runUrl: RUN_URL,
            });

            assert.deepEqual(updates.map((u) => u.context), ['e2e-test/detox-ipad']);
        });

        it('converts failure to success under E2E/Override', () => {
            const updates = planUnstartedFinalizations({
                jobConfigs: ALL_CONFIGS,
                upstreamResults: upstream,
                rows: pendingRows(),
                repository: REPO,
                runId: RUN_ID,
                runUrl: RUN_URL,
                e2eOverride: true,
            });

            assert.equal(updates.length, 3);
            for (const u of updates) {
                assert.equal(u.state, 'success');
                assert.ok(u.description.startsWith('E2E/Override — '));
                assert.ok(u.description.length <= 140);
            }
        });

        it('caps description at 140 characters even when multiple upstream jobs fail', () => {
            const updates = planUnstartedFinalizations({
                jobConfigs: ALL_CONFIGS,
                upstreamResults: {
                    'provision-servers': 'skipped',
                    'validate-maestro-flow-headers': 'failure',
                    'build-ios-simulator': 'failure',
                    'build-android-apk': 'failure',
                    'build-android-apk-maestro': 'failure',
                },
                rows: pendingRows(),
                repository: REPO,
                runId: RUN_ID,
                runUrl: RUN_URL,
            });

            assert.equal(updates.length, 5);
            for (const u of updates) {
                assert.ok(u.description.length <= 140);
                assert.equal(u.state, 'failure');
            }
        });
    });

    describe('finalizeUnstartedLanes', () => {
        const upstream = {
            'provision-servers': 'success',
            'validate-maestro-flow-headers': 'success',
            'build-ios-simulator': 'failure',
            'build-android-apk': 'success',
            'build-android-apk-maestro': 'success',
        };

        it('skips a context whose live status changed from pending to success before POST', async () => {
            let calls = 0;
            const posted = [];
            const result = await finalizeUnstartedLanes({
                token: 'tok',
                repository: REPO,
                sha: 'abc1234',
                runId: RUN_ID,
                runUrl: RUN_URL,
                jobConfigs: ALL_CONFIGS,
                upstreamResults: upstream,
                e2eOverride: false,
                prNumber: '10364',
                readStatusesFn: async () => {
                    calls += 1;
                    if (calls === 1) {
                        return pendingRows();
                    }
                    return [
                        {context: 'e2e-test/detox-ios', state: 'success', target_url: OTHER_URL},
                        {context: 'e2e-test/detox-ipad', state: 'pending', target_url: RUN_URL},
                        {context: 'e2e-test/maestro-ios', state: 'pending', target_url: RUN_URL},
                    ];
                },
                readOverrideFn: async () => false,
                createCommitStatusFn: async (_token, _repo, _sha, payload) => {
                    posted.push(payload);
                },
            });

            assert.deepEqual(posted.map((p) => p.context), ['e2e-test/detox-ipad', 'e2e-test/maestro-ios']);
            assert.equal(result.length, 2);
            assert.ok(posted.every((p) => p.state === 'failure'));
        });

        it('posts E2E/Override success when E2E/Override label is applied before POST while status is pending', async () => {
            let labelChecks = 0;
            const posted = [];
            await finalizeUnstartedLanes({
                token: 'tok',
                repository: REPO,
                sha: 'abc1234',
                runId: RUN_ID,
                runUrl: RUN_URL,
                jobConfigs: ALL_CONFIGS,
                upstreamResults: upstream,
                e2eOverride: false,
                prNumber: '10364',
                readStatusesFn: async () => pendingRows(),
                readOverrideFn: async () => {
                    labelChecks += 1;
                    return labelChecks >= 2;
                },
                createCommitStatusFn: async (_token, _repo, _sha, payload) => {
                    posted.push(payload);
                },
            });

            assert.equal(posted.length, 3);
            assert.ok(posted.every((p) => p.state === 'success' && p.description.startsWith('E2E/Override — ')));
        });

        it('preserves mid-loop E2E/Override across lanes when a subsequent label check fails transiently', async () => {
            const twoConfigs = {
                'detox-ios': ALL_CONFIGS['detox-ios'],
                'detox-ipad': ALL_CONFIGS['detox-ipad'],
            };
            const responses = [false, true, null];
            let labelCalls = 0;
            const posted = [];
            const result = await finalizeUnstartedLanes({
                token: 'tok',
                repository: REPO,
                sha: 'abc1234',
                runId: RUN_ID,
                runUrl: RUN_URL,
                jobConfigs: twoConfigs,
                upstreamResults: upstream,
                e2eOverride: false,
                prNumber: '10364',
                readStatusesFn: async () => pendingRows(twoConfigs),
                readOverrideFn: async () => {
                    const value = responses[labelCalls];
                    labelCalls += 1;
                    return value;
                },
                createCommitStatusFn: async (_token, _repo, _sha, payload) => {
                    posted.push(payload);
                },
            });

            assert.equal(labelCalls, 3);
            assert.equal(result.length, 2);
            assert.deepEqual(posted.map((p) => p.context), ['e2e-test/detox-ios', 'e2e-test/detox-ipad']);
            assert.ok(posted.every((p) => p.state === 'success' && p.description.startsWith('E2E/Override — ')));
        });

        it('re-checks status and label before each POST and posts failure when un-overridden', async () => {
            let statusReads = 0;
            let labelReads = 0;
            const posted = [];
            await finalizeUnstartedLanes({
                token: 'tok',
                repository: REPO,
                sha: 'abc1234',
                runId: RUN_ID,
                runUrl: RUN_URL,
                jobConfigs: ALL_CONFIGS,
                upstreamResults: upstream,
                e2eOverride: false,
                prNumber: '10364',
                readStatusesFn: async () => {
                    statusReads += 1;
                    return pendingRows();
                },
                readOverrideFn: async () => {
                    labelReads += 1;
                    return false;
                },
                createCommitStatusFn: async (_token, _repo, _sha, payload) => {
                    posted.push(payload);
                },
            });

            assert.equal(statusReads, 4);
            assert.equal(labelReads, 7);
            assert.equal(posted.length, 3);
            assert.ok(posted.every((p) => p.state === 'failure'));
        });

        it('reconciles immediately via post-POST readOverrideFn when E2E/Override lands mid-request', async () => {
            let labelReads = 0;
            const posted = [];
            const result = await finalizeUnstartedLanes({
                token: 'tok',
                repository: REPO,
                sha: 'abc1234',
                runId: RUN_ID,
                runUrl: RUN_URL,
                jobConfigs: ALL_CONFIGS,
                upstreamResults: upstream,
                e2eOverride: false,
                prNumber: '10364',
                readStatusesFn: async () => pendingRows(),
                readOverrideFn: async () => {
                    labelReads += 1;
                    return labelReads >= 3;
                },
                createCommitStatusFn: async (_token, _repo, _sha, payload) => {
                    posted.push(payload);
                },
            });

            assert.equal(labelReads, 5);
            assert.equal(posted.length, 4);
            assert.equal(posted[0].context, 'e2e-test/detox-ios');
            assert.equal(posted[0].state, 'failure');
            assert.equal(posted[1].context, 'e2e-test/detox-ios');
            assert.equal(posted[1].state, 'success');
            assert.ok(posted[1].description.startsWith('E2E/Override — '));
            assert.equal(posted[2].context, 'e2e-test/detox-ipad');
            assert.equal(posted[2].state, 'success');
            assert.equal(posted[3].context, 'e2e-test/maestro-ios');
            assert.equal(posted[3].state, 'success');
            assert.equal(result.length, 3);
            assert.ok(result.every((p) => p.state === 'success' && p.description.startsWith('E2E/Override — ')));
        });

        it('readE2eOverrideLabel detects E2E/Override and returns null on invalid PR or error', async () => {
            assert.equal(await readE2eOverrideLabel({token: 'tok', repository: REPO, prNumber: ''}), null);
            assert.equal(
                await readE2eOverrideLabel({
                    token: 'tok',
                    repository: REPO,
                    prNumber: '10364',
                    requestFn: async () => [{name: 'E2E/Run'}, {name: 'E2E/Override'}],
                }),
                true,
            );
            assert.equal(
                await readE2eOverrideLabel({
                    token: 'tok',
                    repository: REPO,
                    prNumber: '10364',
                    requestFn: async () => {
                        throw new Error('503');
                    },
                }),
                null,
            );
        });
    });
});
