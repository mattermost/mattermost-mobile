// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env, no-await-in-loop, curly, brace-style, max-statements-per-line, no-empty, no-negated-condition, multiline-ternary -- CI utility script */

// Posts one GitHub commit status from a TSIO report group (poll + display URL).

const PRODUCTION_URL = 'https://test-io.test.mattermost.com';
const STAGING_URL = 'https://staging-test-io.test.mattermost.com';
const TERMINAL_STATUSES = ['completed', 'incomplete'];
const DEFAULT_POLL_ATTEMPTS = 12;
const POLL_DELAY_MS = 5000;
const FETCH_TIMEOUT_MS = 30000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, {...options, signal: controller.signal});
    } finally {
        clearTimeout(timer);
    }
}

function repoTail(repository) {
    const tail = (repository || '').split('/').pop() || repository;
    if (tail === 'mattermost-mobile') return 'mobile';
    if (tail === 'mattermost-desktop') return 'desktop';
    return tail;
}

function buildDisplayReportUrl(baseUrl, identity) {
    const repoTrailing = repoTail(identity.repository);
    const rawBranch = identity.branch || 'main';
    const branch = rawBranch.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, '').replace(/\//g, '~');
    const shortSha = (identity.commit_sha || '').slice(0, 7);
    const name = identity.name || 'mobile-pr';
    return `${baseUrl}/reports/${encodeURIComponent(repoTrailing)}/${encodeURIComponent(branch)}/${shortSha}/${encodeURIComponent(name)}`;
}

function decideStatus(detail, upstreamSucceeded) {
    const stats = detail.test_stats || {};
    const bothTerminal = TERMINAL_STATUSES.includes(detail.status);
    if (bothTerminal) {
        const clean = (stats.failed || 0) === 0 && detail.status === 'completed' && upstreamSucceeded;
        const passed = stats.passed || 0;
        const failed = stats.failed || 0;
        const skipped = stats.skipped || 0;
        const state = clean ? 'success' : 'failure';
        let description;
        if (failed > 0) {
            description = `${passed} passed, ${failed} failed, ${skipped} skipped`;
        } else if (detail.status !== 'completed') {
            description = `Report ${detail.status} — ${passed} passed, ${skipped} skipped`;
        } else {
            description = `${passed} passed, ${skipped} skipped`;
        }
        return {state, description: description.slice(0, 140), both_terminal: true, timed_out: false};
    }
    return {
        state: upstreamSucceeded ? 'success' : 'failure',
        description: `TSIO poll timed out (status=${detail.status}) — using CI job status`.slice(0, 140),
        both_terminal: false,
        timed_out: true,
    };
}

function parseArgs(argv) {
    const out = {};
    for (let i = 2; i < argv.length; i++) {
        let key = argv[i];
        if (!key.startsWith('--')) continue;
        key = key.slice(2);
        if (key.includes('=')) {
            const idx = key.indexOf('=');
            out[key.slice(0, idx)] = key.slice(idx + 1);
        } else {
            const next = argv[i + 1];
            if (next === undefined || next.startsWith('--')) {
                out[key] = 'true';
            } else {
                out[key] = next;
                i++;
            }
        }
    }
    return out;
}

async function mintOidcToken(audience) {
    const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
    const bearer = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
    if (!url || !bearer) {
        throw new Error('OIDC request env vars not set — job needs permissions.id-token: write');
    }
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetchWithTimeout(`${url}${sep}audience=${encodeURIComponent(audience)}`, {
        headers: {Authorization: `bearer ${bearer}`, Accept: 'application/json; api-version=2.0'},
    });
    if (!res.ok) throw new Error(`OIDC mint failed: ${res.status} ${await res.text()}`);
    const body = await res.json();
    if (!body.value) throw new Error('OIDC mint returned no token');
    return body.value;
}

async function beginGroup(baseUrl, idToken, identity, totalReportsExpected) {
    const body = {
        repository: identity.repository,
        commit: identity.commit_sha,
        gh_run_id: identity.gh_run_id,
        gh_run_attempt: String(identity.gh_run_attempt),
        framework: identity.framework || 'detox',
        name: identity.name,
        branch: identity.branch,
        total_reports_expected: totalReportsExpected,
        ...(identity.gh_pr_number != null ? {gh_pr_number: parseInt(identity.gh_pr_number, 10)} : {}),
    };
    const res = await fetchWithTimeout(`${baseUrl}/api/v1/reports/begin`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${idToken}`},
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`reports/begin (${identity.name}) failed: ${res.status} ${await res.text()}`);
    const {report_id} = await res.json();
    if (!report_id) throw new Error(`reports/begin (${identity.name}) returned no report_id`);
    return report_id;
}

async function pollGroup(baseUrl, reportId, pollAttempts) {
    const attempts = Number.isFinite(pollAttempts) && pollAttempts >= 1 ?
        pollAttempts :
        DEFAULT_POLL_ATTEMPTS;
    let detail = {status: 'unknown', test_stats: {}};
    for (let attempt = 0; attempt < attempts; attempt++) {
        try {
            const res = await fetchWithTimeout(`${baseUrl}/api/v1/reports/${reportId}`);
            if (!res.ok) throw new Error(`reports/${reportId} failed: ${res.status} ${await res.text()}`);
            detail = await res.json();
            if (TERMINAL_STATUSES.includes(detail.status)) return detail;
        } catch (err) {
            console.error(`tsio-report-status (poll attempt ${attempt + 1}/${attempts}):`, err.message);
            if (attempt >= attempts - 1) throw err;
        }
        if (attempt < attempts - 1) await sleep(POLL_DELAY_MS);
    }
    return detail;
}

async function createCommitStatus(token, repository, sha, payload) {
    const [owner, repo] = repository.split('/');
    const res = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`createCommitStatus failed: ${res.status} ${await res.text()}`);
}

async function reportTsioStatus(options) {
    const {
        compositeIdentity,
        totalReportsExpected,
        commitStatusContext,
        upstreamJobsSucceeded = true,
        githubToken,
        failOnTestFailures = true,
        pollAttempts = DEFAULT_POLL_ATTEMPTS,
        useStaging = false,
        audience = 'mattermost-test-system-io',
        baseUrl: baseUrlOverride,
    } = options;

    const baseUrl = baseUrlOverride || (useStaging ? STAGING_URL : PRODUCTION_URL);
    const runUrl = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY || compositeIdentity.repository}/actions/runs/${process.env.GITHUB_RUN_ID || ''}`;

    const result = {
        context: commitStatusContext,
        tsio_url: baseUrl,
        upstream_succeeded: upstreamJobsSucceeded,
        report_id: null,
        group_url: null,
        display_report_url: buildDisplayReportUrl(baseUrl, compositeIdentity),
        status: null,
        test_stats: {},
        state: 'failure',
        timed_out: false,
    };

    const token = githubToken || process.env.GITHUB_TOKEN;
    if (!token) throw new Error('githubToken (or GITHUB_TOKEN env) is required');

    let idToken;
    try {
        idToken = await mintOidcToken(audience);
    } catch (err) {
        console.error('tsio-report-status (OIDC):', err.message);
        await createCommitStatus(token, compositeIdentity.repository, compositeIdentity.commit_sha, {
            state: 'failure',
            context: commitStatusContext,
            description: `TSIO error: ${err.message}`.slice(0, 140),
            target_url: runUrl,
        });
        result.error = err.message;
        return result;
    }

    let reportId;
    try {
        reportId = await beginGroup(baseUrl, idToken, compositeIdentity, totalReportsExpected);
    } catch (err) {
        console.error('tsio-report-status (begin):', err.message);
        await createCommitStatus(token, compositeIdentity.repository, compositeIdentity.commit_sha, {
            state: 'failure',
            context: commitStatusContext,
            description: `TSIO begin failed: ${err.message}`.slice(0, 140),
            target_url: runUrl,
        });
        result.error = err.message;
        return result;
    }

    result.report_id = reportId;
    result.group_url = `${baseUrl}/reports/g/${reportId}`;

    let detail;
    try {
        detail = await pollGroup(baseUrl, reportId, pollAttempts);
    } catch (err) {
        console.error('tsio-report-status (poll):', err.message);
        await createCommitStatus(token, compositeIdentity.repository, compositeIdentity.commit_sha, {
            state: 'failure',
            context: commitStatusContext,
            description: `TSIO poll failed: ${err.message}`.slice(0, 140),
            target_url: runUrl,
        });
        result.error = err.message;
        return result;
    }

    result.status = detail.status;
    result.test_stats = detail.test_stats || {};

    const {state, description, both_terminal: bothTerminal, timed_out: timedOut} =
        decideStatus(detail, upstreamJobsSucceeded);
    result.timed_out = timedOut;
    result.state = state;

    const targetUrl = bothTerminal ? `${result.display_report_url}?gid=${reportId}` : runUrl;

    await createCommitStatus(token, compositeIdentity.repository, compositeIdentity.commit_sha, {
        state,
        context: commitStatusContext,
        description,
        target_url: targetUrl,
    });

    if (process.env.GITHUB_STEP_SUMMARY) {
        const stats = result.test_stats;
        const lines = [
            `### TSIO status — ${commitStatusContext}`,
            '',
            `**State:** ${state}`,
            `**Display report:** [${compositeIdentity.name}](${result.display_report_url})`,
            `**Group:** [${reportId}](${result.group_url}) — ${result.status}`,
            `**Stats:** ${stats.passed || 0} passed, ${stats.failed || 0} failed, ${stats.skipped || 0} skipped (of ${stats.total || 0})`,
            ...(timedOut ? ['', ':warning: TSIO group did not reach terminal status in time — failing open to CI job status.'] : []),
        ];
        try {
            const fs = require('fs');
            fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
        } catch {}
    }

    if (failOnTestFailures && bothTerminal && (result.test_stats.failed || 0) > 0) {
        const err = new Error('TSIO reported test failures');
        err.exitCode = 1;
        throw err;
    }

    return result;
}

function selfTest() {
    const assert = (cond, msg) => {
        if (!cond) { console.error('SELF-TEST FAIL:', msg); process.exit(1); }
    };

    const url = buildDisplayReportUrl(PRODUCTION_URL, {
        repository: 'mattermost/mattermost-mobile',
        commit_sha: 'abc1234deadbeef',
        branch: 'feature-branch',
        name: 'mobile-pr',
    });
    assert(url === 'https://test-io.test.mattermost.com/reports/mobile/feature-branch/abc1234/mobile-pr', `display URL: ${url}`);

    const urlSlashBranch = buildDisplayReportUrl(PRODUCTION_URL, {
        repository: 'mattermost/mattermost-mobile',
        commit_sha: 'abc1234deadbeef',
        branch: 'feat/tsio-mobile-reporting',
        name: 'mobile-pr',
    });
    assert(urlSlashBranch === 'https://test-io.test.mattermost.com/reports/mobile/feat~tsio-mobile-reporting/abc1234/mobile-pr', `slash branch URL: ${urlSlashBranch}`);

    const urlMaster = buildDisplayReportUrl(PRODUCTION_URL, {
        repository: 'mattermost/mattermost-mobile',
        commit_sha: 'def5678',
        branch: 'refs/heads/master',
        name: 'mobile-master',
    });
    assert(urlMaster === 'https://test-io.test.mattermost.com/reports/mobile/master/def5678/mobile-master', `master URL: ${urlMaster}`);

    const cmtUrl = buildDisplayReportUrl(PRODUCTION_URL, {
        repository: 'mattermost/mattermost-mobile',
        commit_sha: '111aaaa',
        branch: 'release-2.40',
        name: 'cmt-mobile',
    });
    assert(cmtUrl === 'https://test-io.test.mattermost.com/reports/mobile/release-2.40/111aaaa/cmt-mobile', `cmt URL: ${cmtUrl}`);

    let r = decideStatus({status: 'completed', test_stats: {passed: 10, failed: 0, skipped: 1}}, true);
    assert(r.state === 'success', 'clean run -> success');

    r = decideStatus({status: 'completed', test_stats: {passed: 8, failed: 2, skipped: 0}}, true);
    assert(r.state === 'failure', 'failures -> failure');

    r = decideStatus({status: 'in_progress', test_stats: {passed: 3, failed: 0}}, true);
    assert(r.timed_out === true && r.state === 'success', 'timeout fail-open upstream ok');

    console.log('SELF-TEST OK');
}

async function main() {
    const args = parseArgs(process.argv);
    if (args['self-test'] !== undefined) { selfTest(); return; }

    let identity;
    try {
        identity = JSON.parse(args['composite-identity']);
    } catch (err) {
        console.error('tsio-report-status: invalid --composite-identity JSON:', err.message);
        process.exit(1);
    }

    const totalReportsExpected = parseInt(args['total-reports-expected'] || '1', 10);
    const context = args.context || 'e2e/mobile';
    const upstreamSucceeded = args['upstream-succeeded'] !== 'false';
    const failOnTestFailures = args['fail-on-test-failures'] !== 'false';
    const pollAttempts = parseInt(args['poll-attempts'] || String(DEFAULT_POLL_ATTEMPTS), 10);

    try {
        const result = await reportTsioStatus({
            compositeIdentity: identity,
            totalReportsExpected,
            commitStatusContext: context,
            upstreamJobsSucceeded: upstreamSucceeded,
            githubToken: args['github-token'] || process.env.GITHUB_TOKEN,
            failOnTestFailures,
            pollAttempts,
            useStaging: args['use-staging'] === 'true',
            audience: args.audience || 'mattermost-test-system-io',
            baseUrl: args['base-url'],
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    } catch (err) {
        if (err.exitCode === 1) {
            console.error('tsio-report-status:', err.message);
            process.exit(1);
        }
        console.error('tsio-report-status fatal:', err.message);
        process.exit(1);
    }
}

module.exports = {buildDisplayReportUrl, decideStatus, reportTsioStatus, repoTail};

if (require.main === module) {
    main().catch((err) => {
        console.error('tsio-report-status fatal:', err.message);
        process.exit(1);
    });
}
