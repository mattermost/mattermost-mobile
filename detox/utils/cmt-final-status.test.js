// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/cmt-final-status.test.js`.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {evaluateCmtFinalStatus} = require('./cmt-final-status');

const ALL_SUCCESS_JOBS = {
    calculateCommitHash: 'success',
    cmtIdentity: 'success',
    prepareMaestro: 'success',
    provision: 'success',
    buildIos: 'success',
    buildAndroidDetox: 'success',
    buildAndroidMaestro: 'success',
    detoxIos: 'success',
    detoxIpad: 'success',
    detoxAndroid: 'success',
    maestroIos: 'success',
    maestroAndroid: 'success',
    tsioTriage: 'skipped',
    planRerun: 'skipped',
    rerunDetoxIos: 'skipped',
    rerunDetoxIpad: 'skipped',
    rerunDetoxAndroid: 'skipped',
    rerunMaestroIos: 'skipped',
    rerunMaestroAndroid: 'skipped',
};

const EXPECTED_KEYS = ['detox-ios-Server_11.9.0', 'detox-android-Server_11.9.0'];

describe('cmt-final-status', () => {
    it('returns success and upstreamSucceeded=true when all upstream and matrix jobs pass', () => {
        const res = evaluateCmtFinalStatus({
            jobResults: ALL_SUCCESS_JOBS,
            expectedJobKeys: EXPECTED_KEYS,
            triage: [],
            rerunResults: {},
        });
        assert.deepEqual(res, {
            upstreamSucceeded: true,
            state: 'success',
            description: 'Compatibility Matrix Testing passed — all suites green',
        });
    });

    it('returns error when any job is cancelled', () => {
        const res = evaluateCmtFinalStatus({
            jobResults: {...ALL_SUCCESS_JOBS, detoxIos: 'cancelled'},
            expectedJobKeys: EXPECTED_KEYS,
            triage: [],
            rerunResults: {},
        });
        assert.equal(res.upstreamSucceeded, false);
        assert.equal(res.state, 'error');
    });

    it('fails closed when a build job fails and matrix jobs are skipped (fixes false-green bug)', () => {
        const res = evaluateCmtFinalStatus({
            jobResults: {
                ...ALL_SUCCESS_JOBS,
                buildIos: 'failure',
                detoxIos: 'skipped',
                detoxIpad: 'skipped',
                maestroIos: 'skipped',
            },
            expectedJobKeys: EXPECTED_KEYS,
            triage: [],
            rerunResults: {},
        });
        assert.equal(res.upstreamSucceeded, false);
        assert.equal(res.state, 'failure');
        assert.match(res.description, /build or server setup failed/);
    });

    it('fails closed when a matrix job is skipped or abandoned without build failure', () => {
        const res = evaluateCmtFinalStatus({
            jobResults: {...ALL_SUCCESS_JOBS, maestroAndroid: 'skipped'},
            expectedJobKeys: EXPECTED_KEYS,
            triage: [],
            rerunResults: {},
        });
        assert.equal(res.upstreamSucceeded, false);
        assert.equal(res.state, 'failure');
        assert.match(res.description, /did not run/);
    });

    it('returns success in mixed pass/fail matrix when failing shard findings are all cleared by triage and passing shard has empty SUCCESS findings', () => {
        const res = evaluateCmtFinalStatus({
            jobResults: {...ALL_SUCCESS_JOBS, detoxIos: 'failure', tsioTriage: 'success'},
            expectedJobKeys: EXPECTED_KEYS,
            triage: [
                {
                    schema: 2,
                    lane: 'detox-ios-Server_11.9.0',
                    triaged: true,
                    verdict: 'SUCCESS',
                    counts: {total: 100, passed: 99, failed: 1, flaky: 0, skipped: 0},
                    findings: [{title: 'flaky test', blocking: false}],
                },
                {
                    schema: 2,
                    lane: 'detox-android-Server_11.9.0',
                    triaged: true,
                    verdict: 'SUCCESS',
                    counts: {total: 100, passed: 100, failed: 0, flaky: 0, skipped: 0},
                    findings: [],
                },
            ],
            rerunResults: {},
        });
        assert.equal(res.upstreamSucceeded, false);
        assert.equal(res.state, 'success');
        assert.match(res.description, /1 cleared by triage/);
    });

    it('returns success when blocking findings pass on fresh-device rerun', () => {
        const res = evaluateCmtFinalStatus({
            jobResults: {
                ...ALL_SUCCESS_JOBS,
                detoxIos: 'failure',
                tsioTriage: 'success',
                planRerun: 'success',
                rerunDetoxIos: 'success',
            },
            expectedJobKeys: EXPECTED_KEYS,
            triage: [
                {
                    schema: 2,
                    lane: 'detox-ios-Server_11.9.0',
                    triaged: true,
                    verdict: 'FAILURE',
                    counts: {total: 100, passed: 98, failed: 2, flaky: 0, skipped: 0},
                    findings: [
                        {title: 'known flake', blocking: false},
                        {title: 'rerun flake', blocking: true},
                    ],
                },
                {
                    schema: 2,
                    lane: 'detox-android-Server_11.9.0',
                    triaged: true,
                    verdict: 'SUCCESS',
                    counts: {total: 100, passed: 100, failed: 0, flaky: 0, skipped: 0},
                    findings: [],
                },
            ],
            rerunResults: {
                'detox-ios-Server_11.9.0': new Map([['rerun flake', 'passed']]),
            },
        });
        assert.equal(res.upstreamSucceeded, false);
        assert.equal(res.state, 'success');
        assert.match(res.description, /1 cleared by triage, 1 passed on rerun/);
    });

    it('fails when blocking finding fails rerun or was not rerun', () => {
        const res = evaluateCmtFinalStatus({
            jobResults: {...ALL_SUCCESS_JOBS, detoxIos: 'failure', tsioTriage: 'success'},
            expectedJobKeys: EXPECTED_KEYS,
            triage: [
                {
                    schema: 2,
                    lane: 'detox-ios-Server_11.9.0',
                    triaged: true,
                    verdict: 'FAILURE',
                    counts: {total: 100, passed: 99, failed: 1, flaky: 0, skipped: 0},
                    findings: [{title: 'real product bug', blocking: true}],
                },
                {
                    schema: 2,
                    lane: 'detox-android-Server_11.9.0',
                    triaged: true,
                    verdict: 'SUCCESS',
                    counts: {total: 100, passed: 100, failed: 0, flaky: 0, skipped: 0},
                    findings: [],
                },
            ],
            rerunResults: {
                'detox-ios-Server_11.9.0': new Map([['real product bug', 'failed']]),
            },
        });
        assert.equal(res.upstreamSucceeded, false);
        assert.equal(res.state, 'failure');
        assert.match(res.description, /1 blocking failure/);
    });

    it('fails closed when a shard finding artifact is missing or not triaged (e.g. superseded/no_results)', () => {
        const res = evaluateCmtFinalStatus({
            jobResults: {...ALL_SUCCESS_JOBS, detoxIos: 'failure', tsioTriage: 'success'},
            expectedJobKeys: EXPECTED_KEYS,
            triage: [
                {
                    schema: 2,
                    lane: 'detox-ios-Server_11.9.0',
                    triaged: false,
                    not_triaged_reason: 'no_results: TSIO has no results for this run',
                    verdict: null,
                    findings: [],
                },
            ],
            rerunResults: {},
        });
        assert.equal(res.upstreamSucceeded, false);
        assert.equal(res.state, 'failure');
        assert.match(res.description, /2 untriaged lanes/);
    });

    it('fails closed on unnamed shard placeholders or non-SUCCESS verdict with 0 blocking findings', () => {
        const unnamedRes = evaluateCmtFinalStatus({
            jobResults: {...ALL_SUCCESS_JOBS, detoxIos: 'failure', tsioTriage: 'success'},
            expectedJobKeys: EXPECTED_KEYS,
            triage: [
                {
                    schema: 2,
                    lane: 'detox-ios-Server_11.9.0',
                    triaged: true,
                    verdict: 'FAILURE',
                    counts: {total: 10, passed: 8, failed: 2, flaky: 0, skipped: 0},
                    findings: [{title: 'cleared test', blocking: false}],
                },
                {
                    schema: 2,
                    lane: 'detox-android-Server_11.9.0',
                    triaged: true,
                    verdict: 'SUCCESS',
                    counts: {total: 10, passed: 10, failed: 0, flaky: 0, skipped: 0},
                    findings: [],
                },
            ],
            rerunResults: {},
        });
        assert.equal(unnamedRes.state, 'failure');
        assert.match(unnamedRes.description, /1 unsettled lane/);

        const missingReportRes = evaluateCmtFinalStatus({
            jobResults: {...ALL_SUCCESS_JOBS, detoxIos: 'failure', tsioTriage: 'success'},
            expectedJobKeys: EXPECTED_KEYS,
            triage: [
                {
                    schema: 2,
                    lane: 'detox-ios-Server_11.9.0',
                    triaged: true,
                    verdict: 'FAILURE',
                    counts: {total: 10, passed: 10, failed: 0, flaky: 0, skipped: 0},
                    findings: [],
                },
                {
                    schema: 2,
                    lane: 'detox-android-Server_11.9.0',
                    triaged: true,
                    verdict: 'SUCCESS',
                    counts: {total: 10, passed: 10, failed: 0, flaky: 0, skipped: 0},
                    findings: [],
                },
            ],
            rerunResults: {},
        });
        assert.equal(missingReportRes.state, 'failure');
        assert.match(missingReportRes.description, /1 unsettled lane/);
    });

    it('fails closed when triage was skipped or expectedJobKeys is empty on a failing matrix', () => {
        const skippedTriage = evaluateCmtFinalStatus({
            jobResults: {...ALL_SUCCESS_JOBS, detoxIos: 'failure', tsioTriage: 'skipped'},
            expectedJobKeys: EXPECTED_KEYS,
            triage: [],
            rerunResults: {},
        });
        assert.equal(skippedTriage.state, 'failure');
        assert.match(skippedTriage.description, /triage findings unavailable/);

        const emptyKeys = evaluateCmtFinalStatus({
            jobResults: {...ALL_SUCCESS_JOBS, detoxIos: 'failure', tsioTriage: 'success'},
            expectedJobKeys: [],
            triage: [],
            rerunResults: {},
        });
        assert.equal(emptyKeys.state, 'failure');
        assert.match(emptyKeys.description, /triage findings unavailable/);
    });

    it('matches rerun results by test identity so a pass in one spec does not clear a same-title failure in another spec', () => {
        const res = evaluateCmtFinalStatus({
            jobResults: {
                ...ALL_SUCCESS_JOBS,
                detoxIos: 'failure',
                tsioTriage: 'success',
                planRerun: 'success',
                rerunDetoxIos: 'success',
            },
            expectedJobKeys: EXPECTED_KEYS,
            triage: [
                {
                    schema: 2,
                    lane: 'detox-ios-Server_11.9.0',
                    triaged: true,
                    verdict: 'FAILURE',
                    counts: {total: 100, passed: 98, failed: 2, flaky: 0, skipped: 0},
                    findings: [
                        {
                            title: 'MM-T1 - renders',
                            full_title: 'Spec A > MM-T1 - renders',
                            file: 'detox/e2e/test/a.e2e.ts',
                            blocking: true,
                        },
                        {
                            title: 'MM-T1 - renders',
                            full_title: 'Spec B > MM-T1 - renders',
                            file: 'detox/e2e/test/b.e2e.ts',
                            blocking: true,
                        },
                    ],
                },
                {
                    schema: 2,
                    lane: 'detox-android-Server_11.9.0',
                    triaged: true,
                    verdict: 'SUCCESS',
                    counts: {total: 100, passed: 100, failed: 0, flaky: 0, skipped: 0},
                    findings: [],
                },
            ],
            rerunResults: {
                'detox-ios-Server_11.9.0': new Map([
                    ['detox/e2e/test/a.e2e.ts\nSpec A > MM-T1 - renders', 'passed'],
                    ['detox/e2e/test/b.e2e.ts\nSpec B > MM-T1 - renders', 'failed'],
                ]),
            },
        });
        assert.equal(res.upstreamSucceeded, false);
        assert.equal(res.state, 'failure');
        assert.match(res.description, /1 blocking failure/);
    });

    it('fails closed when findings are empty with counts.failed > 0 or verdict is ACTION_REQUIRED despite rerun clears', () => {
        const emptyWithFailedCounts = evaluateCmtFinalStatus({
            jobResults: {...ALL_SUCCESS_JOBS, detoxIos: 'failure', tsioTriage: 'success'},
            expectedJobKeys: EXPECTED_KEYS,
            triage: [
                {
                    schema: 2,
                    lane: 'detox-ios-Server_11.9.0',
                    triaged: true,
                    verdict: 'SUCCESS',
                    counts: {total: 10, passed: 8, failed: 2, flaky: 0, skipped: 0},
                    findings: [],
                },
                {
                    schema: 2,
                    lane: 'detox-android-Server_11.9.0',
                    triaged: true,
                    verdict: 'SUCCESS',
                    counts: {total: 10, passed: 10, failed: 0, flaky: 0, skipped: 0},
                    findings: [],
                },
            ],
            rerunResults: {},
        });
        assert.equal(emptyWithFailedCounts.state, 'failure');
        assert.match(emptyWithFailedCounts.description, /1 unsettled lane/);

        const actionRequiredWithClearedRerun = evaluateCmtFinalStatus({
            jobResults: {...ALL_SUCCESS_JOBS, detoxIos: 'failure', tsioTriage: 'success', planRerun: 'success', rerunDetoxIos: 'success'},
            expectedJobKeys: EXPECTED_KEYS,
            triage: [
                {
                    schema: 2,
                    lane: 'detox-ios-Server_11.9.0',
                    triaged: true,
                    verdict: 'ACTION_REQUIRED',
                    counts: {total: 10, passed: 9, failed: 1, flaky: 0, skipped: 0},
                    findings: [
                        {
                            title: 'MM-T1 - renders',
                            full_title: 'Spec A > MM-T1 - renders',
                            file: 'detox/e2e/test/a.e2e.ts',
                            blocking: true,
                        },
                    ],
                },
                {
                    schema: 2,
                    lane: 'detox-android-Server_11.9.0',
                    triaged: true,
                    verdict: 'SUCCESS',
                    counts: {total: 10, passed: 10, failed: 0, flaky: 0, skipped: 0},
                    findings: [],
                },
            ],
            rerunResults: {
                'detox-ios-Server_11.9.0': new Map([
                    ['detox/e2e/test/a.e2e.ts\nSpec A > MM-T1 - renders', 'passed'],
                ]),
            },
        });
        assert.equal(actionRequiredWithClearedRerun.state, 'failure');
        assert.match(actionRequiredWithClearedRerun.description, /1 unsettled lane/);
    });

    it('succeeds when passing CMT shards are omitted from expectedJobKeys and only failing shards are triaged', () => {
        const res = evaluateCmtFinalStatus({
            jobResults: {...ALL_SUCCESS_JOBS, detoxIos: 'failure', tsioTriage: 'success'},
            expectedJobKeys: ['detox-ios-Server_11.9.0'],
            triage: [
                {
                    schema: 2,
                    lane: 'detox-ios-Server_11.9.0',
                    triaged: true,
                    verdict: 'SUCCESS',
                    counts: {total: 100, passed: 99, failed: 1, flaky: 0, skipped: 0},
                    findings: [{title: 'flaky test', blocking: false}],
                },
            ],
            rerunResults: {},
        });
        assert.equal(res.upstreamSucceeded, false);
        assert.equal(res.state, 'success');
        assert.match(res.description, /1 cleared by triage/);
    });

    it('fails closed when a failing matrix suite has no shards in expectedJobKeys', () => {
        const res = evaluateCmtFinalStatus({
            jobResults: {...ALL_SUCCESS_JOBS, detoxIos: 'failure', detoxAndroid: 'failure', tsioTriage: 'success'},
            expectedJobKeys: ['detox-ios-Server_11.9.0'],
            triage: [
                {
                    schema: 2,
                    lane: 'detox-ios-Server_11.9.0',
                    triaged: true,
                    verdict: 'SUCCESS',
                    counts: {total: 100, passed: 99, failed: 1, flaky: 0, skipped: 0},
                    findings: [{title: 'flaky test', blocking: false}],
                },
            ],
            rerunResults: {},
        });
        assert.equal(res.upstreamSucceeded, false);
        assert.equal(res.state, 'failure');
        assert.match(res.description, /1 untriaged lane/);
    });
});
