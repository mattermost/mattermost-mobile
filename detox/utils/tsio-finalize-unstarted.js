// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env, no-await-in-loop -- CI utility script */

/**
 * Finalize per-lane TSIO commit statuses that never started because an
 * upstream build, server-provision, or Maestro header validation job failed.
 *
 * Only contexts in `jobConfigs` whose latest commit status on `sha` is still
 * `pending` and owned by the current workflow run are updated.
 *
 * Usage:
 *   node detox/utils/tsio-finalize-unstarted.js --repository=o/r --sha=<sha> \
 *     --run-id=<id> --job-configs=<json> --upstream-results=<json> [--e2e-override=true|false]
 */

const {parseArgs} = require('./cli-args');
const {createCommitStatus, overrideCommitStatus} = require('./tsio-report-status');
const {ownedByRun, readStatuses} = require('./tsio-triage-settle');

const BUILD_OK_STATES = new Set(['success', 'skipped']);

const UPSTREAM_AFFECTED_KEYS = [
    {
        job: 'provision-servers',
        isFailure: (result) => result !== 'success',
        keys: (jobConfigs) => Object.keys(jobConfigs),
    },
    {
        job: 'validate-maestro-flow-headers',
        isFailure: (result) => result !== 'success',
        keys: () => ['maestro-ios-e2e', 'maestro-android-e2e'],
    },
    {
        job: 'build-ios-simulator',
        isFailure: (result) => !BUILD_OK_STATES.has(result),
        keys: () => ['detox-ios', 'detox-ipad', 'maestro-ios-e2e'],
    },
    {
        job: 'build-android-apk',
        isFailure: (result) => !BUILD_OK_STATES.has(result),
        keys: () => ['detox-android'],
    },
    {
        job: 'build-android-apk-maestro',
        isFailure: (result) => !BUILD_OK_STATES.has(result),
        keys: () => ['maestro-android-e2e'],
    },
];

/**
 * Map upstream Phase-1 job results to affected job-configs keys.
 *
 * @param {Record<string, string>} upstreamResults
 * @param {Record<string, {status_context: string}>} jobConfigs
 * @returns {Array<{key: string, config: {status_context: string}, reasons: string[]}>}
 */
function affectedJobKeys(upstreamResults, jobConfigs) {
    if (!upstreamResults || !jobConfigs) {
        return [];
    }
    const byKey = new Map();
    for (const rule of UPSTREAM_AFFECTED_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(upstreamResults, rule.job)) {
            continue;
        }
        const result = upstreamResults[rule.job];
        if (!result || !rule.isFailure(result)) {
            continue;
        }
        for (const key of rule.keys(jobConfigs)) {
            if (!Object.prototype.hasOwnProperty.call(jobConfigs, key)) {
                continue;
            }
            let entry = byKey.get(key);
            if (!entry) {
                entry = {key, config: jobConfigs[key], reasons: []};
                byKey.set(key, entry);
            }
            if (!entry.reasons.includes(rule.job)) {
                entry.reasons.push(rule.job);
            }
        }
    }
    return [...byKey.values()];
}

/**
 * Plan commit status updates for unstarted lanes still pending for this run.
 *
 * @param {Object} params
 * @param {Record<string, {status_context: string}>} params.jobConfigs
 * @param {Record<string, string>} params.upstreamResults
 * @param {Array<{context: string, state: string, target_url?: string}>} params.rows - newest first
 * @param {string} params.repository
 * @param {string|number} params.runId
 * @param {string} params.runUrl
 * @param {boolean} [params.e2eOverride]
 * @returns {Array<{context: string, state: string, description: string, target_url: string}>}
 */
function planUnstartedFinalizations({
    jobConfigs,
    upstreamResults,
    rows,
    repository,
    runId,
    runUrl,
    e2eOverride = false,
}) {
    const affected = affectedJobKeys(upstreamResults, jobConfigs);
    const updates = [];
    for (const {config, reasons} of affected) {
        const latest = (rows || []).find((r) => r.context === config.status_context);
        if (!latest || latest.state !== 'pending' || !ownedByRun(latest.target_url, repository, runId)) {
            continue;
        }
        const allFailed = reasons.every((job) => upstreamResults[job] === 'failure');
        const rawDescription = `Upstream ${reasons.join(', ')} ${allFailed ? 'failed' : 'did not succeed'}; tests did not run`.slice(0, 140);
        let final = {state: 'failure', description: rawDescription};
        if (e2eOverride) {
            final = overrideCommitStatus('failure', rawDescription);
        }
        updates.push({
            context: config.status_context,
            state: final.state,
            description: final.description,
            target_url: runUrl,
        });
    }
    return updates;
}

async function main() {
    const args = parseArgs(process.argv);
    const token = args['github-token'] || process.env.GITHUB_TOKEN;
    const repository = args.repository || process.env.GITHUB_REPOSITORY;
    const sha = args.sha || process.env.SHA;
    const runId = args['run-id'] || process.env.GITHUB_RUN_ID;
    const rawJobConfigs = args['job-configs'] || process.env.JOB_CONFIGS;
    const rawUpstreamResults = args['upstream-results'] || process.env.UPSTREAM_RESULTS;
    const e2eOverride = (args['e2e-override'] || process.env.E2E_OVERRIDE) === 'true';

    if (!token || !repository || !sha || !runId || !rawJobConfigs || !rawUpstreamResults) {
        throw new Error('GITHUB_TOKEN, --repository, --sha, --run-id, --job-configs and --upstream-results are required');
    }

    const jobConfigs = JSON.parse(rawJobConfigs);
    const upstreamResults = JSON.parse(rawUpstreamResults);
    if (!Object.keys(jobConfigs || {}).length) {
        console.log('tsio-finalize-unstarted: no job configs — skipping');
        return;
    }

    const runUrl = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${repository}/actions/runs/${runId}`;
    const rows = await readStatuses({token, repository, sha});
    const updates = planUnstartedFinalizations({
        jobConfigs,
        upstreamResults,
        rows,
        repository,
        runId,
        runUrl,
        e2eOverride,
    });

    if (!updates.length) {
        console.log('tsio-finalize-unstarted: no pending run-owned lanes to finalize');
        return;
    }
    for (const payload of updates) {
        await createCommitStatus(token, repository, sha, payload);
        console.log(`${payload.context}: ${payload.state} · ${payload.description}`);
    }
}

module.exports = {affectedJobKeys, planUnstartedFinalizations};

if (require.main === module) {
    main().catch((err) => {
        console.error('tsio-finalize-unstarted fatal:', err.message);
        process.exit(1);
    });
}
