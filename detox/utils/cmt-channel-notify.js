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

const JUDGEMENTS = {
    'app-bug': {emoji: '🔴', heading: 'Suspected app bug — corroborated, needs investigation'},
    investigate: {emoji: '🔍', heading: 'Needs a closer look — not enough evidence to call it an app bug'},
    flaky: {emoji: '🟠', heading: 'Flaky — intermittent in TSIO history'},
    known: {emoji: '⚪', heading: 'Known failing — also failed before this run'},
    infra: {emoji: '⚠️', heading: 'Infra / environment — not an app failure'},
};

// A visibility/existence wait expiring says the UI was not in the expected
// state in time — timing, navigation, or a slow server explain it at least as
// well as an app bug, so it is never enough on its own for "app bug".
const TIMING_ERROR_PATTERNS = [
    /timed out while waiting|timeout expired/i,
    /TOEXIST|TOBEVISIBLE|to be visible|not visible/i,
    /Failed expectation/i,
];

// A direct assertion on content or state (expected X, got Y) is the kind of
// failure an app bug actually produces — unlike a wait expiring.
const HARD_ASSERTION_PATTERNS = [
    /toHaveText|toHaveLabel|toHaveValue/i,
    /expected .{0,80} to (be|equal|match|contain)/i,
    /Expected:[\s\S]{0,120}Received:/i,
    /AssertionError/i,
];

const INFRA_ERROR_PATTERNS = [
    /attributes_feature_disabled|not enabled on this server/i,
    /simctl|NSPOSIXErrorDomain|Failed to CreateArtifact/i,
    /ENOTFOUND|ETIMEDOUT|ECONNREFUSED|ECONNRESET|socket hang up/i,
    /Exceeded timeout of \d+ ?ms for a hook/i,
    /Cannot read properties of undefined \(reading '(id|channel|team|user)'\)/i,
    /test server (is )?(down|unreachable)|server did not (respond|become ready)/i,
];

/**
 * Judge one failing test from the evidence TSIO has for it. "app-bug" is the
 * last resort, not the default: it needs a direct content/state assertion
 * (not a wait expiring) AND corroboration — the same test failing on another
 * leg of this run, or a test that passed in earlier history now failing that
 * assertion. Anything weaker is "investigate": one observation of a timing
 * wait is as consistent with a flake or a slow server as with an app bug.
 *
 * @param {{title?: string, error?: string, previousStatuses?: string[], passedOnRetry?: boolean, alsoFailedElsewhere?: boolean}} failure
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
    if (TIMING_ERROR_PATTERNS.some((pattern) => pattern.test(error))) {
        return {category: 'investigate', reason: 'visibility/existence wait expired — timing, navigation, or app; needs a repro or a repeat before calling it an app bug'};
    }
    if (!HARD_ASSERTION_PATTERNS.some((pattern) => pattern.test(error))) {
        return {category: 'investigate', reason: 'single observation with no direct assertion in the error — needs a repro or a repeat'};
    }
    if (failure?.alsoFailedElsewhere) {
        return {category: 'app-bug', reason: 'direct assertion failed on more than one leg of this run, no infra cause in the error'};
    }
    if (sawPass) {
        return {category: 'app-bug', reason: 'passed in earlier runs and now fails a direct assertion, no infra cause in the error'};
    }
    return {category: 'investigate', reason: 'direct assertion, but a single observation with no earlier history — needs a repeat before calling it an app bug'};
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

/**
 * @param {Array} failures - failed tests from TSIO
 * @returns {Array<{failure: Object, verdict: {category: string, reason: string}}>}
 */
function judgeFailures(failures) {
    // Corroboration for the app-bug gate: the same test failing on more than
    // one leg of this run is a second, independent observation of it.
    const jobsByTitle = new Map();
    for (const failure of failures || []) {
        const title = (failure.title || '').trim();
        if (!title) {
            continue;
        }
        if (!jobsByTitle.has(title)) {
            jobsByTitle.set(title, new Set());
        }
        if (failure.job) {
            jobsByTitle.get(title).add(failure.job);
        }
    }
    const judged = (failures || []).map((failure) => {
        const enriched = {
            ...failure,
            alsoFailedElsewhere: (jobsByTitle.get((failure.title || '').trim())?.size || 0) > 1,
        };
        return {failure: enriched, verdict: classifyFailure(enriched)};
    });

    // Cascade rule: a suite whose own setup hit an environment failure in this
    // leg (e.g. the server rejects channel creation) makes its sibling tests
    // fail in setup too, with generic errors that carry no infra marker. Those
    // are not independent app-bug candidates.
    const cascadeKeyOf = (failure) => {
        const suite = suiteKeyOf(failure.title);
        return failure.job && suite ? `${failure.job}|${suite}` : null;
    };
    const infraSuites = new Set(
        judged.
            filter((entry) => entry.verdict.category === 'infra').
            map((entry) => cascadeKeyOf(entry.failure)).
            filter(Boolean),
    );
    for (const entry of judged) {
        const key = cascadeKeyOf(entry.failure);
        if ((entry.verdict.category === 'app-bug' || entry.verdict.category === 'investigate') && key && infraSuites.has(key)) {
            entry.verdict = {category: 'infra', reason: 'same suite hit an environment failure in this leg — likely a cascade'};
        }
    }
    return judged;
}

function formatFailureJudgement(failures) {
    const judged = judgeFailures(failures);
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
 * @param {Array} [params.failures] - failed tests from TSIO, judged from their error text where triage left no verdict
 * @returns {string[]}
 */
function formatTriageVerdict({triage, legs = [], failures = []}) {
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
            lines.push(`- ${laneName(lane)} ${name || 'unnamed test'}${verdict.reason ? ` — ${verdict.reason}` : ''}`);
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

    // A failed test has a verdict only when a finding of its run names it: a triage job that failed, found only a
    // problem with the whole run, or left out a test (a spec that never ran) gave none. Those failures are judged
    // from their error text, as before triage, except one that passed on retry in a run triage checked: it is in
    // the retry count above. Failed tests with neither a verdict nor TSIO detail were not checked, so say so
    // instead of guessing.
    const named = new Map();
    const verdicts = new Map();
    for (const lane of triage || []) {
        const key = legKeyOf(lane.lane);
        if (!key) {
            continue;
        }
        const names = named.get(key) || new Set();
        for (const row of lane.findings || []) {
            names.add(row.full_title || row.title).add(row.title);
        }
        named.set(key, names);
        verdicts.set(key, (verdicts.get(key) || 0) + (lane.findings || []).length);
    }
    const unjudged = (failures || []).filter((failure) => {
        const names = named.get(legKeyOf(failure.job));
        return !(names && namedIn(names, failure.title)) && !(names && failure.passedOnRetry);
    });
    lines.push(...formatFailureJudgement(unjudged));
    const unchecked = [];
    for (const leg of legs || []) {
        const key = legKey(leg);
        const accounted = (verdicts.get(key) || 0) + unjudged.filter((failure) => legKeyOf(failure.job) === key).length;
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

// A failed test triage did not name is judged from its error text (classifyFailure).
const VERDICT_OF_JUDGEMENT = {'app-bug': 'product', investigate: 'look', flaky: 'flaky', known: 'still', infra: 'setup'};
const UNCLEARED = new Set(['product', 'new', 'look']);
const MAX_NAMED_BUGS = 5;

// Mobile's judge of a failure triage left uncleared, from what the error text alone proves. The app runs in its own
// process, so none of these is the app failing: a call the test's setup made to the server, a Jest hook or test
// timeout (the setup or the harness never finished), the device layer, or a JavaScript error in the test's code.
// Checked against 303 failures of 13 main runs: every one these patterns matched was not a product bug.
const SETUP_ERRORS = [
    /Exceeded timeout of \d+ ?ms for a (hook|test)/,
    /No response from server|socket hang up|\{"(id|message)":"/,
    /never (became|reached)|could not (confirm|enable)|did not attach file|seed failed|server baseline|apiCheckSystemHealth/,
    /DeviceServerDied|DeviceUnreachable|Detox can't seem to connect to the test app|"reactNativeReload"/,
];
const TEST_CODE_ERRORS = /^(TypeError|ReferenceError|SyntaxError):/;

// The server says a feature is off (attributes_feature_disabled): every spec of that feature fails on this server.
const FEATURE_OFF = /_feature_disabled|not enabled on this server/;
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
 * The main and CMT message, a few lines as on desktop: product bugs (failed again on a fresh device), failures not
 * confirmed either way, then what is not a product bug. Null when there is nothing to post: the run passed, or every
 * failure is flaky, passed on a fresh device or on retry, already failing before, a problem with the test or setup.
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

    // One verdict per failed test: the triage job's where a finding names it, the error text's where none does
    // (a test that passed on retry is counted below, not judged), and "not checked" for the rest of a run's failures.
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
            const again = UNCLEARED.has(key) ? rerun?.results?.[lane.lane]?.get(row.title) : undefined;
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
            verdicts.push({key, leg, lane: lane.lane, title: row.title, new: verdictOf(row, true).key === 'new'});
            names.add(row.full_title || row.title).add(row.title);
        }
        named.set(leg, names);
    }
    const unjudged = (failures || []).filter((failure) => {
        const names = named.get(legKeyOf(failure.job));
        return !failure.passedOnRetry && !(names && namedIn(names, failure.title));
    });
    for (const {failure, verdict} of judgeFailures(unjudged)) {
        verdicts.push({key: VERDICT_OF_JUDGEMENT[verdict.category] || 'look', leg: legKeyOf(failure.job)});
    }
    for (const leg of legs) {
        const key = legKey(leg);
        const missing = leg.failed - verdicts.filter((v) => v.leg === key).length;
        for (let i = 0; i < missing; i++) {
            verdicts.push({key: 'look', leg: key});
        }
    }

    const confirmed = verdicts.filter((v) => v.key === 'confirmed');
    const unconfirmed = verdicts.filter((v) => UNCLEARED.has(v.key));
    const stale = verdicts.filter((v) => v.key === 'stale');
    const setupLines = [];
    const noResults = legs.filter((leg) => leg.status === 'missing' || leg.status === 'no-results');
    if (noResults.length) {
        setupLines.push(`⚙️ **No results:** ${noResults.map(formatLegName).join(', ')} — test results did not upload, or the run ran no tests; re-run to see if anything failed`);
    }
    if (!upstreamJobsSucceeded && failed === 0) {
        setupLines.push('⚙️ A CI job failed outside the tests (install, build or teardown).');
    }
    const unexplained = upstreamJobsSucceeded && hasFailures && failed === 0;

    const title = reportTitleForIdentity(compositeIdentity);
    const branch = (compositeIdentity?.branch || '').replace(/^refs\/(heads|tags)\//, '');
    const on = branch ? ` on \`${branch}\`` : '';
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
            lines.push(`- ${laneName(v.lane)} ${v.title}`);
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

    // Tests that failed a try and passed the next count as flaky, not as failures.
    const retried = Object.values(perJobCounts || {}).reduce((n, counts) => n + (counts.flaky || 0), 0) ||
        (triage || []).reduce((n, lane) => n + (lane.counts?.flaky || 0), 0);
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

    // The triage job's verdicts when it ran; the history-and-error-text judgement only where it did not.
    if (triage?.length) {
        lines.push(...formatTriageVerdict({triage, legs, failures}));
    } else {
        lines.push(...formatFailureJudgement(failures));
        if ((failures || []).length > 0 && failed > failures.length) {
            lines.push(`_Judged ${failures.length} of ${failed} failing tests; the rest have no TSIO test detail yet._`, '');
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
    formatTriageVerdict,
    judgeFinding,
    formatMassFailures,
    verdictOf,
    classifyFailure,
    failuresFromConsolidated,
    fetchFailuresFromConsolidated,
    fetchPerJobCountsFromConsolidated,
    postMattermostWebhook,
    notifyCmtChannel,
};
