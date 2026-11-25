// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env -- CI utility script */

/**
 * Evaluate the umbrella `e2e-test/compatibility-matrix-testing` commit status
 * after matrix suites, triage, and fresh-device reruns complete.
 *
 * Also outputs `upstream-succeeded` reflecting raw CI job health (builds,
 * provision, identity, matrix prep, and all 5 matrix suites === 'success')
 * for `tsio-channel-notify`.
 */

const fs = require('fs');

const {loadRerunResults, lookupRerunResult} = require('./rerun-failed');
const {loadTriageFindings} = require('./tsio-channel-notify-rollup');

const UPSTREAM_NON_MATRIX_KEYS = [
    'calculateCommitHash',
    'cmtIdentity',
    'prepareMaestro',
    'provision',
    'buildIos',
    'buildAndroidDetox',
    'buildAndroidMaestro',
];

const MATRIX_KEYS = [
    'detoxIos',
    'detoxIpad',
    'detoxAndroid',
    'maestroIos',
    'maestroAndroid',
];

const MATRIX_KEY_PREFIXES = {
    detoxIos: 'detox-ios-',
    detoxIpad: 'detox-ipad-',
    detoxAndroid: 'detox-android-',
    maestroIos: 'maestro-ios-',
    maestroAndroid: 'maestro-android-',
};

/**
 * Evaluate final CMT status from CI job results, triage findings, and rerun results.
 *
 * @param {Object} params
 * @param {Record<string, string>} params.jobResults
 * @param {string[]} params.expectedJobKeys
 * @param {Array<{lane: string, triaged?: boolean, verdict?: string|null, counts?: {failed?: number}|null, findings?: Array<{title: string, full_title?: string|null, file?: string, blocking: boolean}>}>} params.triage
 * @param {Record<string, Map<string, 'passed'|'failed'>>} params.rerunResults
 * @returns {{upstreamSucceeded: boolean, state: 'success'|'failure'|'error', description: string}}
 */
function evaluateCmtFinalStatus({jobResults, expectedJobKeys, triage, rerunResults}) {
    const results = jobResults || {};

    if (Object.values(results).some((r) => r === 'cancelled')) {
        return {
            upstreamSucceeded: false,
            state: 'error',
            description: 'Compatibility Matrix Testing cancelled before completion',
        };
    }

    if (UPSTREAM_NON_MATRIX_KEYS.some((key) => results[key] !== 'success')) {
        return {
            upstreamSucceeded: false,
            state: 'failure',
            description: 'Compatibility Matrix Testing failed — build or server setup failed',
        };
    }

    const matrixStates = MATRIX_KEYS.map((key) => results[key]);
    if (matrixStates.some((state) => state !== 'success' && state !== 'failure')) {
        return {
            upstreamSucceeded: false,
            state: 'failure',
            description: 'Compatibility Matrix Testing failed — one or more suites did not run',
        };
    }

    if (matrixStates.every((state) => state === 'success')) {
        return {
            upstreamSucceeded: true,
            state: 'success',
            description: 'Compatibility Matrix Testing passed — all suites green',
        };
    }

    if (!Array.isArray(expectedJobKeys) || expectedJobKeys.length === 0 || results.tsioTriage === 'skipped' || !Array.isArray(triage) || triage.length === 0) {
        return {
            upstreamSucceeded: false,
            state: 'failure',
            description: 'Compatibility Matrix Testing failed — triage findings unavailable',
        };
    }

    const byLane = new Map();
    for (const record of triage) {
        if (record && typeof record.lane === 'string') {
            byLane.set(record.lane, record);
        }
    }

    let missingOrUntriaged = 0;
    for (const suite of MATRIX_KEYS) {
        if (results[suite] === 'failure') {
            const prefix = MATRIX_KEY_PREFIXES[suite];
            if (!expectedJobKeys.some((key) => typeof key === 'string' && key.startsWith(prefix))) {
                missingOrUntriaged++;
            }
        }
    }
    let unsettled = 0;
    let blocking = 0;
    let clearedByTriage = 0;
    let clearedByRerun = 0;

    for (const key of expectedJobKeys) {
        const record = byLane.get(key);
        if (!record || record.triaged !== true) {
            missingOrUntriaged++;
            continue;
        }
        const findings = Array.isArray(record.findings) ? record.findings : [];
        if (findings.length === 0) {
            if (record.verdict !== 'SUCCESS' || (record.counts?.failed || 0) > 0) {
                unsettled++;
            }
            continue;
        }

        let laneUnsettled = false;
        if (record.counts?.failed != null && findings.length < record.counts.failed) {
            laneUnsettled = true;
        }

        let laneRerunCleared = 0;
        let laneBlocking = 0;
        for (const finding of findings) {
            if (!finding.blocking) {
                clearedByTriage++;
            } else if (lookupRerunResult(rerunResults?.[key], finding) === 'passed') {
                clearedByRerun++;
                laneRerunCleared++;
            } else {
                blocking++;
                laneBlocking++;
            }
        }

        if (record.verdict === 'ACTION_REQUIRED' || (laneBlocking === 0 && laneRerunCleared === 0 && record.verdict !== 'SUCCESS')) {
            laneUnsettled = true;
        }
        if (laneUnsettled) {
            unsettled++;
        }
    }

    if (missingOrUntriaged + unsettled + blocking > 0) {
        const parts = [
            blocking ? `${blocking} blocking failure${blocking === 1 ? '' : 's'}` : null,
            unsettled ? `${unsettled} unsettled lane${unsettled === 1 ? '' : 's'}` : null,
            missingOrUntriaged ? `${missingOrUntriaged} untriaged lane${missingOrUntriaged === 1 ? '' : 's'}` : null,
        ].filter(Boolean);
        return {
            upstreamSucceeded: false,
            state: 'failure',
            description: `Compatibility Matrix Testing failed — ${parts.join(', ')}`.slice(0, 140),
        };
    }

    const clearedParts = [
        clearedByTriage ? `${clearedByTriage} cleared by triage` : null,
        clearedByRerun ? `${clearedByRerun} passed on rerun` : null,
    ].filter(Boolean);
    let description = 'Compatibility Matrix Testing passed — triage cleared failures';
    if (clearedParts.length) {
        description = `Compatibility Matrix Testing passed (${clearedParts.join(', ')})`.slice(0, 140);
    }

    return {
        upstreamSucceeded: false,
        state: 'success',
        description,
    };
}

function main() {
    const jobResults = JSON.parse(process.env.JOB_RESULTS_JSON || '{}');
    const expectedJobKeys = JSON.parse(process.env.JOB_KEYS || '[]');
    const triage = loadTriageFindings(process.env.TRIAGE_FINDINGS_DIR || '');
    const rerunResults = loadRerunResults(process.env.RERUN_RESULTS_DIR || '');

    const outcome = evaluateCmtFinalStatus({
        jobResults,
        expectedJobKeys,
        triage,
        rerunResults,
    });
    const cleanDescription = outcome.description.replace(/[\r\n]+/g, ' ').slice(0, 140);

    console.log(`cmt-final-status: upstream-succeeded=${outcome.upstreamSucceeded} state=${outcome.state} description=${cleanDescription}`);
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(
            process.env.GITHUB_OUTPUT,
            `upstream-succeeded=${outcome.upstreamSucceeded}\nstate=${outcome.state}\ndescription=${cleanDescription}\n`,
        );
    }
}

module.exports = {evaluateCmtFinalStatus};

if (require.main === module) {
    main();
}
