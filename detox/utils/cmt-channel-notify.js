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
 *   cmt-mobile    → MATTERMOST_CMT_WEBHOOK_URL only (MM_E2E_RELEASE_WEBHOOK_URL)
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
    if (reportName === 'cmt-mobile') {
        return env.MATTERMOST_CMT_WEBHOOK_URL || '';
    }
    if (reportName === 'mobile-main') {
        return env.MATTERMOST_MASTER_HEALTH_WEBHOOK_URL || '';
    }
    if (reportName === 'mobile-pr') {
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

function reportTitleForIdentity(compositeIdentity) {
    switch (compositeIdentity?.name) {
        case 'cmt-mobile':
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
    baseUrl,
    perJobCounts,
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
            lines.push(
                `| ${formatLegName(leg)} | ${leg.passed} | ${leg.failed} | ${leg.skipped} | ${formatLegResultText(leg)} |`,
            );
        }
    }
    lines.push('');

    if (legs.length === 0) {
        lines.push('_No per-leg results available yet._', '');
    }

    if (!upstreamJobsSucceeded) {
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

    const consol = await fetchWithTimeout(
        `${baseUrl}/api/v1/reports/consolidated?${params}`,
        undefined,
        async (res) => {
            if (!res.ok) {
                throw new Error(`consolidated fetch failed: ${res.status} ${await res.text()}`);
            }
            return res.json();
        },
    );

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
 * @param {Object} params
 */
async function notifyCmtChannel({
    core,
    baseUrl,
    compositeIdentity,
    detail,
    reportUrl,
    upstreamJobsSucceeded = true,
    hasFailures = false,
    webhookUrl,
}) {
    try {
        const resolvedWebhook = webhookUrl || resolveWebhookUrl(compositeIdentity?.name);
        let perJobCounts = {};
        try {
            perJobCounts = await fetchPerJobCountsFromConsolidated(baseUrl, compositeIdentity, detail);
        } catch (error) {
            core.warning(`Could not load per-leg TSIO counts: ${error.message}`);
        }

        const text = formatCmtChannelMessage({
            compositeIdentity,
            detail,
            reportUrl,
            baseUrl,
            perJobCounts,
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
    fetchPerJobCountsFromConsolidated,
    postMattermostWebhook,
    notifyCmtChannel,
};
