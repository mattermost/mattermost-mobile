// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-process-env -- CI utility script */

/**
 * Post a Mobile E2E / CMT rollup to a Mattermost incoming webhook.
 *
 * Expected job names (gh_job_name / tsio-shard-name):
 *   PR/Main: detox-ios, detox-android, detox-ipad, maestro-ios-e2e, maestro-android-e2e
 *   CMT:     detox-ios-Server_11.9.0, maestro-android-Server_10.5.14, ...
 */

const PLATFORM_ORDER = {ios: 0, android: 1, ipad: 2};
const FRAMEWORK_ORDER = {detox: 0, maestro: 1};
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Fetch with an abort timeout that stays armed until `readBody` finishes.
 *
 * @template T
 * @param {string} url
 * @param {RequestInit | undefined} options
 * @param {(res: Response) => Promise<T>} readBody
 * @param {number} [timeoutMs]
 * @returns {Promise<T>}
 */
async function fetchWithTimeout(url, options, readBody, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {...(options || {}), signal: controller.signal});
        return await readBody(res);
    } finally {
        clearTimeout(timer);
    }
}

/**
 * @param {string} jobName
 * @returns {{platform: string, framework: string, serverVersion: string, kind: string} | null}
 */
function parseMobileJobName(jobName) {
    if (!jobName || typeof jobName !== 'string') {
        return null;
    }

    // CMT: detox-ios-Server_11.9.0 / maestro-android-Server_10.5.14-rc.1
    const cmtMatch = jobName.match(
        /^(detox|maestro)-(ios|android|ipad)-Server_(\d+\.\d+\.\d+(?:[-.][\w.]+)?)$/,
    );
    if (cmtMatch) {
        return {
            framework: cmtMatch[1],
            platform: cmtMatch[2],
            serverVersion: cmtMatch[3],
            kind: 'cmt',
        };
    }

    // PR/Main: detox-ios | maestro-ios-e2e | detox-ipad
    const prMatch = jobName.match(/^(detox|maestro)-(ios|android|ipad)(?:-e2e)?$/);
    if (prMatch) {
        return {
            framework: prMatch[1],
            platform: prMatch[2],
            serverVersion: 'default',
            kind: 'e2e',
        };
    }

    return null;
}

/**
 * Webhook routing (fail closed for named report groups; mirrors desktop):
 *   mobile-release    → MATTERMOST_CMT_WEBHOOK_URL only (MM_E2E_RELEASE_WEBHOOK_URL)
 *   mobile-main   → MATTERMOST_MASTER_HEALTH_WEBHOOK_URL only (MM_E2E_MASTER_HEALTH_WEBHOOK_URL)
 *   mobile-pr     → MATTERMOST_E2E_WEBHOOK_URL only (MM_MOBILE_E2E_WEBHOOK_URL)
 *
 * Named groups never fall back to MATTERMOST_WEBHOOK_URL (avoids posting
 * CMT/PR/main to the wrong channel when a dedicated secret is missing).
 * Unknown names still use MATTERMOST_WEBHOOK_URL as a generic fallback.
 *
 * @param {string} reportName - compositeIdentity.name
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
function resolveWebhookUrl(reportName, env = process.env) {
    // Per-job groups are named mobile-pr-<shard>, mobile-main-<shard>, etc.
    const {webhookBucketForReportName} = require('./build-tsio-job-config');
    const bucket = webhookBucketForReportName(reportName);
    if (bucket === 'mobile-release') {
        return env.MATTERMOST_CMT_WEBHOOK_URL || '';
    }
    if (bucket === 'mobile-main') {
        return env.MATTERMOST_MASTER_HEALTH_WEBHOOK_URL || '';
    }
    if (bucket === 'mobile-pr') {
        return env.MATTERMOST_E2E_WEBHOOK_URL || '';
    }
    return env.MATTERMOST_WEBHOOK_URL || '';
}

/**
 * @param {string} baseUrl
 * @param {string} reportId
 * @returns {string}
 */
function buildIndividualReportUrl(baseUrl, reportId) {
    return `${baseUrl.replace(/\/$/, '')}/reports/r/${reportId}`;
}

/**
 * @param {Record<string, {passed?: number, failed?: number, skipped?: number, flaky?: number}>} perJobCounts
 * @param {Array<{id?: string, gh_job_name?: string, display_name?: string, status?: string}>} uploadedReports
 * @param {string} [baseUrl]
 * @returns {Array<object>}
 */
function buildLegSummaries(perJobCounts, uploadedReports, baseUrl) {
    const jobNames = new Set([
        ...Object.keys(perJobCounts || {}),
        ...(uploadedReports || []).map((r) => r.gh_job_name || r.display_name).filter(Boolean),
    ]);

    const rows = [];
    for (const jobName of jobNames) {
        const parsed = parseMobileJobName(jobName);
        if (!parsed) {
            continue;
        }

        const counts = perJobCounts[jobName] || {};
        const passed = (counts.passed || 0) + (counts.flaky || 0);
        const failed = counts.failed || 0;
        const skipped = counts.skipped || 0;
        const total = passed + failed + skipped;
        const uploaded = (uploadedReports || []).find(
            (r) => (r.gh_job_name || r.display_name) === jobName,
        );

        let status;
        if (total === 0) {
            const uploadedOk = uploaded?.status === 'complete' || uploaded?.status === 'completed';
            status = uploadedOk ? 'no-results' : 'missing';
        } else {
            status = failed === 0 ? 'passed' : 'failed';
        }

        const label = parsed.kind === 'cmt'? `${parsed.serverVersion}-${parsed.platform}-${parsed.framework}`: `${parsed.platform}-${parsed.framework}`;

        rows.push({
            label,
            status,
            passed,
            failed,
            skipped,
            total,
            platform: parsed.platform,
            framework: parsed.framework,
            serverVersion: parsed.serverVersion,
            kind: parsed.kind,
            reportUrl: uploaded?.id && baseUrl ? buildIndividualReportUrl(baseUrl, uploaded.id) : undefined,
        });
    }

    rows.sort((a, b) => {
        // detox-* first, then maestro-*; within each: ios → android → ipad
        const fwCmp = (FRAMEWORK_ORDER[a.framework] ?? 9) - (FRAMEWORK_ORDER[b.framework] ?? 9);
        if (fwCmp !== 0) {
            return fwCmp;
        }
        const platCmp = (PLATFORM_ORDER[a.platform] ?? 9) - (PLATFORM_ORDER[b.platform] ?? 9);
        if (platCmp !== 0) {
            return platCmp;
        }
        return a.serverVersion.localeCompare(b.serverVersion, undefined, {numeric: true});
    });

    return rows;
}

const PLATFORM_EMOJI = {
    ios: '📱',
    ipad: '📲',
    android: '🤖',
    unknown: '❔',
};

/**
 * Human-readable shard label, e.g. detox-ios or detox-ios (11.9.0).
 *
 * @param {{platform: string, framework: string, kind?: string, serverVersion: string}} leg
 * @returns {string}
 */
function formatLegName(leg) {
    const emoji = PLATFORM_EMOJI[leg.platform] || PLATFORM_EMOJI.unknown;
    const base = `${leg.framework}-${leg.platform}`;
    if (leg.kind === 'cmt' && leg.serverVersion && leg.serverVersion !== 'default') {
        return `${emoji} ${base} (${leg.serverVersion})`;
    }
    return `${emoji} ${base}`;
}

/**
 * @param {{status: string, passed: number, failed: number, skipped?: number}} leg
 * @returns {string}
 */
function formatLegResultText(leg) {
    if (leg.status === 'missing' || leg.status === 'no-results') {
        return `⚠️ ${leg.status}`;
    }

    if ((leg.passed || 0) === 0 && (leg.failed || 0) === 0 && (leg.skipped || 0) > 0) {
        return '⚠️ not executed';
    }
    const executed = leg.passed + leg.failed;
    if (leg.status === 'passed') {
        return `✅ ${leg.passed}/${executed || leg.passed}`;
    }
    return `❌ ${leg.passed}/${executed}`;
}

const JUDGEMENTS = {
    'app-bug': {emoji: '🔴', heading: 'Suspected app bug — needs investigation'},
    flaky: {emoji: '🟠', heading: 'Flaky — intermittent in TSIO history'},
    known: {emoji: '⚪', heading: 'Known failing — also failed before this run'},
    infra: {emoji: '⚠️', heading: 'Infra / environment — not an app failure'},
};

const INFRA_ERROR_PATTERNS = [
    /attributes_feature_disabled|not enabled on this server/i,
    /simctl|NSPOSIXErrorDomain|Failed to CreateArtifact/i,
    /ENOTFOUND|ETIMEDOUT|ECONNREFUSED|ECONNRESET|socket hang up/i,
    /Exceeded timeout of \d+ ?ms for a hook/i,
    /Cannot read properties of undefined \(reading '(id|channel|team|user)'\)/i,
    /test server (is )?(down|unreachable)|server did not (respond|become ready)/i,
];

/**
 * Judge one failing test from the evidence TSIO has for it. Deliberately
 * conservative: "app-bug" means only that the failure is new in the recorded
 * history and its error shows no infrastructure cause — a human still confirms.
 *
 * @param {{title?: string, error?: string, previousStatuses?: string[], passedOnRetry?: boolean}} failure
 * @returns {{category: string, reason: string}}
 */
function classifyFailure(failure) {
    const title = failure?.title || '';
    const error = failure?.error || '';
    const previous = failure?.previousStatuses || [];

    if (/spec did not run/i.test(title) || /produced no result/i.test(error)) {
        return {category: 'infra', reason: 'spec never ran (shard produced no result)'};
    }
    for (const pattern of INFRA_ERROR_PATTERNS) {
        if (pattern.test(error)) {
            return {category: 'infra', reason: 'error points at the test environment, not the app'};
        }
    }
    if (failure?.passedOnRetry) {
        return {category: 'flaky', reason: 'passed on retry in this run'};
    }
    const sawPass = previous.includes('passed') || previous.includes('flaky');
    const sawFail = previous.includes('failed');
    if (sawPass && sawFail) {
        return {category: 'flaky', reason: 'passed and failed in recent TSIO history'};
    }
    if (sawFail) {
        return {category: 'known', reason: 'failed in earlier runs in TSIO history'};
    }
    return {category: 'app-bug', reason: 'first failure in TSIO history, no infra cause in the error'};
}

/**
 * @param {string} jobName gh_job_name of the leg the failure came from
 * @returns {string}
 */
function legLabelForJob(jobName) {
    const parsed = parseMobileJobName(jobName);
    return parsed ? formatLegName(parsed) : (jobName || 'unknown leg');
}

const MAX_JUDGED_PER_CATEGORY = 15;

function suiteKeyOf(title) {
    return (title || '').replace(/›?\s*MM-[A-Za-z0-9_-]+.*$/, '').trim();
}

function formatFailureJudgement(failures) {
    const judged = (failures || []).map((failure) => ({failure, verdict: classifyFailure(failure)}));

    // Cascade rule: a suite whose own setup hit an environment failure in this
    // leg (e.g. the server rejects channel creation) makes its sibling tests
    // fail in setup too, with generic errors that carry no infra marker. Those
    // are not independent app-bug candidates.
    const infraSuites = new Set(
        judged.
            filter((entry) => entry.verdict.category === 'infra').
            map((entry) => `${entry.failure.job}|${suiteKeyOf(entry.failure.title)}`),
    );
    for (const entry of judged) {
        if (entry.verdict.category === 'app-bug' && infraSuites.has(`${entry.failure.job}|${suiteKeyOf(entry.failure.title)}`)) {
            entry.verdict = {category: 'infra', reason: 'same suite hit an environment failure in this leg — likely a cascade'};
        }
    }
    if (judged.length === 0) {
        return [];
    }

    const lines = ['**Failure judgement** _(TSIO history + error text; “suspected” still needs a human confirm)_', ''];
    for (const category of Object.keys(JUDGEMENTS)) {
        const group = judged.filter((entry) => entry.verdict.category === category);
        if (group.length === 0) {
            continue;
        }
        const {emoji, heading} = JUDGEMENTS[category];
        lines.push(`${emoji} **${heading} (${group.length})**`);
        for (const {failure, verdict} of group.slice(0, MAX_JUDGED_PER_CATEGORY)) {
            lines.push(`- ${legLabelForJob(failure.job)} ${failure.title || 'unnamed test'} — ${verdict.reason}`);
        }
        if (group.length > MAX_JUDGED_PER_CATEGORY) {
            lines.push(`- …and ${group.length - MAX_JUDGED_PER_CATEGORY} more (see the consolidated report)`);
        }
        lines.push('');
    }
    return lines;
}

function reportTitleForIdentity(compositeIdentity) {
    const {webhookBucketForReportName} = require('./build-tsio-job-config');
    const bucket = webhookBucketForReportName(
        compositeIdentity?.run_group || compositeIdentity?.name || '',
    );
    switch (bucket) {
        case 'mobile-release':
            return 'Mobile CMT';
        case 'mobile-pr':
            return 'Mobile PR E2E';
        case 'mobile-main':
            return 'Mobile Main E2E';
        default:
            return 'Mobile E2E';
    }
}

/**
 * @param {Object} compositeIdentity
 * @returns {string}
 */
function formatMetaLine(compositeIdentity) {
    const branch = (compositeIdentity.branch || '').replace(/^refs\/(heads|tags)\//, '');
    const shortSha = (compositeIdentity.commit_sha || '').slice(0, 7);
    const parts = [];

    if (compositeIdentity.gh_pr_number) {
        const repo = compositeIdentity.repository || 'mattermost/mattermost-mobile';
        parts.push(`**PR:** [#${compositeIdentity.gh_pr_number}](https://github.com/${repo}/pull/${compositeIdentity.gh_pr_number})`);
    }
    if (branch) {
        parts.push(`**Branch:** \`${branch}\``);
    }
    if (shortSha) {
        parts.push(`**Commit:** \`${shortSha}\``);
    }
    return parts.join(' · ');
}

/**
 * @param {Object} params
 * @returns {string}
 */
function formatCmtChannelMessage({
    compositeIdentity,
    detail,
    reportUrl,
    runUrl,
    baseUrl,
    perJobCounts,
    failures,
    upstreamJobsSucceeded = true,
    hasFailures = false,
}) {
    const stats = detail?.test_stats || {};

    const passed = (stats.passed ?? 0) + (stats.flaky ?? 0);
    const failed = stats.failed ?? 0;
    const skipped = stats.skipped ?? 0;
    const overallFailed = failed > 0 ||
        detail?.status !== 'completed' ||
        !upstreamJobsSucceeded ||
        hasFailures;
    const title = reportTitleForIdentity(compositeIdentity);
    const legs = buildLegSummaries(perJobCounts, detail?.reports || [], baseUrl);

    const lines = [
        `## ${overallFailed ? '❌' : '✅'} ${title}`,
        '',
    ];

    const meta = formatMetaLine(compositeIdentity);
    if (meta) {
        lines.push(meta, '');
    }

    if (failed > 0) {
        lines.push(`🔴 **${failed} failing test${failed === 1 ? '' : 's'}**`, '');
    }

    // Single table: overall totals + one row per shard (detox-ios, maestro-android, …).
    lines.push(
        '| Suite | Passed | Failed | Skipped | Result |',
        '|-------|------:|------:|-------:|--------|',
        `| **Overall** | **${passed}** | **${failed}** | **${skipped}** | ${overallFailed ? '❌ Failed' : '✅ Passed'} |`,
    );

    if (legs.length > 0) {
        for (const leg of legs) {
            const name = formatLegName(leg);
            const nameCell = leg.reportUrl ? `[${name}](${leg.reportUrl})` : name;
            lines.push(
                `| ${nameCell} | ${leg.passed} | ${leg.failed} | ${leg.skipped} | ${formatLegResultText(leg)} |`,
            );
        }
    }
    lines.push('');

    if (legs.length === 0) {
        lines.push('_No per-leg results available yet._', '');
    }

    lines.push(...formatFailureJudgement(failures));
    if ((failures || []).length > 0 && failed > failures.length) {
        lines.push(`_Judged ${failures.length} of ${failed} failing tests; the rest have no TSIO test detail yet._`, '');
    }

    // A tracked test failure already fails the E2E job (the aggregator exits 1 by
    // design), so upstreamJobsSucceeded=false only means something broke *outside*
    // the tests when there are no failing tests to explain it.
    if (!upstreamJobsSucceeded && failed === 0) {
        lines.push('_One or more CI jobs failed outside tracked tests (install/build/teardown)._', '');
    } else if (hasFailures && failed === 0) {
        lines.push('_TSIO reported failed shard(s) not reflected in the test totals; check the full report._', '');
    }
    if (detail?.status && detail.status !== 'completed' && upstreamJobsSucceeded) {
        lines.push(`_TSIO report status: \`${detail.status}\`._`, '');
    }

    if (reportUrl) {
        lines.push(`➡️ **Consolidated report:** ${reportUrl}`);
    }
    if (runUrl && runUrl !== reportUrl) {
        lines.push(`🔗 **CI run:** ${runUrl}`);
    }

    return lines.join('\n').trimEnd() + '\n';
}

/**
 * @param {string} baseUrl
 * @param {Object} compositeIdentity
 * @param {Object} groupDetail
 * @returns {Promise<Record<string, {passed: number, failed: number, skipped: number, flaky: number}>>}
 */
async function fetchPerJobCountsFromConsolidated(baseUrl, compositeIdentity, groupDetail) {
    const idToJob = {};
    for (const report of groupDetail.reports || []) {
        const name = report.gh_job_name || report.display_name;
        if (report.id && name) {
            idToJob[report.id] = name;
        }
    }

    const consol = await fetchConsolidated(baseUrl, compositeIdentity);

    const counts = {};
    const commitSha = compositeIdentity.commit_sha;
    const attempt = Number.parseInt(compositeIdentity.gh_run_attempt || '1', 10);

    for (const spec of consol.specs || []) {
        for (const entry of spec.history || []) {
            if (entry.commit_sha !== commitSha) {
                continue;
            }
            if (Number.parseInt(entry.run_attempt || '0', 10) !== attempt) {
                continue;
            }
            const job = idToJob[entry.report_id];
            if (!job) {
                continue;
            }
            if (!counts[job]) {
                counts[job] = {passed: 0, failed: 0, skipped: 0, flaky: 0};
            }
            const status = entry.status || 'failed';
            if (Object.prototype.hasOwnProperty.call(counts[job], status)) {
                counts[job][status] += 1;
            } else {
                counts[job].failed += 1;
            }
        }
    }

    return counts;
}

/**
 * Failures for this commit/attempt from one consolidated TSIO payload, with the
 * spec's earlier history attached for classifyFailure().
 *
 * @param {Object} consol - parsed /api/v1/reports/consolidated response
 * @param {Object} compositeIdentity
 * @param {Object} groupDetail - the job group's TSIO detail (for report_id → job)
 * @returns {Array<{job: string, title: string, error: string, previousStatuses: string[], passedOnRetry: boolean}>}
 */
function failuresFromConsolidated(consol, compositeIdentity, groupDetail) {
    const idToJob = {};
    for (const report of groupDetail?.reports || []) {
        const name = report.gh_job_name || report.display_name;
        if (report.id && name) {
            idToJob[report.id] = name;
        }
    }

    const commitSha = compositeIdentity.commit_sha;
    const attempt = Number.parseInt(compositeIdentity.gh_run_attempt || '1', 10);
    const failures = [];

    for (const spec of consol?.specs || []) {
        const history = spec.history || [];
        const isCurrent = (entry) =>
            entry.commit_sha === commitSha &&
            Number.parseInt(entry.run_attempt || '0', 10) === attempt;
        const current = history.filter(isCurrent);
        const failedHere = current.find((entry) => entry.status === 'failed');
        if (!failedHere) {
            continue;
        }
        failures.push({
            job: idToJob[failedHere.report_id] || '',
            title: spec.full_title || '',
            error: failedHere.error_message || '',
            previousStatuses: history.filter((entry) => !isCurrent(entry)).map((entry) => entry.status || 'failed'),
            passedOnRetry: current.some((entry) => entry.status === 'flaky'),
        });
    }
    return failures;
}

async function fetchConsolidated(baseUrl, compositeIdentity) {
    const repoTrailing = (compositeIdentity.repository || '').split('/').pop() || compositeIdentity.repository;
    const params = new URLSearchParams({
        repository: repoTrailing,
        branch: (compositeIdentity.branch || '').replace(/^refs\/(heads|tags)\//, ''),
        commit: compositeIdentity.commit_sha,
        name: compositeIdentity.run_group || compositeIdentity.name,
        gh_run_id: String(compositeIdentity.gh_run_id),
    });
    if (compositeIdentity.gh_run_attempt) {
        params.set('gh_run_attempt', String(compositeIdentity.gh_run_attempt));
    }
    return fetchWithTimeout(
        `${baseUrl}/api/v1/reports/consolidated?${params}`,
        undefined,
        async (res) => {
            if (!res.ok) {
                throw new Error(`consolidated fetch failed: ${res.status} ${await res.text()}`);
            }
            return res.json();
        },
    );
}

/**
 * @param {string} baseUrl
 * @param {Object} compositeIdentity
 * @param {Object} groupDetail
 * @returns {Promise<Array>} failures from failuresFromConsolidated
 */
async function fetchFailuresFromConsolidated(baseUrl, compositeIdentity, groupDetail) {
    const consol = await fetchConsolidated(baseUrl, compositeIdentity);
    return failuresFromConsolidated(consol, compositeIdentity, groupDetail);
}

/**
 * @param {Object} params
 * @param {Object} params.core
 * @param {string} params.webhookUrl
 * @param {string} params.text
 * @param {string} [params.username]
 */
async function postMattermostWebhook({core, webhookUrl, text, username = 'Mobile E2E'}) {
    if (!webhookUrl) {
        core.info('MATTERMOST webhook URL not set — skipping E2E channel notify');
        return;
    }

    const body = {
        username,
        icon_url: 'https://mattermost.com/wp-content/uploads/2022/02/icon.png',
        text,
    };

    await fetchWithTimeout(
        webhookUrl,
        {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body),
        },
        async (res) => {
            if (!res.ok) {
                throw new Error(`Mattermost webhook failed: ${res.status} ${await res.text()}`);
            }
            await res.text();
        },
    );
    core.info('Posted E2E summary to Mattermost channel');
}

/**
 * Build + post the channel message. Never throws to the caller — notify is best-effort.
 *
 * `perJobCounts` lets a caller supply already-merged counts. Rollup callers must do
 * this: their `compositeIdentity` is a routing bucket (`mobile-main`) with no TSIO
 * group of its own, so a bucket-scoped consolidated fetch returns nothing.
 *
 * @param {Object} params
 */
async function notifyCmtChannel({
    core,
    baseUrl,
    compositeIdentity,
    detail,
    reportUrl,
    runUrl,
    perJobCounts,
    failures,
    upstreamJobsSucceeded = true,
    hasFailures = false,
    webhookUrl,
}) {
    try {
        const resolvedWebhook = webhookUrl || resolveWebhookUrl(compositeIdentity?.name);
        let counts = perJobCounts;
        if (!counts) {
            counts = {};
            try {
                counts = await fetchPerJobCountsFromConsolidated(baseUrl, compositeIdentity, detail);
            } catch (error) {
                core.warning(`Could not load per-leg TSIO counts: ${error.message}`);
            }
        }

        const text = formatCmtChannelMessage({
            compositeIdentity,
            detail,
            reportUrl,
            runUrl,
            baseUrl,
            perJobCounts: counts,
            failures,
            upstreamJobsSucceeded,
            hasFailures,
        });

        await postMattermostWebhook({core, webhookUrl: resolvedWebhook, text});
    } catch (error) {
        core.warning(`E2E Mattermost notify failed: ${error.message}`);
    }
}

module.exports = {
    parseMobileJobName,
    parseCmtJobName: parseMobileJobName,
    resolveWebhookUrl,
    buildIndividualReportUrl,
    buildLegSummaries,
    formatLegResultText,
    reportTitleForIdentity,
    formatCmtChannelMessage,
    classifyFailure,
    failuresFromConsolidated,
    fetchFailuresFromConsolidated,
    fetchPerJobCountsFromConsolidated,
    postMattermostWebhook,
    notifyCmtChannel,
};
