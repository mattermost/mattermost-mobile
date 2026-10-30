// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env, no-await-in-loop -- CI utility script */

/**
 * Post one Mattermost channel rollup after per-job TSIO uploads.
 * Does not write GitHub commit statuses (those are finalized per job).
 *
 * Env:
 *   JOB_CONFIGS — JSON map from buildTsioJobConfigMap
 *   UPSTREAM_SUCCEEDED — "true" | "false"
 *   USE_STAGING — "true" to hit staging TSIO
 *   GITHUB_TOKEN — reads the changes merged since the last main run (GitHub compare)
 *   TRIAGE_FINDINGS_DIR — the triage jobs' findings files (--findings-dir)
 *   MATTERMOST_*_WEBHOOK_URL — routed via resolveWebhookUrl / webhookBucketForReportName
 */

const fs = require('fs');
const path = require('path');

const {webhookBucketForReportName} = require('./build-tsio-job-config');
const {parseArgs} = require('./cli-args');
const {
    fetchFailuresFromConsolidated,
    fetchPerJobCountsFromConsolidated,
    notifyCmtChannel,
    resolveWebhookUrl,
} = require('./cmt-channel-notify');
const {
    mintOidcToken,
    beginGroup,
    pollGroup,
    buildWorkflowRunUrl,
    PRODUCTION_URL,
    STAGING_URL,
} = require('./tsio-report-status');

function bucketIdentity(sampleIdentity) {
    const bucket = webhookBucketForReportName(sampleIdentity.run_group || sampleIdentity.name) ||
        sampleIdentity.name ||
        'mobile-pr';
    return {
        ...sampleIdentity,
        name: bucket,
        run_group: bucket,
    };
}

/**
 * The triage job's findings file for each run (one artifact per run). Only schema 2, which names each test's
 * verdict, is used; anything else is skipped with a warning.
 *
 * @param {string} dir
 * @param {Function} [warn]
 * @returns {Array<{lane: string, findings: Array, counts?: object}>}
 */
function loadTriageFindings(dir, warn = console.warn) {
    if (!dir || !fs.existsSync(dir)) {
        return [];
    }
    const out = [];
    const walk = (current) => {
        for (const entry of fs.readdirSync(current, {withFileTypes: true})) {
            const file = path.join(current, entry.name);
            if (entry.isDirectory()) {
                walk(file);
                continue;
            }
            if (!entry.name.endsWith('.json')) {
                continue;
            }
            try {
                const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
                if (parsed?.schema === 2 && typeof parsed.lane === 'string' && Array.isArray(parsed.findings)) {
                    out.push(parsed);
                } else {
                    warn(`tsio-channel-notify-rollup: ${file} is not a schema 2 findings file — skipped`);
                }
            } catch (err) {
                warn(`tsio-channel-notify-rollup: could not read ${file}: ${err.message}`);
            }
        }
    };
    walk(dir);
    return out;
}

/**
 * The changes merged between the previous run of this suite on the same branch and this one: TSIO names the
 * previous run's commit, GitHub's compare lists the commits in between, and each squash-merged commit names its
 * PR as "(#1234)". Null when either side is unknown.
 *
 * @param {Object} params
 * @param {string} params.baseUrl - TSIO
 * @param {{repository: string, name: string, branch: string, commit_sha: string}} params.identity - one run's identity
 * @param {string} [params.token] - GitHub token
 * @param {Function} [params.fetchImpl]
 * @returns {Promise<{from: string, to: string, prs: Array<{number: number, title: string}>, partial?: boolean} | null>}
 */
async function findChangesSinceLastRun({baseUrl, identity, token, fetchImpl = fetch}) {
    const query = new URLSearchParams({repository: identity.repository, name: identity.name, limit: '20'});
    const res = await fetchImpl(`${baseUrl}/api/v1/reports?${query}`, {signal: AbortSignal.timeout(30000)});
    if (!res.ok) {
        return null;
    }
    const reports = ((await res.json())?.reports || []).
        filter((r) => r.branch === identity.branch && r.commit && r.created_at).
        sort((a, b) => b.created_at.localeCompare(a.created_at));

    // Prefer this workflow run and attempt over another dispatch of the same commit.
    const current = identity.gh_run_id ? reports.find((r) => String(r.gh_run_id) === String(identity.gh_run_id) &&
        (!identity.gh_run_attempt || !(r.gh_run_attempt ?? r.run_attempt) ||
            String(r.gh_run_attempt ?? r.run_attempt) === String(identity.gh_run_attempt))) :
        reports.find((r) => r.commit === identity.commit_sha);

    // An earlier attempt of this workflow run is not a previous run.
    const otherRuns = identity.gh_run_id ? reports.filter((r) => String(r.gh_run_id) !== String(identity.gh_run_id)) : reports;

    // If this run has not reported yet, the latest report for this commit is the previous run.
    const earlier = current ?
        otherRuns.find((r) => r.created_at < current.created_at) :
        otherRuns.find((r) => r.commit === identity.commit_sha) || otherRuns[0];
    if (!earlier) {
        return null;
    }
    if (earlier.commit === identity.commit_sha) {
        return {from: earlier.commit, to: identity.commit_sha, prs: []};
    }
    const compare = await fetchImpl(`https://api.github.com/repos/${identity.repository}/compare/${earlier.commit}...${identity.commit_sha}`, {
        headers: {Accept: 'application/vnd.github+json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
        signal: AbortSignal.timeout(30000),
    });
    if (!compare.ok) {
        return null;
    }
    const body = await compare.json();
    const commits = body?.commits || [];
    const prs = [];
    for (const commit of commits) {
        const subject = (commit.commit?.message || '').split('\n')[0];
        const number = (/\(#(\d+)\)\s*$/).exec(subject)?.[1];
        if (number) {
            prs.push({number: Number(number), title: subject.replace(/\s*\(#\d+\)\s*$/, '')});
        }
    }

    // GitHub lists at most 250 commits of a comparison: past that, the PRs are only some of those merged.
    return {from: earlier.commit, to: identity.commit_sha, prs, partial: (body?.total_commits || 0) > commits.length};
}

function mergeDetails(details) {
    const reports = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let flaky = 0;
    let allCompleted = true;

    for (const detail of details) {
        if (!detail) {
            allCompleted = false;
            continue;
        }
        if (detail.status !== 'completed' && detail.status !== 'incomplete') {
            allCompleted = false;
        }
        for (const r of detail.reports || []) {
            reports.push(r);
        }
        const s = detail.test_stats || {};
        passed += s.passed || 0;
        failed += s.failed || 0;
        skipped += s.skipped || 0;
        flaky += s.flaky || 0;
    }

    let status = 'pending';
    if (allCompleted) {
        status = failed > 0 ? 'incomplete' : 'completed';
    }

    return {
        status,
        test_stats: {passed, failed, skipped, flaky, total: passed + failed + skipped + flaky},
        reports,
    };
}

const COUNT_KEYS = ['passed', 'failed', 'skipped', 'flaky'];

/**
 * Merge per-leg spec counts across jobs.
 *
 * Each job owns its own TSIO group (`mobile-main-detox-ios`, …), and the consolidated
 * endpoint is scoped to one group name, so counts must be fetched once per job with
 * that job's identity. Querying the rollup bucket (`mobile-main`) instead returns no
 * specs, which renders every leg as ⚠️ no-results.
 *
 * @param {Object} params
 * @param {string} params.baseUrl
 * @param {Array<{identity: object, detail: object|null}>} params.results
 * @param {Function} [params.fetchCounts] - injectable for tests
 * @param {Function} [params.warn]
 * @returns {Promise<Record<string, {passed: number, failed: number, skipped: number, flaky: number}>>}
 */
async function collectPerJobCounts({
    baseUrl,
    results,
    fetchCounts = fetchPerJobCountsFromConsolidated,
    warn = console.warn,
}) {
    const merged = {};
    for (const {identity, detail} of results) {
        if (!detail) {
            continue;
        }

        let counts;
        try {
            counts = await fetchCounts(baseUrl, identity, detail);
        } catch (err) {
            // The group's own totals, so a slow per-test fetch never drops a run's failures from the message.
            const job = (detail.reports || []).map((r) => r.gh_job_name || r.display_name).find(Boolean);
            warn(`tsio-channel-notify-rollup: no per-test counts for ${identity.name} (${err.message})${job ? '; using the group totals' : ''}`);
            if (!job || !detail.test_stats) {
                continue;
            }
            counts = {[job]: detail.test_stats};
        }

        for (const [job, jobCounts] of Object.entries(counts || {})) {
            if (!merged[job]) {
                merged[job] = {passed: 0, failed: 0, skipped: 0, flaky: 0};
            }
            for (const key of COUNT_KEYS) {
                merged[job][key] += jobCounts[key] || 0;
            }
        }
    }
    return merged;
}

/**
 * Merge per-leg failing tests across jobs, for the channel message's failure
 * judgement. Same per-job consolidated fetch pattern as collectPerJobCounts.
 *
 * @param {Object} params
 * @param {string} params.baseUrl
 * @param {Array<{identity: object, detail: object|null}>} params.results
 * @param {Function} [params.fetchFailures] - injectable for tests
 * @param {Function} [params.warn]
 * @returns {Promise<Array<object>>}
 */
async function collectFailures({
    baseUrl,
    results,
    fetchFailures = fetchFailuresFromConsolidated,
    warn = console.warn,
}) {
    const merged = [];
    for (const {identity, detail} of results) {
        if (!detail) {
            continue;
        }
        try {
            merged.push(...await fetchFailures(baseUrl, identity, detail));
        } catch (err) {
            warn(`tsio-channel-notify-rollup: no failure details for ${identity.name}: ${err.message}`);
        }
    }
    return merged;
}

async function main() {
    const args = parseArgs(process.argv);
    const raw = args['job-configs'] || process.env.JOB_CONFIGS || '';
    let jobConfigs;
    try {
        jobConfigs = JSON.parse(raw);
    } catch (err) {
        console.error('tsio-channel-notify-rollup: invalid JOB_CONFIGS JSON:', err.message);
        process.exit(1);
    }

    const entries = Object.values(jobConfigs || {});
    if (entries.length === 0) {
        console.log('tsio-channel-notify-rollup: no job configs — skipping');
        return;
    }

    const useStaging = args['use-staging'] === 'true' || process.env.USE_STAGING === 'true';
    const baseUrl = args['base-url'] || (useStaging ? STAGING_URL : PRODUCTION_URL);
    const audience = args.audience || 'mattermost-test-system-io';
    const upstreamSucceeded = (args['upstream-succeeded'] || process.env.UPSTREAM_SUCCEEDED || 'true') !== 'false';
    const pollAttempts = parseInt(args['poll-attempts'] || '6', 10);

    const sampleIdentity = entries[0].composite_identity;
    const rollupIdentity = bucketIdentity(sampleIdentity);
    const webhookUrl = resolveWebhookUrl(rollupIdentity.name);
    if (!webhookUrl) {
        console.log(`tsio-channel-notify-rollup: no webhook for ${rollupIdentity.name} — skipping`);
        return;
    }

    let idToken;
    try {
        idToken = await mintOidcToken(audience);
    } catch (err) {
        console.warn('tsio-channel-notify-rollup (OIDC):', err.message);
        return;
    }

    const results = [];
    for (const cfg of entries) {
        const identity = cfg.composite_identity;
        const total = cfg.total_reports_expected || 1;
        try {
            const reportId = await beginGroup(baseUrl, idToken, identity, total);
            const detail = await pollGroup(baseUrl, reportId, pollAttempts);
            results.push({identity, detail});
        } catch (err) {
            console.warn(`tsio-channel-notify-rollup: skip ${identity.name}: ${err.message}`);
            results.push({identity, detail: null});
        }
    }

    const detail = mergeDetails(results.map((r) => r.detail));
    const perJobCounts = await collectPerJobCounts({baseUrl, results});
    const failures = await collectFailures({baseUrl, results});

    // The triage jobs' verdicts, and on main the changes since the last main run, which the new failures point to.
    const triage = loadTriageFindings(args['findings-dir'] || process.env.TRIAGE_FINDINGS_DIR || '');

    // Main and CMT re-run the failures triage could not clear on fresh devices (rerun-failed.js): the same plan
    // names what was re-run, and each re-run test's result decides whether it is a product bug.
    let rerun = null;
    if (['mobile-main', 'mobile-release'].includes(webhookBucketForReportName(rollupIdentity.name))) {
        const {planRerun, loadRerunResults} = require('./rerun-failed');
        rerun = {...planRerun(triage), results: loadRerunResults(args['rerun-results-dir'] || process.env.RERUN_RESULTS_DIR || '')};
        try {
            rerun.stale = JSON.parse(process.env.RERUN_STALE || '{}');
        } catch {
            rerun.stale = {};
        }
    }
    let changes = null;
    if (triage.length && webhookBucketForReportName(rollupIdentity.name) === 'mobile-main') {
        try {
            changes = await findChangesSinceLastRun({baseUrl, identity: sampleIdentity, token: process.env.GITHUB_TOKEN});
        } catch (err) {
            console.warn(`tsio-channel-notify-rollup: changes since the last main run unknown: ${err.message}`);
        }
    }

    // The bucket name has no single TSIO group of its own (each job owns
    // mobile-<flow>-<job>), so the rollup links to the workflow run and each leg
    // row deep-links to its own TSIO report.
    const runUrl = buildWorkflowRunUrl(rollupIdentity);
    const hasFailures = (detail.test_stats.failed || 0) > 0 ||
        (detail.reports || []).some((r) => r.status && r.status !== 'complete' && r.status !== 'completed');

    const core = {
        info: (msg) => console.log(msg),
        warning: (msg) => console.warn(msg),
    };

    await notifyCmtChannel({
        core,
        baseUrl,
        compositeIdentity: rollupIdentity,
        detail,
        runUrl,
        perJobCounts,
        failures,
        triage,
        changes,
        rerun,
        upstreamJobsSucceeded: upstreamSucceeded,
        hasFailures,
        webhookUrl,
    });
}

if (require.main === module) {
    main().catch((err) => {
        console.warn('tsio-channel-notify-rollup fatal:', err.message);
        process.exit(0);
    });
}

module.exports = {bucketIdentity, mergeDetails, collectPerJobCounts, collectFailures, loadTriageFindings, findChangesSinceLastRun};
