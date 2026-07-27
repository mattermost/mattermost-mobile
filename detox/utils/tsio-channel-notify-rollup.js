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
 *   GITHUB_TOKEN — unused here but kept for parity with other CI utils
 *   MATTERMOST_*_WEBHOOK_URL — routed via resolveWebhookUrl / webhookBucketForReportName
 */

const {
    mintOidcToken,
    beginGroup,
    pollGroup,
    buildDisplayReportUrl,
    buildWorkflowRunUrl,
    PRODUCTION_URL,
    STAGING_URL,
} = require('./tsio-report-status');
const {webhookBucketForReportName} = require('./build-tsio-job-config');
const {notifyCmtChannel, resolveWebhookUrl} = require('./cmt-channel-notify');

function parseArgs(argv) {
    const out = {};
    for (const arg of argv.slice(2)) {
        const m = arg.match(/^--([^=]+)=(.*)$/);
        if (m) {
            out[m[1]] = m[2];
        } else if (arg.startsWith('--')) {
            out[arg.slice(2)] = true;
        }
    }
    return out;
}

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
        if (detail.status && detail.status !== 'completed') {
            allCompleted = detail.status === 'incomplete' ? allCompleted : false;
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

    return {
        status: allCompleted ? (failed > 0 ? 'incomplete' : 'completed') : 'pending',
        test_stats: {passed, failed, skipped, flaky, total: passed + failed + skipped + flaky},
        reports,
    };
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

    const details = [];
    for (const cfg of entries) {
        const identity = cfg.composite_identity;
        const total = cfg.total_reports_expected || 1;
        try {
            const reportId = await beginGroup(baseUrl, idToken, identity, total);
            const detail = await pollGroup(baseUrl, reportId, pollAttempts);
            details.push(detail);
        } catch (err) {
            console.warn(`tsio-channel-notify-rollup: skip ${identity.name}: ${err.message}`);
            details.push(null);
        }
    }

    const detail = mergeDetails(details);
    const reportUrl = buildWorkflowRunUrl(rollupIdentity) ||
        buildDisplayReportUrl(baseUrl, rollupIdentity);
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
        reportUrl,
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

module.exports = {bucketIdentity, mergeDetails};
