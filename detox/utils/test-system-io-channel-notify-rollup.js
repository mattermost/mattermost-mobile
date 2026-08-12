// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env, no-await-in-loop -- CI utility script */

/**
 * Post one Mattermost channel rollup after per-job Test System IO uploads.
 * Does not write GitHub commit statuses (those are finalized per job).
 *
 * Env:
 *   JOB_CONFIGS — JSON map from buildTestSystemIoJobConfigMap
 *   UPSTREAM_SUCCEEDED — "true" | "false"
 *   USE_STAGING — "true" to hit staging Test System IO
 *   GITHUB_TOKEN — unused here but kept for parity with other CI utils
 *   MATTERMOST_*_WEBHOOK_URL — routed via resolveWebhookUrl / webhookBucketForReportName
 */

const {webhookBucketForReportName} = require('./build-test-system-io-job-config');
const {parseArgs} = require('./cli-args');
const {
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
} = require('./test-system-io-report-status');

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
 * Each job owns its own Test System IO group (`detox-ios`, …), and the consolidated
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
            warn(`test-system-io-channel-notify-rollup: no per-leg counts for ${identity.name}: ${err.message}`);
            continue;
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

async function main() {
    const args = parseArgs(process.argv);
    const raw = args['job-configs'] || process.env.JOB_CONFIGS || '';
    let jobConfigs;
    try {
        jobConfigs = JSON.parse(raw);
    } catch (err) {
        console.error('test-system-io-channel-notify-rollup: invalid JOB_CONFIGS JSON:', err.message);
        process.exit(1);
    }

    const entries = Object.values(jobConfigs || {});
    if (entries.length === 0) {
        console.log('test-system-io-channel-notify-rollup: no job configs — skipping');
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
        console.log(`test-system-io-channel-notify-rollup: no webhook for ${rollupIdentity.name} — skipping`);
        return;
    }

    let idToken;
    try {
        idToken = await mintOidcToken(audience);
    } catch (err) {
        console.warn('test-system-io-channel-notify-rollup (OIDC):', err.message);
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
            console.warn(`test-system-io-channel-notify-rollup: skip ${identity.name}: ${err.message}`);
            results.push({identity, detail: null});
        }
    }

    const detail = mergeDetails(results.map((r) => r.detail));
    const perJobCounts = await collectPerJobCounts({baseUrl, results});

    // The bucket name has no single Test System IO group of its own (each job owns
    // mobile-<flow>-<job>), so the rollup links to the workflow run and each leg
    // row deep-links to its own Test System IO report.
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
        upstreamJobsSucceeded: upstreamSucceeded,
        hasFailures,
        webhookUrl,
    });
}

if (require.main === module) {
    main().catch((err) => {
        console.warn('test-system-io-channel-notify-rollup fatal:', err.message);
        process.exit(0);
    });
}

module.exports = {bucketIdentity, mergeDetails, collectPerJobCounts};
