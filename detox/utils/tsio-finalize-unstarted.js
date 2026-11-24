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
const {
    createCommitStatus,
    githubRequestWithRetry,
    OVERRIDE_LABEL,
    overrideCommitStatus,
} = require('./tsio-report-status');
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

/**
 * Check whether `E2E/Override` is currently applied to the PR.
 * Returns `null` when PR number is unavailable or a transient read fails so callers
 * retain their prior known state instead of clearing an active override.
 *
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.repository
 * @param {string|number} params.prNumber
 * @param {Function} [params.requestFn]
 * @returns {Promise<boolean|null>}
 */
async function readE2eOverrideLabel({token, repository, prNumber, requestFn = githubRequestWithRetry}) {
    const pr = Number.parseInt(prNumber, 10);
    if (!Number.isFinite(pr) || pr <= 0) {
        return null;
    }
    const [owner, repo] = String(repository || '').split('/');
    if (!owner || !repo) {
        return null;
    }
    try {
        for (let page = 1; page <= 10; page++) {
            const labels = await requestFn(
                `https://api.github.com/repos/${owner}/${repo}/issues/${pr}/labels?per_page=100&page=${page}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/vnd.github+json',
                        'X-GitHub-Api-Version': '2022-11-28',
                    },
                },
                {what: 'reading PR labels', readBody: (res) => res.json()},
            );
            if (!Array.isArray(labels) || labels.length === 0) {
                return false;
            }
            if (labels.some((label) => label?.name === OVERRIDE_LABEL)) {
                return true;
            }
            if (labels.length < 100) {
                return false;
            }
        }
        return false;
    } catch (err) {
        console.warn(`tsio-finalize-unstarted: could not read PR #${pr} labels (${err.message})`);
        return null;
    }
}

/**
 * Finalize pending run-owned lanes while re-checking live commit statuses and PR `E2E/Override`
 * immediately before and after each status POST so concurrent override writes are never clobbered.
 *
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.repository
 * @param {string} params.sha
 * @param {string|number} params.runId
 * @param {string} params.runUrl
 * @param {Record<string, {status_context: string}>} params.jobConfigs
 * @param {Record<string, string>} params.upstreamResults
 * @param {boolean} [params.e2eOverride]
 * @param {string|number} [params.prNumber]
 * @param {Function} [params.readStatusesFn]
 * @param {Function} [params.readOverrideFn]
 * @param {Function} [params.createCommitStatusFn]
 * @returns {Promise<Array<{context: string, state: string, description: string, target_url: string}>>}
 */
async function finalizeUnstartedLanes({
    token,
    repository,
    sha,
    runId,
    runUrl,
    jobConfigs,
    upstreamResults,
    e2eOverride = false,
    prNumber = '',
    readStatusesFn = readStatuses,
    readOverrideFn = readE2eOverrideLabel,
    createCommitStatusFn = createCommitStatus,
}) {
    const initialRows = await readStatusesFn({token, repository, sha});
    let knownOverride = e2eOverride;
    if (prNumber) {
        const checked = await readOverrideFn({token, repository, prNumber});
        if (checked !== null) {
            knownOverride = checked;
        }
    }
    const planned = planUnstartedFinalizations({
        jobConfigs,
        upstreamResults,
        rows: initialRows,
        repository,
        runId,
        runUrl,
        e2eOverride: knownOverride,
    });

    if (!planned.length) {
        return [];
    }

    const posted = [];
    for (const candidate of planned) {
        const liveRows = await readStatusesFn({token, repository, sha});
        const latest = (liveRows || []).find((r) => r.context === candidate.context);
        if (!latest || latest.state !== 'pending' || !ownedByRun(latest.target_url, repository, runId)) {
            console.log(`${candidate.context}: skipped — status is now ${latest?.state || 'missing'} before POST`);
            continue;
        }

        let liveOverride = knownOverride;
        if (prNumber) {
            const rechecked = await readOverrideFn({token, repository, prNumber});
            if (rechecked !== null) {
                knownOverride = rechecked;
                liveOverride = rechecked;
            }
        }

        const fresh = planUnstartedFinalizations({
            jobConfigs,
            upstreamResults,
            rows: liveRows,
            repository,
            runId,
            runUrl,
            e2eOverride: liveOverride,
        }).find((u) => u.context === candidate.context);

        if (!fresh) {
            continue;
        }

        await createCommitStatusFn(token, repository, sha, fresh);
        let finalPosted = fresh;
        if (prNumber && fresh.state !== 'success') {
            const postOverride = await readOverrideFn({token, repository, prNumber});
            if (postOverride === true) {
                knownOverride = true;
                finalPosted = {
                    ...fresh,
                    ...overrideCommitStatus(fresh.state, fresh.description),
                };
                await createCommitStatusFn(token, repository, sha, finalPosted);
            }
        }
        posted.push(finalPosted);
        console.log(`${finalPosted.context}: ${finalPosted.state} · ${finalPosted.description}`);
    }
    return posted;
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
    const prNumber = args['pr-number'] || process.env.PR_NUMBER || '';

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
    const posted = await finalizeUnstartedLanes({
        token,
        repository,
        sha,
        runId,
        runUrl,
        jobConfigs,
        upstreamResults,
        e2eOverride,
        prNumber,
    });

    if (!posted.length) {
        console.log('tsio-finalize-unstarted: no pending run-owned lanes to finalize');
    }
}

module.exports = {affectedJobKeys, planUnstartedFinalizations, readE2eOverrideLabel, finalizeUnstartedLanes};

if (require.main === module) {
    main().catch((err) => {
        console.error('tsio-finalize-unstarted fatal:', err.message);
        process.exit(1);
    });
}
