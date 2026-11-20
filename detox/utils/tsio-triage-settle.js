// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env, no-await-in-loop -- CI utility script */

/**
 * Settles the PR-wide e2e-test/triage check once a run's lanes are final.
 *
 * A red lane announces that triage is coming (a pending check), and an enforcing
 * triage then writes its verdict there. Nothing else writes it, so it is left
 * behind when triage does not write a verdict:
 *   - triage ran report-only (the E2E/Triage-report-only label, added after the
 *     announcement, or labels it could not read);
 *   - triage stopped early (an error, its timeout);
 *   - a re-run turned every lane green, so triage was skipped and the check still
 *     shows the earlier attempt's pending or red.
 * This run's own check only: another run's is left alone.
 *
 * Usage:
 *   node detox/utils/tsio-triage-settle.js --repository=o/r --sha=<sha> --run-id=<id> \
 *     --lanes=e2e-test/detox-ios,e2e-test/detox-android
 */

const {parseArgs} = require('./cli-args');
const {createCommitStatus, githubRequestWithRetry, TRIAGE_CHECK_CONTEXT} = require('./tsio-report-status');

const FINAL_STATES = new Set(['success', 'failure', 'error']);
const RED_STATES = new Set(['failure', 'error']);

/** Whether a status's link belongs to this workflow run: its run page, a TSIO report's gh_run_id, or the toolkit's status_run_id. */
function ownedByRun(targetUrl, repository, runId) {
    let url;
    try {
        url = new URL(targetUrl);
    } catch {
        return false;
    }
    const id = String(runId);
    return (
        url.pathname.replace(/\/+$/, '') === `/${repository}/actions/runs/${id}` ||
        url.searchParams.get('status_run_id') === id ||
        url.searchParams.get('gh_run_id') === id
    );
}

/**
 * The status that settles this run's triage check, or null when it needs none.
 *
 * @param {Object} params
 * @param {Array<{context: string, state: string, target_url?: string}>} params.rows - the commit's statuses, newest first
 * @param {string[]} params.lanes - the lane contexts this run posts
 * @param {string} params.repository - owner/repo
 * @param {string|number} params.runId - this workflow run's id
 * @param {string} params.runUrl - link for the settled check
 * @returns {{state: string, context: string, description: string, target_url: string} | null}
 */
function settleTriageCheck({rows, lanes, repository, runId, runUrl}) {
    const check = rows.find((r) => r.context === TRIAGE_CHECK_CONTEXT);
    if (!check || !ownedByRun(check.target_url, repository, runId) || !lanes.length) {
        return null;
    }
    const currentForRun = (context) => rows.find((r) => r.context === context && ownedByRun(r.target_url, repository, runId));
    const states = lanes.map((lane) => currentForRun(lane)?.state);
    const green = states.every((s) => s === 'success');
    const red = states.filter((s) => RED_STATES.has(s)).length;
    const notFinal = states.filter((s) => !FINAL_STATES.has(s)).length;

    // A verdict triage wrote stands, unless every lane has since gone green (a re-run).
    if (check.state !== 'pending' && !(RED_STATES.has(check.state) && green)) {
        return null;
    }
    let description;
    if (green) {
        description = 'Every E2E check is green';
    } else {
        const parts = [red ? `${red} E2E check(s) red as the tests set them` : null, notFinal ? `${notFinal} with no final result` : null];
        description = `No triage verdict: ${parts.filter(Boolean).join(', ')}`;
    }
    return {
        state: green ? 'success' : 'failure',
        context: TRIAGE_CHECK_CONTEXT,
        description: description.slice(0, 140),
        target_url: runUrl,
    };
}

/** The commit's statuses, newest first, every page; a transient error is tried again (githubRequestWithRetry). */
async function readStatuses({token, repository, sha, ...retry}) {
    const rows = [];
    for (let page = 1; page <= 20; page++) {
        const batch = await githubRequestWithRetry(`https://api.github.com/repos/${repository}/commits/${sha}/statuses?per_page=100&page=${page}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        }, {...retry, what: 'reading statuses', readBody: (res) => res.json()});
        rows.push(...batch);
        if (batch.length < 100) {
            return rows;
        }
    }
    throw new Error('status history longer than 2000 rows; refusing to settle on a partial read');
}

async function main() {
    const args = parseArgs(process.argv);
    const token = process.env.GITHUB_TOKEN;
    const repository = args.repository;
    const sha = args.sha;
    const runId = args['run-id'];
    const lanes = String(args.lanes || '').split(',').map((c) => c.trim()).filter(Boolean);
    if (!token || !repository || !sha || !runId) {
        throw new Error('GITHUB_TOKEN, --repository, --sha and --run-id are required');
    }
    const runUrl = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${repository}/actions/runs/${runId}`;
    const rows = await readStatuses({token, repository, sha});
    const settled = settleTriageCheck({rows, lanes, repository, runId, runUrl});
    if (!settled) {
        console.log(`${TRIAGE_CHECK_CONTEXT}: nothing to settle`);
        return;
    }
    await createCommitStatus(token, repository, sha, settled);
    console.log(`${TRIAGE_CHECK_CONTEXT}: ${settled.state} · ${settled.description}`);
}

module.exports = {ownedByRun, readStatuses, settleTriageCheck, TRIAGE_CHECK_CONTEXT};

if (require.main === module) {
    main().catch((err) => {
        console.error('tsio-triage-settle fatal:', err.message);
        process.exit(1);
    });
}
