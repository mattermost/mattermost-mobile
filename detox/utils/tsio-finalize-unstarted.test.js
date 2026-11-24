// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/tsio-finalize-unstarted.test.js`.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {buildTsioJobConfigMap, jobKeysForPlatform} = require('./build-tsio-job-config');
const {affectedJobKeys, planUnstartedFinalizations} = require('./tsio-finalize-unstarted');

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
});
