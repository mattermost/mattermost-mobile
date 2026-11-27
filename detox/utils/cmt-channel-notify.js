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

// The consolidated report of a full Detox run takes TSIO about 20s to build.
const CONSOLIDATED_TIMEOUT_MS = 90_000;

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

// The verdict on each failed test comes from the E2E triage job (the toolkit's findings file, schema 2), which
// checked it against TSIO history: one judge for the run. Each test sits under what it means, in plain words.
const VERDICT_SECTIONS = [
    {key: 'product', title: '🐞 **Product bugs**'},
    {key: 'still', title: '↩️ **Still failing** — failed on the previous main run too'},
    {key: 'look', title: '🔎 **Needs a look**'},
    {key: 'test', title: '🧪 **Problems with the test, not product bugs**'},
    {key: 'flaky', title: '🔁 **Flaky, not product bugs**'},
    {key: 'setup', title: '⚙️ **Setup problems, not product bugs**'},
];
const TEST_PROBLEM_LABELS = new Set(['test bug', 'server compat', 'out of date', 'fixed on main']);
const MAX_PER_VERDICT = 5;

/**
 * Where one triage finding belongs. On main there is no PR: a test that passed every earlier main run and fails
 * now broke with a change since the last main run, so it is "new" rather than "needs a look" — unless triage
 * called it flaky or a problem with the test, which no merged change explains.
 *
 * @param {{class?: string, label?: string}} row - findings-file row
 * @param {boolean} onMain
 * @returns {{key: string, reason: string}}
 */
function verdictOf(row, onMain) {
    const label = row.label || '';
    const cls = row.class || '';
    if (label === 'app bug') {
        return {key: 'product', reason: 'the app does not do what the test expects'};
    }
    if (label === 'caused by PR') {
        return {key: onMain ? 'new' : 'product', reason: onMain ? 'this change edited the test' : 'caused by this change'};
    }
    if (cls === 'BROKEN_ON_TRUNK' || label === 'broken on main') {
        return {key: 'still', reason: ''};
    }
    if (cls === 'INFRA_ERROR') {
        return {key: 'setup', reason: 'the test device or server failed, not the app'};
    }
    if (label === 'flaky') {
        return {key: 'flaky', reason: 'failed by chance; it passes on retry or on other runs'};
    }
    if (TEST_PROBLEM_LABELS.has(label)) {
        return {key: 'test', reason: 'the test itself is wrong, not the app'};
    }
    if (onMain && cls === 'REGRESSION') {
        return {key: 'new', reason: ''};
    }
    if (cls === 'INSUFFICIENT_DATA') {
        return {key: 'look', reason: 'not enough history to tell'};
    }
    return {key: 'look', reason: 'the cause is not clear'};
}

function laneName(lane) {
    const parsed = parseMobileJobName(lane);
    return parsed ? formatLegName(parsed) : (lane || 'unknown run');
}

/**
 * A run where most tests failed at once: its setup (device, app build or server) or one broken screen explains
 * that better than as many separate failures.
 *
 * @param {Array<{failed: number, passed: number}>} legs - buildLegSummaries rows
 * @returns {string[]}
 */
function isMassFailure(leg) {
    return leg.failed >= 5 && leg.failed * 2 >= leg.passed + leg.failed;
}

function formatMassFailures(legs) {
    return (legs || []).
        filter(isMassFailure).
        map((leg) => `⚠️ **${formatLegName(leg)}: ${leg.failed} of ${leg.passed + leg.failed} tests failed.** When most of a run fails at once it is usually its setup (device, app build or server) or one broken screen — look at that run before the single tests.`);
}

/**
 * The changes merged since the last main run, the likely cause of a test that is new on main.
 *
 * @param {{from: string, to: string, prs: Array<{number: number, title: string}>, partial?: boolean} | null} changes
 * @param {string} repository
 * @returns {string}
 */
function formatChanges(changes, repository) {
    if (!changes) {
        return 'most likely from a change merged since the last main run';
    }
    if (changes.from === changes.to) {
        return 'no change was merged since the last main run, so no new change explains these';
    }
    const range = `\`${changes.from.slice(0, 7)}\` → \`${changes.to.slice(0, 7)}\``;
    if (!changes.prs.length) {
        return `most likely from a change merged since the last main run (${range})`;
    }
    const link = (pr) => `[#${pr.number}](https://github.com/${repository}/pull/${pr.number})`;
    if (changes.prs.length === 1 && !changes.partial) {
        return `most likely from ${link(changes.prs[0])} ${changes.prs[0].title}`;
    }
    const shown = changes.prs.slice(0, 3).map(link).join(' · ');
    if (changes.partial) {
        return `most likely from one of the many changes merged since the last main run (${range}), among them ${shown}`;
    }
    const more = changes.prs.length > 3 ? ` and ${changes.prs.length - 3} more` : '';
    return `most likely from one of the ${changes.prs.length} changes merged since the last main run: ${shown}${more}`;
}

/**
 * The verdict section from the triage findings of every run that had one (PR and CMT runs).
 *
 * @param {Object} params
 * @param {Array<{lane: string, findings?: Array, counts?: {flaky?: number}}>} params.triage - findings files
 * @param {Array} [params.legs] - buildLegSummaries rows, to name runs that failed with no triage verdict
 * @returns {string[]}
 */
function formatTriageVerdict({triage, legs = []}) {
    const entries = [];
    for (const lane of triage || []) {
        for (const row of lane.findings || []) {
            entries.push({lane: lane.lane, row, verdict: verdictOf(row, false)});
        }
    }
    const lines = [];
    for (const {key, title} of VERDICT_SECTIONS) {
        const group = entries.filter((e) => e.verdict.key === key);
        if (!group.length) {
            continue;
        }
        lines.push(`${title} (${group.length})`);
        for (const {lane, row, verdict} of group.slice(0, MAX_PER_VERDICT)) {
            // A Maestro flow's full title is its file path again: its own title says it.
            const name = row.full_title && !row.full_title.startsWith(row.file || '\0') ? row.full_title : row.title;
            const detail = row.ai?.explanation || verdict.reason;
            lines.push(`- ${laneName(lane)} ${name || 'unnamed test'}${detail ? ` — ${detail}` : ''}`);
        }
        if (group.length > MAX_PER_VERDICT) {
            lines.push(`- …and ${group.length - MAX_PER_VERDICT} more in the run`);
        }
        lines.push('');
    }

    // Tests that failed a try and passed the next are in no list above: they are flaky, not failures.
    const retried = (triage || []).filter((lane) => (lane.counts?.flaky || 0) > 0);
    if (retried.length) {
        const total = retried.reduce((n, lane) => n + lane.counts.flaky, 0);
        lines.push(`🔁 **Passed on retry, not product bugs:** ${total} test${total === 1 ? '' : 's'} (${retried.map((lane) => `${laneName(lane.lane)} ${lane.counts.flaky}`).join(', ')})`, '');
    }

    // Any failed test not covered by a triage finding is reported as not checked instead of re-judged locally.
    const verdicts = new Map();
    for (const lane of triage || []) {
        const key = legKeyOf(lane.lane);
        if (!key) {
            continue;
        }
        verdicts.set(key, (verdicts.get(key) || 0) + (lane.findings || []).length);
    }
    const unchecked = [];
    for (const leg of legs || []) {
        const key = legKey(leg);
        const accounted = verdicts.get(key) || 0;
        const missing = leg.failed - accounted;
        if (missing > 0) {
            unchecked.push(accounted ? `${formatLegName(leg)} (${missing} of ${leg.failed} failed tests)` : formatLegName(leg));
        }
    }
    if (unchecked.length) {
        lines.push(`⚙️ **Not checked:** ${unchecked.join(', ')} — the triage job left no verdict; look at the run`, '');
    }
    return lines;
}

// TSIO names a failed test "Suite › test"; a triage finding names it by its title ("test") and full title
// ("Suite test", or a Maestro flow's file path).
function namedIn(names, title) {
    const text = title || '';
    return names.has(text) || names.has(text.split(' › ').pop()) || names.has(text.replace(/ › /g, ' '));
}

// One key per run: CMT runs of the same framework and platform differ by server version.
function legKey({framework, platform, serverVersion}) {
    return `${framework}-${platform}-${serverVersion}`;
}

function legKeyOf(jobName) {
    const parsed = parseMobileJobName(jobName);
    return parsed ? legKey(parsed) : null;
}

function bucketOf(compositeIdentity) {
    const {webhookBucketForReportName} = require('./build-tsio-job-config');
    return webhookBucketForReportName(compositeIdentity?.run_group || compositeIdentity?.name || '');
}

// Main and CMT runs answer one question per failed test; a PR run keeps the detailed message.
function postsShortMessage(compositeIdentity) {
    return ['mobile-main', 'mobile-release'].includes(bucketOf(compositeIdentity));
}

// After a merge the channel needs one answer per failed test: a product bug, or not one. Only a test that fails
// again on a fresh device (rerun-failed.js) is a product bug; what was not re-run is not confirmed either way.
const NOT_PRODUCT_BUGS = [
    {key: 'fresh-pass', label: 'passed on a fresh device'},
    {key: 'flaky', label: 'flaky'},
    {key: 'still', label: 'already failing before this run'},
    {key: 'test', label: 'a problem with the test'},
    {key: 'setup', label: 'setup (device or server)'},
];

const UNCLEARED = new Set(['product', 'new', 'look']);
const MAX_NAMED_BUGS = 5;
const CMT_FLAKY_BUCKETS = NOT_PRODUCT_BUGS.filter(({key}) => key !== 'test');
const countWord = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const cut = (text, max) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

// Mobile's narrow post-triage check for harness/setup errors unique to Detox/Maestro (toolkit already handles
// DeviceUnreachable, Detox isReady crashes, feature_disabled, and small-suite storms upstream).
const SETUP_ERRORS = [
    /Exceeded timeout of \d+ ?ms for a (hook|test)/,
    /No response from server|socket hang up|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|\{"(id|message)":"/,
    /never (became|reached)|could not (confirm|enable)|did not attach file|seed failed|server baseline|apiCheckSystemHealth/,
    /DeviceServerDied|"reactNativeReload"/,
];
const TEST_CODE_ERRORS = /^(TypeError|ReferenceError|SyntaxError):/;

// The server says a feature is off (attributes_feature_disabled / permission_policies.feature_disabled): every spec of that feature fails on this server.
const FEATURE_OFF = /(?:^|[._])feature_disabled\b|feature is not enabled|not enabled on this server/i;
const specFolder = (file) => (file || '').replace(/\/[^/]*$/, '');

// The same failure, whatever its numbers and ids.
function errorSignature(text) {
    return (text || '').split('\n')[0].replace(/[0-9a-f]{8,}|\d+/gi, '#').trim();
}

function causeOfError(text) {
    const line = (text || '').split('\n')[0];
    if (TEST_CODE_ERRORS.test(line)) {
        return 'test';
    }
    return SETUP_ERRORS.some((pattern) => pattern.test(line)) ? 'setup' : null;
}

/**
 * A finding's verdict after mobile's judge: triage's, unless the failure is one triage left uncleared and
 *   - its error is setup, the harness, the device or the test's code (causeOfError);
 *   - the server said the feature is off for another spec in the same folder: setup;
 *   - at least half of the tests that ran in the lane, and 3 or more, failed with the same error: the run, not each test;
 *   - a test in the lane failed with the same error and passed on its retry (retried, from TSIO): flaky.
 *
 * @param {Object} row - finding (schema 2)
 * @param {{findings?: Array, counts?: Object}} lane - its findings file
 * @param {Iterable<string>} [retried] - errors of the lane's tests that failed and then passed their retry
 * @returns {string} verdict key
 */
function judgeFinding(row, lane, retried) {
    const key = verdictOf(row, true).key;
    if (!UNCLEARED.has(key)) {
        return key;
    }
    const cause = causeOfError(row.error_first_line);
    if (cause) {
        return cause;
    }
    const folder = row.file && specFolder(row.file);
    if (folder && (lane.findings || []).some((other) => specFolder(other.file) === folder && FEATURE_OFF.test(other.error_first_line || ''))) {
        return 'setup';
    }
    const signature = errorSignature(row.error_first_line);
    if (signature) {
        const same = (lane.findings || []).filter((other) => errorSignature(other.error_first_line) === signature).length;
        const counts = lane.counts || {};
        const ran = (counts.passed || 0) + (counts.failed || 0) + (counts.flaky || 0);
        if (same >= 3 && same * 2 >= ran) {
            return 'setup';
        }
        if ([...(retried || [])].some((error) => errorSignature(error) === signature)) {
            return 'flaky';
        }
    }
    return key;
}

/**
 * Evaluate per-test verdicts from triage findings, fresh-device reruns, and unjudged TSIO failures.
 * Shared by formatMainChannelMessage and buildAgentHandoff so both classify identically.
 */
function evaluateMainVerdicts({legs, failures, triage, rerun}) {
    const {lookupRerunResult} = require('./rerun-failed');
    const verdicts = [];
    const named = new Map();
    for (const lane of triage || []) {
        const leg = legKeyOf(lane.lane);
        const names = named.get(leg) || new Set();
        const retried = (failures || []).
            filter((failure) => failure.passedOnRetry && legKeyOf(failure.job) === leg).
            map((failure) => failure.error);
        for (const row of lane.findings || []) {
            // What the error text leaves uncleared, the fresh-device re-run decides: failed again is a product
            // bug, passed is not one. Only without a re-run result does a retry of the same error clear it.
            let key = judgeFinding(row, lane);
            const again = UNCLEARED.has(key) ? lookupRerunResult(rerun?.results?.[lane.lane], row) : undefined;
            if (again === 'failed') {
                key = 'confirmed';
            } else if (again === 'passed') {
                key = 'fresh-pass';
            } else if (UNCLEARED.has(key)) {
                key = judgeFinding(row, lane, retried);
                if (UNCLEARED.has(key) && rerun?.stale?.[lane.lane]?.includes(row.title)) {
                    key = 'stale';
                }
            }
            verdicts.push({
                key,
                leg,
                lane: lane.lane,
                title: row.title,
                fullTitle: row.full_title || row.title,
                file: row.file || '',
                label: row.label || '',
                aiCause: row.ai?.cause || null,
                aiConfidence: typeof row.ai?.confidence === 'number' ? row.ai.confidence : null,
                explanation: row.ai?.explanation || null,
                error: row.error_first_line || null,
                new: verdictOf(row, true).key === 'new',
            });
            names.add(row.full_title || row.title).add(row.title);
        }
        named.set(leg, names);
    }
    const unjudged = (failures || []).filter((failure) => {
        const names = named.get(legKeyOf(failure.job));
        return !failure.passedOnRetry && !(names && namedIn(names, failure.title));
    });
    for (const failure of unjudged) {
        const fallback = causeOfError(failure.error);
        verdicts.push({
            key: fallback || 'look',
            leg: legKeyOf(failure.job),
            lane: failure.job || '',
            title: failure.title || '',
            fullTitle: failure.title || '',
            file: '',
            label: fallback === 'test' ? 'test bug' : 'needs investigation',
            aiCause: null,
            aiConfidence: null,
            explanation: null,
            error: (failure.error || '').split('\n')[0] || null,
        });
    }
    for (const leg of legs) {
        const key = legKey(leg);
        const missing = leg.failed - verdicts.filter((v) => v.leg === key).length;
        for (let i = 0; i < missing; i++) {
            verdicts.push({key: 'look', leg: key});
        }
    }
    return verdicts;
}

/** Deduplicate named verdicts across platforms/servers so each unique test is shown once. */
function groupMobileTests(items) {
    const byTest = new Map();
    for (const v of items) {
        if (!v.title) {
            continue;
        }
        const mapKey = `${v.file || ''}\n${v.fullTitle || v.title}`;
        const parsed = parseMobileJobName(v.lane);
        const server = parsed?.kind === 'cmt' ? parsed.serverVersion : '';
        const legId = parsed && server ? `${parsed.framework}-${parsed.platform}/${server}` : (v.lane || v.leg || 'unknown');
        const seen = byTest.get(mapKey);
        if (!seen) {
            byTest.set(mapKey, {
                key: v.key,
                title: v.title,
                fullTitle: v.fullTitle || v.title,
                file: v.file || '',
                label: v.label || '',
                aiCause: v.aiCause ?? null,
                aiConfidence: v.aiConfidence ?? null,
                explanation: v.explanation || null,
                error: v.error || null,
                lanes: v.lane ? [v.lane] : [],
                servers: server ? [server] : [],
                failedLegs: [legId],
            });
            continue;
        }
        if (v.lane && !seen.lanes.includes(v.lane)) {
            seen.lanes.push(v.lane);
        }
        if (server && !seen.servers.includes(server)) {
            seen.servers.push(server);
        }
        if (!seen.failedLegs.includes(legId)) {
            seen.failedLegs.push(legId);
        }
        seen.explanation = seen.explanation || v.explanation;
        seen.error = seen.error || v.error;
        seen.aiCause = seen.aiCause || v.aiCause;
        if (seen.aiConfidence === null && typeof v.aiConfidence === 'number') {
            seen.aiConfidence = v.aiConfidence;
        }
    }
    return [...byTest.values()].sort((a, b) => b.failedLegs.length - a.failedLegs.length || a.title.localeCompare(b.title));
}

function formatCmtTestLine(g) {
    const id = (/^(MM-T?\d+(?:_\d+)?)\b/).exec(g.title)?.[1];
    const rest = id ? cut(g.title.slice(id.length).replace(/^[\s-]+/, ''), 50) : '';
    let display = `\`${cut(g.title, 55)}\``;
    if (id) {
        display = rest ? `\`${id}\` ${rest}` : `\`${id}\``;
    }
    let reason = g.explanation ? cut(g.explanation, 160) : '';
    if (!reason) {
        if (g.key === 'stale') {
            reason = 'out of date on this branch';
        } else if (g.key === 'test') {
            reason = g.label === 'server compat' ? 'server compatibility test issue' : 'the test itself is wrong, not the app';
        } else if (g.error) {
            reason = cut(g.error, 140);
        } else if (g.key === 'confirmed') {
            reason = 'failed again on a fresh device';
        } else {
            reason = 'not confirmed — needs a look';
        }
    }
    const where = g.lanes.slice(0, 3).map(laneName).join(', ') + (g.lanes.length > 3 ? ` +${g.lanes.length - 3} more` : '');
    return `• ${display} — ${reason}${where ? ` · ${where}` : ''}`;
}

/** Mobile CMT (`mobile-release`) 3-bucket summary; always posts, including a 2-line green pass. */
function formatMobileCmtMessage({title, on, legs, verdicts, confirmed, unconfirmed, setupLines, unexplained, perRun, retried, rerun, passed, failed, skipped, reportUrl, runUrl}) {
    const productGroups = groupMobileTests(confirmed);
    const testGroups = groupMobileTests(verdicts.filter((v) => v.key === 'test' || v.key === 'stale'));
    const unconfirmedGroups = groupMobileTests(unconfirmed);
    const unnamedUnconfirmed = unconfirmed.filter((v) => !v.title);
    const flakyParts = CMT_FLAKY_BUCKETS.
        map(({key, label}) => ({label, count: verdicts.filter((v) => v.key === key).length})).
        filter(({count}) => count > 0).
        map(({label, count}) => `${count} ${label}`);
    if (retried) {
        flakyParts.push(`${retried} passed on retry`);
    }

    const testTag = testGroups.length ? ` · ${countWord(testGroups.length, 'test bug', 'test bugs')}` : '';
    let headline;
    if (confirmed.length) {
        headline = `:red_circle: **${title}**${on}: ${countWord(productGroups.length || confirmed.length, 'product bug', 'product bugs')} found${testTag}`;
    } else if (unconfirmed.length || unexplained) {
        const n = unconfirmedGroups.length + unnamedUnconfirmed.length;
        const heldText = n ? ` · ${n} ${n === 1 ? 'failure needs' : 'failures need'} a look` : '';
        headline = `:yellow_circle: **${title}**${on}: no product bugs confirmed${heldText}${testTag}`;
    } else if (setupLines.length || verdicts.some((v) => v.key === 'setup')) {
        headline = `:yellow_circle: **${title}**${on}: setup problem${testTag}`;
    } else if (testGroups.length) {
        headline = `:green_circle: **${title}**${on}: no product bugs found${testTag}`;
    } else if (failed > 0 || flakyParts.length) {
        headline = `:green_circle: **${title}**${on}: no product bugs found`;
    } else {
        headline = `:green_circle: **${title}**${on}: all tests passed`;
    }

    const lines = [headline];
    const massFlagged = new Set();
    for (const [lane, totalFailed] of Object.entries(rerun?.tooMany || {})) {
        const key = legKeyOf(lane);
        if (key) {
            massFlagged.add(key);
        }
        lines.push(`⚠️ **${laneName(lane)}: ${totalFailed} failed at once, too many to re-run** — check that run's setup first.`);
    }
    lines.push(...formatMassFailures(legs.filter((leg) => !massFlagged.has(legKey(leg)))));

    const pushGroup = (heading, groups) => {
        if (!groups.length) {
            return;
        }
        lines.push(`${heading} (${groups.length})`, ...groups.slice(0, MAX_NAMED_BUGS).map(formatCmtTestLine));
        if (groups.length > MAX_NAMED_BUGS) {
            lines.push(`…and ${groups.length - MAX_NAMED_BUGS} more in the run`);
        }
    };
    pushGroup('🐞 **Product bugs**', productGroups);
    if (unconfirmedGroups.length || unnamedUnconfirmed.length) {
        const totalUnconfirmed = unconfirmedGroups.length + unnamedUnconfirmed.length;
        lines.push(`🔎 **Needs a look** (${totalUnconfirmed})`);
        for (const g of unconfirmedGroups.slice(0, MAX_NAMED_BUGS)) {
            lines.push(formatCmtTestLine(g));
        }
        if (unconfirmedGroups.length > MAX_NAMED_BUGS) {
            lines.push(`…and ${unconfirmedGroups.length - MAX_NAMED_BUGS} more in the run`);
        }
        if (unnamedUnconfirmed.length) {
            lines.push(`• ${perRun(unnamedUnconfirmed)}`);
        }
    }
    pushGroup('🧪 **Test bugs**', testGroups);
    if (unexplained) {
        lines.push('🔎 TSIO reported failed runs that are not in the test totals; see the report.');
    }
    if (flakyParts.length) {
        lines.push(`🔁 **Flaky / Infra:** ${flakyParts.join(' · ')}`);
    }
    lines.push(...setupLines);

    const hasBrief = productGroups.length + testGroups.length + unconfirmedGroups.length > 0;
    const links = [
        reportUrl && `[Report](${reportUrl})`,
        runUrl && `[${hasBrief ? 'Run & Fix Brief' : 'Run'}](${runUrl})`,
    ].filter(Boolean);
    lines.push([`${passed} passed`, `${failed} failed`, `${skipped} skipped`, ...links].join(' · '));
    return lines.join('\n') + '\n';
}

/**
 * The main and CMT message, a few lines as on desktop: product bugs (failed again on a fresh device), failures not
 * confirmed either way, test bugs (broken out on CMT), then what is not a product bug. Main returns null when clean
 * or cleared; CMT delegates to formatMobileCmtMessage and always posts.
 *
 * @param {Object} params - see formatCmtChannelMessage; `rerun` is {lanes, tooMany, results} from rerun-failed.js
 * @returns {string|null}
 */
function formatMainChannelMessage({
    compositeIdentity,
    detail,
    reportUrl,
    runUrl,
    baseUrl,
    perJobCounts,
    failures,
    triage,
    changes = null,
    rerun = null,
    upstreamJobsSucceeded = true,
    hasFailures = false,
}) {
    const legs = buildLegSummaries(perJobCounts, detail?.reports || [], baseUrl);

    // Each test once (the per-test counts): TSIO's group totals count every failed entry of a test.
    const stats = detail?.test_stats || {};
    const sum = (field) => legs.reduce((n, leg) => n + leg[field], 0);
    const passed = legs.length ? sum('passed') : (stats.passed ?? 0) + (stats.flaky ?? 0);
    const failed = legs.length ? sum('failed') : stats.failed ?? 0;
    const skipped = legs.length ? sum('skipped') : stats.skipped ?? 0;

    const verdicts = evaluateMainVerdicts({legs, failures, triage, rerun});
    const confirmed = verdicts.filter((v) => v.key === 'confirmed');
    const unconfirmed = verdicts.filter((v) => UNCLEARED.has(v.key));
    const stale = verdicts.filter((v) => v.key === 'stale');
    const setupLines = [];
    const noResults = legs.filter((leg) => leg.status === 'missing' || leg.status === 'no-results');
    if (noResults.length) {
        setupLines.push(`⚙️ **No results:** ${noResults.map(formatLegName).join(', ')} — test results did not upload, or the run ran no tests; re-run to see if anything failed`);
    }
    if (detail?.status === 'pending') {
        setupLines.push('⚙️ **Incomplete results:** one or more test groups could not be read from TSIO — look at the run');
    }
    if (!upstreamJobsSucceeded && failed === 0) {
        setupLines.push('⚙️ A CI job failed outside the tests (install, build or teardown).');
    }
    const unexplained = upstreamJobsSucceeded && hasFailures && failed === 0;

    // Each run once, with its count; a run where most tests failed at once is flagged where it first appears.
    const flagged = new Set();
    const perRun = (group) => {
        const parts = legs.
            map((leg) => ({leg, count: group.filter((v) => v.leg === legKey(leg)).length})).
            filter(({count}) => count > 0).
            map(({leg, count}) => {
                const name = leg.reportUrl ? `[${formatLegName(leg)}](${leg.reportUrl})` : formatLegName(leg);
                let note = '';
                const tooMany = Object.entries(rerun?.tooMany || {}).find(([lane]) => legKeyOf(lane) === legKey(leg))?.[1];
                if ((tooMany || isMassFailure(leg)) && !flagged.has(leg)) {
                    flagged.add(leg);
                    const what = tooMany ? `${tooMany} failed at once, too many to re-run` : `${leg.failed} of ${leg.passed + leg.failed} tests failed`;
                    note = ` (${what}: check that run's setup first)`;
                }
                return {text: `${name} ${count}${note}`, count};
            });
        const other = group.length - parts.reduce((n, part) => n + part.count, 0);
        return [...parts.map((part) => part.text), ...(other > 0 ? [`other runs ${other}`] : [])].join(' · ');
    };

    const title = reportTitleForIdentity(compositeIdentity);
    const branch = (compositeIdentity?.branch || '').replace(/^refs\/(heads|tags)\//, '');
    const on = branch ? ` on \`${branch}\`` : '';
    const retried = Object.values(perJobCounts || {}).reduce((n, counts) => n + (counts.flaky || 0), 0) ||
        (triage || []).reduce((n, lane) => n + (lane.counts?.flaky || 0), 0);

    if (bucketOf(compositeIdentity) === 'mobile-release') {
        return formatMobileCmtMessage({
            title, on, legs, verdicts, confirmed, unconfirmed, setupLines, unexplained, perRun, retried, rerun, passed, failed, skipped, reportUrl, runUrl,
        });
    }

    let header;
    if (confirmed.length) {
        header = `🔴 **${title} — product bug**${on}`;
    } else if (unconfirmed.length || stale.length || unexplained) {
        header = `🟡 **${title} — no product bug confirmed**${on}`;
    } else if (setupLines.length || verdicts.some((v) => v.key === 'setup')) {
        header = `🟡 **${title} — setup problem**${on}`;
    } else {
        return null;
    }

    const shortSha = (compositeIdentity?.commit_sha || '').slice(0, 7);
    const newOnMain = bucketOf(compositeIdentity) === 'mobile-main' && confirmed.some((v) => v.new);
    const lines = [
        header,
        [shortSha && `\`${shortSha}\``, newOnMain && formatChanges(changes, compositeIdentity?.repository || 'mattermost/mattermost-mobile')].filter(Boolean).join(' · '),
        `**${failed} failed** · ${passed} passed · ${skipped} skipped`,
    ].filter(Boolean);
    if (confirmed.length) {
        lines.push(`🐞 **Product bugs (${confirmed.length}) — failed again on a fresh device:** ${perRun(confirmed)}`);
        for (const v of confirmed.slice(0, MAX_NAMED_BUGS)) {
            lines.push(`- ${laneName(v.lane)} ${v.title}${v.explanation ? ` — ${v.explanation}` : ''}`);
        }
        if (confirmed.length > MAX_NAMED_BUGS) {
            lines.push(`- …and ${confirmed.length - MAX_NAMED_BUGS} more in the report`);
        }
    }
    if (unconfirmed.length) {
        lines.push(`🔎 **Not confirmed (${unconfirmed.length}) — not re-run, or the re-run gave no result:** ${perRun(unconfirmed)}`);
    }
    if (stale.length) {
        lines.push(`📝 **Test differs from main (${stale.length}) — out of date on this branch, not re-run:** ${perRun(stale)}`);
    }
    if (unexplained) {
        lines.push('🔎 TSIO reported failed runs that are not in the test totals; see the report.');
    }

    const notProduct = NOT_PRODUCT_BUGS.
        map(({key, label}) => ({label, count: verdicts.filter((v) => v.key === key).length})).
        filter(({count}) => count > 0).
        map(({label, count}) => `${count} ${label}`);
    if (retried) {
        notProduct.push(`${retried} passed on retry`);
    }
    if (notProduct.length) {
        lines.push(`🔁 **Not product bugs:** ${notProduct.join(' · ')}`);
    }
    lines.push(...setupLines);

    const links = [reportUrl && `[Full report](${reportUrl})`, runUrl && `[Workflow run](${runUrl})`].filter(Boolean).join(' · ');
    if (links) {
        lines.push(`➡️ ${links}`);
    }
    return lines.join('\n') + '\n';
}

function mobileReproHint(file) {
    if (!file) {
        return '';
    }
    if (file.startsWith('detox/maestro/') || (/\.ya?ml$/).test(file)) {
        return `maestro test ${file}`;
    }
    return `npx jest --config detox/e2e/config.js ${file}`;
}

/**
 * Structured agent-handoff payload (schema 1, matching desktop) for actionable Mobile CMT bugs:
 * product bugs (draft investigation), test/stale/compat bugs (fix PR), and unsettled failures.
 */
function buildAgentHandoff({compositeIdentity, detail, perJobCounts, failures, triage, rerun, reportUrl = '', runUrl = ''}) {
    const repository = compositeIdentity?.repository || 'mattermost/mattermost-mobile';
    const branch = (compositeIdentity?.branch || '').replace(/^refs\/(heads|tags)\//, '');
    const commitSha = compositeIdentity?.commit_sha || '';
    const legs = buildLegSummaries(perJobCounts, detail?.reports || []);
    const verdicts = evaluateMainVerdicts({legs, failures, triage, rerun});

    const groups = [
        ...groupMobileTests(verdicts.filter((v) => v.key === 'confirmed')).map((g) => ({g, kind: 'product_bug', mode: 'draft_investigation'})),
        ...groupMobileTests(verdicts.filter((v) => v.key === 'test' || v.key === 'stale')).map((g) => ({
            g,
            kind: g.label === 'server compat' ? 'server_compat' : 'test_bug',
            mode: 'fix_pr',
        })),
        ...groupMobileTests(verdicts.filter((v) => UNCLEARED.has(v.key))).map((g) => ({g, kind: 'needs_investigation', mode: 'investigate'})),
    ];

    const items = groups.map(({g, kind, mode}) => ({
        schema: 1,
        kind,
        mode,
        repository,
        branch,
        commit_sha: commitSha,
        test: {title: g.title, full_title: g.fullTitle, file: g.file},
        triage: {
            label: g.key === 'stale' ? 'out of date' : (g.label || g.key),
            ai_cause: g.aiCause ?? null,
            ai_confidence: g.aiConfidence ?? null,
            explanation: g.explanation ?? null,
            error_first_line: g.error ?? null,
        },
        matrix: {
            failed: g.failedLegs,
            passed_servers: [],
        },
        repro_hint: mobileReproHint(g.file),
        links: {report_url: reportUrl, run_url: runUrl},
    }));
    return {schema: 1, repository, branch, commit_sha: commitSha, run_url: runUrl, report_url: reportUrl, items};
}

const BRIEF_TAG = {
    product_bug: '🐞 Product bug (draft PR — do not auto-merge)',
    test_bug: '🧪 Test bug (safe for fix PR)',
    server_compat: '🧪 Server compat test bug (safe for fix PR)',
    needs_investigation: '🔎 Needs investigation',
};

/** Copy-pasteable Markdown Agent Fix Brief for GITHUB_STEP_SUMMARY. Empty when no actionable items exist. */
function formatAgentFixBrief(handoff) {
    if (!handoff?.items?.length) {
        return '';
    }
    const lines = [`### 🤖 Agent Fix Brief (${handoff.items.length} actionable)`, ''];
    for (const item of handoff.items) {
        const conf = typeof item.triage.ai_confidence === 'number' ? ` (confidence ${Math.round(item.triage.ai_confidence * 100)}%)` : '';
        lines.push(`#### ${BRIEF_TAG[item.kind] || item.kind}: \`${item.test.title}\``);
        if (item.test.file) {
            lines.push(`- **Spec:** \`${item.test.file}\``);
        }
        if (item.matrix.failed.length) {
            const passed = item.matrix.passed_servers.length ? ` · Passed servers: ${item.matrix.passed_servers.join(', ')}` : '';
            lines.push(`- **Matrix:** Failed on ${item.matrix.failed.join(', ')}${passed}`);
        }
        if (item.triage.explanation) {
            lines.push(`- **AI diagnosis:** ${item.triage.explanation}${conf}`);
        }
        if (item.triage.error_first_line) {
            lines.push(`- **Error:** \`${cut(item.triage.error_first_line, 200)}\``);
        }
        if (item.repro_hint) {
            lines.push(`- **Repro:** \`${item.repro_hint}\``);
        }
        lines.push('');
    }
    return lines.join('\n');
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
 * @returns {string|null} null when there is nothing to post: the run passed, or (main and CMT) no failure is a
 *   product bug (see formatMainChannelMessage)
 */
function formatCmtChannelMessage(params) {
    if (postsShortMessage(params.compositeIdentity)) {
        return formatMainChannelMessage(params);
    }
    const {
        compositeIdentity,
        detail,
        reportUrl,
        runUrl,
        baseUrl,
        perJobCounts,
        failures,
        triage,
        upstreamJobsSucceeded = true,
        hasFailures = false,
    } = params;
    const stats = detail?.test_stats || {};

    const passed = (stats.passed ?? 0) + (stats.flaky ?? 0);
    const failed = stats.failed ?? 0;
    const skipped = stats.skipped ?? 0;
    const overallFailed = failed > 0 ||
        detail?.status !== 'completed' ||
        !upstreamJobsSucceeded ||
        hasFailures;

    // The channel hears about a run only when something failed: the PR's checks already show a pass.
    if (!overallFailed) {
        return null;
    }
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

    const massFailures = formatMassFailures(legs);
    if (massFailures.length) {
        lines.push(...massFailures, '');
    }

    // The triage job's verdicts when it ran; without triage, name failing tests neutrally without legacy heuristics.
    if (triage?.length) {
        lines.push(...formatTriageVerdict({triage, legs}));
    } else if ((failures || []).length > 0) {
        const active = failures.filter((f) => !f.passedOnRetry);
        if (active.length) {
            lines.push(`🔎 **Not checked by triage (${active.length})**`);
            for (const failure of active.slice(0, MAX_PER_VERDICT)) {
                lines.push(`- ${laneName(failure.job)} ${failure.title || 'unnamed test'}`);
            }
            if (active.length > MAX_PER_VERDICT) {
                lines.push(`- …and ${active.length - MAX_PER_VERDICT} more in the report`);
            }
            lines.push('');
        }
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

    const triesByTest = {}; // job → Map(spec → the statuses of its tries in this attempt)
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
            if (!triesByTest[job]) {
                triesByTest[job] = new Map();
            }
            const tries = triesByTest[job];
            tries.set(spec, [...(tries.get(spec) || []), entry.status || 'failed']);
        }
    }

    const counts = {};
    for (const [job, tries] of Object.entries(triesByTest)) {
        counts[job] = {passed: 0, failed: 0, skipped: 0, flaky: 0};
        for (const statuses of tries.values()) {
            counts[job][outcomeOf(statuses)] += 1;
        }
    }
    return counts;
}

const OUTCOMES = ['passed', 'failed', 'skipped', 'flaky'];

/**
 * One outcome per test of a run. TSIO keeps each try as its own entry (failed, then passed on the retry), so a
 * test that failed a try and passed the next is flaky, and one that failed every try failed once. A status TSIO
 * does not name counts as failed.
 *
 * @param {string[]} statuses - the test's tries in this attempt
 * @returns {string}
 */
function outcomeOf(statuses) {
    const failed = statuses.some((status) => status === 'failed' || !OUTCOMES.includes(status));
    const passed = statuses.some((status) => status === 'passed' || status === 'flaky');
    if (statuses.includes('flaky') || (failed && passed)) {
        return 'flaky';
    }
    if (failed) {
        return 'failed';
    }
    return passed ? 'passed' : 'skipped';
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
        const isCurrentAttempt = (entry) =>
            entry.commit_sha === commitSha &&
            Number.parseInt(entry.run_attempt || '0', 10) === attempt;

        // The payload is scoped to this GitHub run (gh_run_id + commit), so an
        // entry for this commit at any attempt belongs to this run — including
        // an earlier re-run attempt. Those are not "earlier history": a pass in
        // attempt 1 must not corroborate an app-bug call in attempt 2.
        const isCurrentRun = (entry) => entry.commit_sha === commitSha;
        const current = history.filter(isCurrentAttempt);
        const failedHere = current.find((entry) => entry.status === 'failed');
        if (!failedHere) {
            continue;
        }
        failures.push({
            job: idToJob[failedHere.report_id] || '',
            title: spec.full_title || '',
            error: failedHere.error_message || '',
            previousStatuses: history.filter((entry) => !isCurrentRun(entry)).map((entry) => entry.status || 'failed'),
            passedOnRetry: outcomeOf(current.filter((entry) => entry.report_id === failedHere.report_id).map((entry) => entry.status || 'failed')) === 'flaky',
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

    // The endpoint's attempt filter is run_attempt (gh_run_attempt is ignored
    // server-side — verified against the consolidated API).
    if (compositeIdentity.gh_run_attempt) {
        params.set('run_attempt', String(compositeIdentity.gh_run_attempt));
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
        CONSOLIDATED_TIMEOUT_MS,
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
// Test names and errors come from the tests ("…when posting @all, @channel, and @here"): a zero-width space after
// each @ keeps them from mentioning, and emailing, the whole channel.
function withoutMentions(text) {
    return (text || '').replace(/@(?=[\w.-])/g, '@\u200b');
}

async function postMattermostWebhook({core, webhookUrl, text, username = 'Mobile E2E'}) {
    if (!webhookUrl) {
        core.info('MATTERMOST webhook URL not set — skipping E2E channel notify');
        return;
    }

    const body = {
        username,
        icon_url: 'https://mattermost.com/wp-content/uploads/2022/02/icon.png',
        text: withoutMentions(text),
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
    triage,
    changes,
    rerun,
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
            triage,
            changes,
            rerun,
            upstreamJobsSucceeded,
            hasFailures,
        });
        if (!text) {
            core.info('E2E channel notify: the run passed, or no failure is a product bug or a setup problem — nothing to post');
            return;
        }

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
    buildAgentHandoff,
    formatAgentFixBrief,
    formatTriageVerdict,
    judgeFinding,
    formatMassFailures,
    verdictOf,
    failuresFromConsolidated,
    fetchFailuresFromConsolidated,
    fetchPerJobCountsFromConsolidated,
    postMattermostWebhook,
    notifyCmtChannel,
};
