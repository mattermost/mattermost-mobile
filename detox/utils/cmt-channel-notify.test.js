// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/cmt-channel-notify.test.js`.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {
    parseMobileJobName,
    resolveWebhookUrl,
    buildLegSummaries,
    formatLegResultText,
    formatCmtChannelMessage,
    formatMainChannelMessage,
    formatTriageVerdict,
    judgeFinding,
    formatMassFailures,
    verdictOf,
    notifyCmtChannel,
    classifyFailure,
    failuresFromConsolidated,
    fetchFailuresFromConsolidated,
    fetchPerJobCountsFromConsolidated,
} = require('./cmt-channel-notify');

describe('cmt-channel-notify', () => {
    describe('formatLegResultText', () => {
        it('renders all-skipped legs as not executed instead of ✅ 0/0', () => {
            assert.equal(
                formatLegResultText({status: 'passed', passed: 0, failed: 0, skipped: 12}),
                '⚠️ not executed',
            );
        });

        it('preserves missing, no-results, passed, and failed formatting', () => {
            assert.equal(formatLegResultText({status: 'missing', passed: 0, failed: 0, skipped: 0}), '⚠️ missing');
            assert.equal(formatLegResultText({status: 'no-results', passed: 0, failed: 0, skipped: 0}), '⚠️ no-results');
            assert.equal(formatLegResultText({status: 'passed', passed: 231, failed: 0, skipped: 10}), '✅ 231/231');
            assert.equal(formatLegResultText({status: 'failed', passed: 229, failed: 2, skipped: 10}), '❌ 229/231');
        });
    });

    describe('parseMobileJobName', () => {
        it('parses PR/Main detox and maestro job names', () => {
            assert.deepEqual(parseMobileJobName('detox-ios'), {
                framework: 'detox',
                platform: 'ios',
                serverVersion: 'default',
                kind: 'e2e',
            });
            assert.deepEqual(parseMobileJobName('maestro-android-e2e'), {
                framework: 'maestro',
                platform: 'android',
                serverVersion: 'default',
                kind: 'e2e',
            });
            assert.deepEqual(parseMobileJobName('detox-ipad'), {
                framework: 'detox',
                platform: 'ipad',
                serverVersion: 'default',
                kind: 'e2e',
            });
        });

        it('parses CMT Server_ job names', () => {
            assert.deepEqual(parseMobileJobName('detox-ios-Server_11.9.0'), {
                framework: 'detox',
                platform: 'ios',
                serverVersion: '11.9.0',
                kind: 'cmt',
            });
            assert.deepEqual(parseMobileJobName('maestro-android-Server_10.5.14-rc.1'), {
                framework: 'maestro',
                platform: 'android',
                serverVersion: '10.5.14-rc.1',
                kind: 'cmt',
            });
        });

        it('returns null for unexpected names', () => {
            assert.equal(parseMobileJobName('linux-11.9.0'), null);
            assert.equal(parseMobileJobName(''), null);
        });
    });

    describe('resolveWebhookUrl', () => {
        const env = {
            MATTERMOST_CMT_WEBHOOK_URL: 'https://mm.example/hooks/cmt',
            MATTERMOST_E2E_WEBHOOK_URL: 'https://mm.example/hooks/e2e',
            MATTERMOST_MASTER_HEALTH_WEBHOOK_URL: 'https://mm.example/hooks/master-health',
            MATTERMOST_WEBHOOK_URL: 'https://mm.example/hooks/fallback',
        };

        it('sends CMT to the release webhook', () => {
            assert.equal(resolveWebhookUrl('mobile-release', env), env.MATTERMOST_CMT_WEBHOOK_URL);
        });

        it('sends main runs to the master-health webhook', () => {
            assert.equal(resolveWebhookUrl('mobile-main', env), env.MATTERMOST_MASTER_HEALTH_WEBHOOK_URL);
        });

        it('sends PR runs to the E2E webhook', () => {
            assert.equal(resolveWebhookUrl('mobile-pr', env), env.MATTERMOST_E2E_WEBHOOK_URL);
            assert.equal(resolveWebhookUrl('mobile-pr-detox-ios', env), env.MATTERMOST_E2E_WEBHOOK_URL);
            assert.equal(
                resolveWebhookUrl('mobile-release-detox-ios-Server_11.9.0', env),
                env.MATTERMOST_CMT_WEBHOOK_URL,
            );
        });

        it('does not fall back CMT to the E2E webhook when release secret is missing', () => {
            assert.equal(
                resolveWebhookUrl('mobile-release', {MATTERMOST_E2E_WEBHOOK_URL: env.MATTERMOST_E2E_WEBHOOK_URL}),
                '',
            );
        });

        it('does not use the shared webhook when a dedicated CMT secret is missing', () => {
            assert.equal(
                resolveWebhookUrl('mobile-release', {MATTERMOST_WEBHOOK_URL: env.MATTERMOST_WEBHOOK_URL}),
                '',
            );
        });

        it('does not use the shared or PR webhook when master-health secret is missing', () => {
            assert.equal(
                resolveWebhookUrl('mobile-main', {
                    MATTERMOST_WEBHOOK_URL: env.MATTERMOST_WEBHOOK_URL,
                    MATTERMOST_E2E_WEBHOOK_URL: env.MATTERMOST_E2E_WEBHOOK_URL,
                }),
                '',
            );
        });

        it('does not use the shared webhook when a dedicated E2E secret is missing for PR', () => {
            assert.equal(
                resolveWebhookUrl('mobile-pr', {MATTERMOST_WEBHOOK_URL: env.MATTERMOST_WEBHOOK_URL}),
                '',
            );
        });

        it('still uses the shared webhook for unknown report names', () => {
            assert.equal(resolveWebhookUrl('unknown-report', env), env.MATTERMOST_WEBHOOK_URL);
        });
    });

    describe('formatCmtChannelMessage', () => {
        it('posts the short message for a CMT run, one entry per platform and server', () => {
            const text = formatCmtChannelMessage({
                compositeIdentity: {
                    branch: 'release-2.40',
                    commit_sha: '55afc0b839545804ee156fe95b4c1ac05c9d0cdc',
                    name: 'mobile-release',
                },
                detail: {
                    status: 'completed',
                    test_stats: {passed: 460, failed: 1, skipped: 40, total: 501},
                    reports: [
                        {id: 'rid-ios', gh_job_name: 'detox-ios-Server_11.9.0', status: 'complete'},
                        {id: 'rid-android', gh_job_name: 'detox-android-Server_11.9.0', status: 'complete'},
                    ],
                },
                reportUrl: 'https://test-io.test.mattermost.com/reports/mattermost-mobile/release-2.40/55afc0b/mobile-release',
                baseUrl: 'https://test-io.test.mattermost.com',
                perJobCounts: {
                    'detox-ios-Server_11.9.0': {passed: 231, failed: 0, skipped: 20, flaky: 0},
                    'detox-android-Server_11.9.0': {passed: 230, failed: 1, skipped: 20, flaky: 0},
                },
                upstreamJobsSucceeded: true,
            });

            assert.equal(text, [
                '🟡 **Mobile CMT — no product bug confirmed** on `release-2.40`',
                '`55afc0b`',
                '**1 failed** · 461 passed · 40 skipped',
                '🔎 **Not confirmed (1) — not re-run, or the re-run gave no result:** [🤖 detox-android (11.9.0)](https://test-io.test.mattermost.com/reports/r/rid-android) 1',
                '➡️ [Full report](https://test-io.test.mattermost.com/reports/mattermost-mobile/release-2.40/55afc0b/mobile-release)',
                '',
            ].join('\n'));
        });

        it('renders a passed PR report with PR link and no failure banner', () => {
            const text = formatCmtChannelMessage({
                compositeIdentity: {
                    repository: 'mattermost/mattermost-mobile',
                    branch: 'feat/tsio',
                    commit_sha: '55afc0b839545804ee156fe95b4c1ac05c9d0cdc',
                    name: 'mobile-pr',
                    gh_pr_number: '9925',
                },
                detail: {
                    status: 'completed',
                    test_stats: {passed: 240, failed: 0, skipped: 10, total: 250},
                    reports: [],
                },
                reportUrl: 'https://test-io.test.mattermost.com/reports/mattermost-mobile/feat~tsio/55afc0b/mobile-pr',
                baseUrl: 'https://test-io.test.mattermost.com',
                perJobCounts: {},
                upstreamJobsSucceeded: true,
            });
            assert.match(text, /^## ✅ Mobile PR E2E\n/);
            assert.match(text, /\*\*PR:\*\* \[#9925\]\(https:\/\/github\.com\/mattermost\/mattermost-mobile\/pull\/9925\)/);
            assert.doesNotMatch(text, /failing test/);
            assert.match(text, /\| \*\*Overall\*\* \| \*\*240\*\* \| \*\*0\*\* \| \*\*10\*\* \| ✅ Passed \|/);
        });

        it('marks overall failed when hasFailures is set without test failures', () => {
            const text = formatCmtChannelMessage({
                compositeIdentity: {
                    branch: 'feature',
                    commit_sha: 'a1b2c3d4e5f678901234567890abcdef12345678',
                    name: 'mobile-pr',
                },
                detail: {
                    status: 'completed',
                    test_stats: {passed: 100, failed: 0, skipped: 0, total: 100},
                    reports: [],
                },
                reportUrl: 'https://test-io.test.mattermost.com/reports/mattermost-mobile/main/a1b2c3d/mobile-main',
                baseUrl: 'https://test-io.test.mattermost.com',
                perJobCounts: {},
                upstreamJobsSucceeded: true,
                hasFailures: true,
            });
            assert.match(text, /^## ❌ Mobile PR E2E\n/);
            assert.match(text, /\| \*\*Overall\*\* \| \*\*100\*\* \| \*\*0\*\* \| \*\*0\*\* \| ❌ Failed \|/);
            assert.match(text, /TSIO reported failed shard\(s\) not reflected in the test totals/);
        });

        it('does not blame CI when the failing jobs are explained by failing tests', () => {
            const text = formatCmtChannelMessage({
                compositeIdentity: {branch: 'feature', commit_sha: 'a1b2c3d', name: 'mobile-pr'},
                detail: {
                    status: 'incomplete',
                    test_stats: {passed: 100, failed: 3, skipped: 0, total: 103},
                    reports: [],
                },
                perJobCounts: {},
                upstreamJobsSucceeded: false,
                hasFailures: true,
            });
            assert.match(text, /^## ❌ Mobile PR E2E\n/);
            assert.doesNotMatch(text, /outside tracked tests/);
        });

        it('still flags CI failures outside tracked tests when no test failed', () => {
            const text = formatCmtChannelMessage({
                compositeIdentity: {branch: 'feature', commit_sha: 'a1b2c3d', name: 'mobile-pr'},
                detail: {
                    status: 'completed',
                    test_stats: {passed: 100, failed: 0, skipped: 0, total: 100},
                    reports: [],
                },
                perJobCounts: {},
                upstreamJobsSucceeded: false,
            });
            assert.match(text, /outside tracked tests \(install\/build\/teardown\)/);
        });

        it('links the CI run separately from the TSIO report', () => {
            const text = formatCmtChannelMessage({
                compositeIdentity: {branch: 'feature', commit_sha: 'a1b2c3d', name: 'mobile-pr'},
                detail: {status: 'completed', test_stats: {passed: 1}, reports: []},
                runUrl: 'https://github.com/mattermost/mattermost-mobile/actions/runs/30424009936',
                perJobCounts: {},
            });
            assert.doesNotMatch(text, /Consolidated report/);
            assert.match(
                text,
                /🔗 \*\*CI run:\*\* https:\/\/github\.com\/mattermost\/mattermost-mobile\/actions\/runs\/30424009936/,
            );
        });
    });

    describe('classifyFailure', () => {
        it('judges a spec that never ran as infra', () => {
            assert.equal(classifyFailure({title: 'CI shard reporting › spec did not run', error: 'x was assigned to a shard but produced no result'}).category, 'infra');
        });

        it('judges a server-disabled feature error as infra, not an app bug', () => {
            assert.equal(classifyFailure({title: 'MM-T6310', error: 'api.channel.create_channel.attributes_feature_disabled: Channel attributes are not enabled on this server.'}).category, 'infra');
        });

        it('judges a test with mixed pass/fail history as flaky', () => {
            assert.equal(classifyFailure({title: 'MM-T1', error: 'timeout', previousStatuses: ['passed', 'failed', 'passed']}).category, 'flaky');
            assert.equal(classifyFailure({title: 'MM-T1', error: 'timeout', passedOnRetry: true}).category, 'flaky');
        });

        it('judges a repeatedly failing test as known, and a corroborated direct assertion as suspected app bug', () => {
            assert.equal(classifyFailure({title: 'MM-T2', error: 'expect mismatch', previousStatuses: ['failed', 'failed']}).category, 'known');
            assert.equal(classifyFailure({title: 'MM-T3', error: "expected element toHaveText 'HIGH'", previousStatuses: ['passed', 'passed']}).category, 'app-bug');
            assert.equal(classifyFailure({title: 'MM-T3', error: "expected element toHaveText 'HIGH'", previousStatuses: [], alsoFailedElsewhere: true}).category, 'app-bug');
        });

        it('does not treat a selected-view mismatch carrying a direct assertion as timing', () => {
            assert.equal(classifyFailure({title: 'MM-T8', error: "'HIGH' doesn't match the selected view (toHaveText)", previousStatuses: ['passed']}).category, 'app-bug');
        });

        it('does not call a timing wait or a single uncorroborated assertion an app bug', () => {
            assert.equal(classifyFailure({title: 'MM-T4', error: 'Timed out while waiting for expectation: TOBEVISIBLE TIMEOUT(10s)', previousStatuses: []}).category, 'investigate');
            assert.equal(classifyFailure({title: 'MM-T5', error: "expected element toHaveText 'HIGH'", previousStatuses: []}).category, 'investigate');
            assert.equal(classifyFailure({title: 'MM-T6', error: 'some opaque failure', previousStatuses: ['passed']}).category, 'investigate');
        });
    });

    describe('failuresFromConsolidated', () => {
        it('extracts this commit\'s failures with earlier history attached', () => {
            const identity = {commit_sha: 'sha1', gh_run_attempt: '1'};
            const detail = {reports: [{id: 'r1', gh_job_name: 'detox-ios-Server_12.1.0-rc1'}]};
            const consol = {specs: [
                {full_title: 'Suite MM-T1 - case',
                    history: [
                        {report_id: 'r1', commit_sha: 'sha0', run_attempt: 1, status: 'passed'},
                        {report_id: 'r1', commit_sha: 'sha1', run_attempt: 1, status: 'failed', error_message: 'boom'},
                    ]},
                {full_title: 'Suite MM-T2 - case',
                    history: [
                        {report_id: 'r1', commit_sha: 'sha1', run_attempt: 1, status: 'passed'},
                    ]},
            ]};
            assert.deepEqual(failuresFromConsolidated(consol, identity, detail), [{
                job: 'detox-ios-Server_12.1.0-rc1',
                title: 'Suite MM-T1 - case',
                error: 'boom',
                previousStatuses: ['passed'],
                passedOnRetry: false,
            }]);
        });

        it('marks a test that failed a try and passed the next as passed on retry', () => {
            const identity = {commit_sha: 'sha1', gh_run_attempt: '1'};
            const detail = {reports: [{id: 'r1', gh_job_name: 'detox-android'}]};
            const tries = (...statuses) => statuses.map((status) => ({report_id: 'r1', commit_sha: 'sha1', run_attempt: 1, status}));
            const consol = {specs: [
                {full_title: 'Retried MM-T1 - case', history: tries('failed', 'passed')},
                {full_title: 'Failed MM-T2 - case', history: tries('failed', 'failed')},
            ]};
            assert.deepEqual(failuresFromConsolidated(consol, identity, detail).map((f) => [f.title, f.passedOnRetry]), [
                ['Retried MM-T1 - case', true],
                ['Failed MM-T2 - case', false],
            ]);
        });

        it('excludes other attempts of the same run from previous statuses', () => {
            const identity = {commit_sha: 'sha1', gh_run_attempt: '2'};
            const detail = {reports: [{id: 'r1', gh_job_name: 'detox-ios-Server_12.1.0-rc1'}]};
            const consol = {specs: [
                {full_title: 'Suite MM-T1 - case',
                    history: [
                        {report_id: 'r1', commit_sha: 'sha0', run_attempt: 1, status: 'failed'},
                        {report_id: 'r1', commit_sha: 'sha1', run_attempt: 1, status: 'passed'},
                        {report_id: 'r1', commit_sha: 'sha1', run_attempt: 2, status: 'failed', error_message: 'boom'},
                    ]},
            ]};
            const failures = failuresFromConsolidated(consol, identity, detail);
            assert.equal(failures.length, 1);
            assert.deepEqual(failures[0].previousStatuses, ['failed']);
        });

        it('requests the consolidated endpoint with run_attempt, not gh_run_attempt', async () => {
            const identity = {
                repository: 'mattermost/mattermost-mobile',
                branch: 'refs/heads/build-release-833',
                commit_sha: 'sha1',
                gh_run_id: '40295770932',
                gh_run_attempt: '2',
                name: 'mobile-release-detox-ios-Server_12.1.0-rc1',
                run_group: 'mobile-release-detox-ios-Server_12.1.0-rc1',
            };
            const original = global.fetch;
            let requestedUrl = '';
            global.fetch = (url) => {
                requestedUrl = String(url);
                return Promise.resolve({ok: true, text: () => Promise.resolve(''), json: () => Promise.resolve({specs: []})});
            };
            try {
                await fetchFailuresFromConsolidated('https://test-io.test.mattermost.com', identity, {reports: []});
            } finally {
                global.fetch = original;
            }
            assert.match(requestedUrl, /[?&]run_attempt=2(&|$)/);
            assert.doesNotMatch(requestedUrl, /gh_run_attempt/);
        });
    });

    describe('formatCmtChannelMessage failure judgement', () => {
        it('renders grouped judgements when failures are supplied', () => {
            const text = formatCmtChannelMessage({
                compositeIdentity: {branch: 'build-release-833', commit_sha: '97a2993abc', name: 'mobile-pr'},
                detail: {status: 'incomplete', test_stats: {passed: 10, failed: 2, skipped: 0, total: 12}, reports: []},
                perJobCounts: {},
                failures: [
                    {job: 'detox-android-Server_12.1.0-rc1', title: 'Messaging MM-1 - case', error: "expected element toHaveText 'HIGH'", previousStatuses: ['passed']},
                    {job: 'detox-ios-Server_12.1.0-rc1', title: 'Attributes MM-2 - case', error: 'Channel attributes are not enabled on this server.', previousStatuses: []},
                    {job: 'detox-ios-Server_12.1.0-rc1', title: 'Attributes MM-3 - case', error: 'chip not visible after 10s', previousStatuses: []},
                ],
            });
            assert.match(text, /Failure judgement/);
            assert.match(text, /🔴 \*\*Suspected app bug — corroborated, needs investigation \(1\)\*\*/);
            assert.match(text, /⚠️ \*\*Infra \/ environment — not an app failure \(2\)\*\*/);
            assert.match(text, /Attributes MM-3 - case — same suite hit an environment failure/);
            assert.match(text, /Messaging MM-1 - case — passed in earlier runs and now fails a direct assertion/);
        });

        it('promotes a direct assertion that failed on two legs to suspected app bug', () => {
            const text = formatCmtChannelMessage({
                compositeIdentity: {branch: 'build-release-833', commit_sha: '97a2993abc', name: 'mobile-pr'},
                detail: {status: 'incomplete', test_stats: {passed: 10, failed: 2, skipped: 0, total: 12}, reports: []},
                perJobCounts: {},
                failures: [
                    {job: 'detox-ios-Server_12.1.0-rc1', title: 'Messaging MM-7 - case', error: "expected element toHaveText 'HIGH'", previousStatuses: []},
                    {job: 'detox-android-Server_12.1.0-rc1', title: 'Messaging MM-7 - case', error: "expected element toHaveText 'HIGH'", previousStatuses: []},
                ],
            });
            assert.match(text, /🔴 \*\*Suspected app bug — corroborated, needs investigation \(2\)\*\*/);
            assert.match(text, /direct assertion failed on more than one leg/);
        });

        it('does not promote a direct assertion when only one leg has a job name', () => {
            const text = formatCmtChannelMessage({
                compositeIdentity: {branch: 'build-release-833', commit_sha: '97a2993abc', name: 'mobile-pr'},
                detail: {status: 'incomplete', test_stats: {passed: 10, failed: 2, skipped: 0, total: 12}, reports: []},
                perJobCounts: {},
                failures: [
                    {job: 'detox-ios-Server_12.1.0-rc1', title: 'Messaging MM-7 - case', error: "expected element toHaveText 'HIGH'", previousStatuses: []},
                    {job: '', title: 'Messaging MM-7 - case', error: "expected element toHaveText 'HIGH'", previousStatuses: []},
                ],
            });
            assert.doesNotMatch(text, /Suspected app bug/);
            assert.match(text, /🔍 \*\*Needs a closer look — not enough evidence to call it an app bug \(2\)\*\*/);
        });

        it('does not cascade failures whose job or suite is unknown', () => {
            const text = formatCmtChannelMessage({
                compositeIdentity: {branch: 'build-release-833', commit_sha: '97a2993abc', name: 'mobile-pr'},
                detail: {status: 'incomplete', test_stats: {passed: 10, failed: 2, skipped: 0, total: 12}, reports: []},
                perJobCounts: {},
                failures: [
                    {job: '', title: '', error: 'Channel attributes are not enabled on this server.', previousStatuses: []},
                    {job: '', title: '', error: 'expect mismatch', previousStatuses: []},
                ],
            });
            assert.match(text, /🔍 \*\*Needs a closer look — not enough evidence to call it an app bug \(1\)\*\*/);
            assert.match(text, /⚠️ \*\*Infra \/ environment — not an app failure \(1\)\*\*/);
            assert.doesNotMatch(text, /likely a cascade/);
        });

        it('renders no judgement section without failures', () => {
            const text = formatCmtChannelMessage({
                compositeIdentity: {branch: 'feature', commit_sha: 'a1b2c3d', name: 'mobile-pr'},
                detail: {status: 'completed', test_stats: {passed: 1, failed: 0}, reports: []},
                perJobCounts: {},
            });
            assert.doesNotMatch(text, /Failure judgement/);
        });
    });

    describe('notifyCmtChannel', () => {
        const identity = {
            repository: 'mattermost/mattermost-mobile',
            branch: 'refs/heads/feature',
            commit_sha: 'a1b2c3d4e5f6',
            gh_run_id: '30424009936',
            name: 'mobile-pr',
            run_group: 'mobile-pr',
        };
        const detail = {
            status: 'completed',
            test_stats: {passed: 460, failed: 0, skipped: 40, total: 500},
            reports: [{id: 'rid-ios', gh_job_name: 'detox-ios', status: 'complete'}],
        };
        const core = {info: () => {}, warning: () => {}};

        const withStubbedFetch = async (run) => {
            const calls = [];
            const original = global.fetch;
            global.fetch = (url, options) => {
                calls.push({url: String(url), options});
                return Promise.resolve({ok: true, text: () => Promise.resolve(''), json: () => Promise.resolve({specs: []})});
            };
            try {
                await run(calls);
            } finally {
                global.fetch = original;
            }
        };

        it('uses supplied per-job counts instead of a bucket-scoped consolidated fetch', async () => {
            await withStubbedFetch(async (calls) => {
                await notifyCmtChannel({
                    core,
                    baseUrl: 'https://test-io.test.mattermost.com',
                    compositeIdentity: identity,
                    detail,
                    perJobCounts: {'detox-ios': {passed: 460, failed: 0, skipped: 40, flaky: 0}},
                    webhookUrl: 'https://mm.example/hooks/master-health',
                });

                assert.equal(calls.length, 1);
                assert.equal(calls[0].url, 'https://mm.example/hooks/master-health');
                const posted = JSON.parse(calls[0].options.body).text;
                assert.match(posted, /\| \[📱 detox-ios\]\(https:\/\/test-io\.test\.mattermost\.com\/reports\/r\/rid-ios\) \| 460 \| 0 \| 40 \| ✅ 460\/460 \|/);
                assert.doesNotMatch(posted, /no-results/);
            });
        });

        it('falls back to the consolidated fetch when no counts are supplied', async () => {
            await withStubbedFetch(async (calls) => {
                await notifyCmtChannel({
                    core,
                    baseUrl: 'https://test-io.test.mattermost.com',
                    compositeIdentity: identity,
                    detail,
                    webhookUrl: 'https://mm.example/hooks/master-health',
                });

                assert.equal(calls.length, 2);
                assert.match(calls[0].url, /\/api\/v1\/reports\/consolidated\?/);
            });
        });
    });

    describe('buildLegSummaries', () => {
        it('sorts detox then maestro, ios → android → ipad', () => {
            const rows = buildLegSummaries(
                {
                    'maestro-android-e2e': {passed: 1, failed: 0, skipped: 0, flaky: 0},
                    'detox-ipad': {passed: 1, failed: 0, skipped: 0, flaky: 0},
                    'detox-android': {passed: 1, failed: 0, skipped: 0, flaky: 0},
                    'maestro-ios-e2e': {passed: 1, failed: 0, skipped: 0, flaky: 0},
                    'detox-ios': {passed: 1, failed: 0, skipped: 0, flaky: 0},
                },
                [],
            );
            assert.deepEqual(rows.map((r) => r.label), [
                'ios-detox',
                'android-detox',
                'ipad-detox',
                'ios-maestro',
                'android-maestro',
            ]);
        });
    });

    // Main run 40764686027 (0ec1413): the triage jobs' findings, as the channel message reads them.
    describe('triage verdict', () => {
        const row = (title, cls, label, file = 'detox/e2e/test/a.e2e.ts') => ({title, full_title: title, file, class: cls, label, blocking: label !== 'flaky'});
        const triage = [
            {lane: 'detox-android',
                counts: {flaky: 4},
                findings: [
                    row('Server Login - Connect to Server MM-T4676_5 - should show login screen on successful connection to server', 'REGRESSION', 'needs investigation'),
                ]},
            {lane: 'detox-ios', counts: {flaky: 1}, findings: []},
            {lane: 'maestro-android-e2e',
                counts: {flaky: 0},
                findings: [
                    {...row('clock_display', 'REGRESSION', 'needs investigation'), full_title: 'detox/maestro/flows/timezone/clock_display.yml > clock_display', file: 'detox/maestro/flows/timezone/clock_display.yml'},
                    row('call_ui_permission', 'FLAKY_ON_TRUNK', 'flaky', 'detox/maestro/flows/calls/call_ui_permission.yml'),
                ]},
        ];

        it('puts each test under what it means, in plain words', () => {
            assert.deepEqual(verdictOf({class: 'REGRESSION', label: 'needs investigation'}, true).key, 'new', 'on main, a test that passed every earlier run is new');
            assert.deepEqual(verdictOf({class: 'REGRESSION', label: 'needs investigation'}, false).key, 'look', 'on a PR the triage judge decides');
            assert.equal(verdictOf({class: 'BROKEN_ON_TRUNK', label: 'broken on main'}, true).key, 'still');
            assert.equal(verdictOf({class: 'INFRA_ERROR', label: 'flaky'}, true).key, 'setup');
            assert.equal(verdictOf({class: 'FLAKY_ON_TRUNK', label: 'flaky'}, true).key, 'flaky');
            assert.equal(verdictOf({class: 'REGRESSION', label: 'test bug'}, false).key, 'test');
            assert.equal(verdictOf({class: 'REGRESSION', label: 'app bug'}, true).key, 'product');
            assert.deepEqual(verdictOf({class: 'OWNED_BY_PR', label: 'caused by PR'}, false), {key: 'product', reason: 'caused by this change'});
            assert.equal(verdictOf({class: 'OWNED_BY_PR', label: 'caused by PR'}, true).key, 'new');
            assert.deepEqual(verdictOf({class: 'INSUFFICIENT_DATA', label: 'needs investigation'}, true), {key: 'look', reason: 'not enough history to tell'});
            assert.equal(verdictOf({class: 'REGRESSION', label: 'flaky'}, true).key, 'flaky', 'on main, triage calling it flaky wins over new');
            assert.equal(verdictOf({class: 'REGRESSION', label: 'test bug'}, true).key, 'test', 'and so does a problem with the test');
        });

        it('names each failed test of a PR run under its verdict, and counts retried passes as flaky', () => {
            const text = formatTriageVerdict({triage}).join('\n');
            assert.match(text, /^- 🤖 maestro-android clock_display — the cause is not clear$/m, 'a Maestro flow is named by its title, not its file path');
            assert.match(text, /^- 🤖 maestro-android call_ui_permission — failed by chance; it passes on retry or on other runs$/m);
            assert.match(text, /^🔁 \*\*Passed on retry, not product bugs:\*\* 5 tests \(🤖 detox-android 4, 📱 detox-ios 1\)$/m);
            const legs = [{platform: 'ios', framework: 'maestro', kind: 'e2e', serverVersion: 'default', failed: 2, passed: 5}];
            assert.match(formatTriageVerdict({triage, legs}).join('\n'), /^⚙️ \*\*Not checked:\*\* 📱 maestro-ios — the triage job left no verdict; look at the run$/m);
        });

        it('calls out a run where most tests failed at once', () => {
            const leg = (failed, passed) => ({platform: 'android', framework: 'maestro', kind: 'e2e', serverVersion: 'default', failed, passed});
            assert.deepEqual(formatMassFailures([leg(9, 2)]), ['⚠️ **🤖 maestro-android: 9 of 11 tests failed.** When most of a run fails at once it is usually its setup (device, app build or server) or one broken screen — look at that run before the single tests.']);
            assert.deepEqual(formatMassFailures([leg(4, 1), leg(9, 20)]), [], 'a few failures, or a minority of the run, are judged one by one');
        });

        it('judges from the error text the failed runs whose triage named no test', () => {
            const lanes = [
                {lane: 'maestro-android-e2e', counts: {flaky: 0}, findings: [row('clock_display', 'REGRESSION', 'needs investigation')]},
                {lane: 'detox-android', triaged: false, verdict: null, counts: {flaky: 0}, findings: []}, // triage failed
                // detox-ios left no findings file at all; maestro-ios failed with no test detail in TSIO
            ];
            const legs = [
                {platform: 'android', framework: 'maestro', kind: 'e2e', serverVersion: 'default', failed: 1, passed: 2},
                {platform: 'android', framework: 'detox', kind: 'e2e', serverVersion: 'default', failed: 1, passed: 5},
                {platform: 'ios', framework: 'detox', kind: 'e2e', serverVersion: 'default', failed: 1, passed: 5},
                {platform: 'ios', framework: 'maestro', kind: 'e2e', serverVersion: 'default', failed: 2, passed: 5},
            ];
            const failures = [
                {title: 'clock_display', job: 'maestro-android-e2e', error: 'Element not found'},
                {title: 'Channels MM-T1 - should open', job: 'detox-android', error: 'Element not found'},
                {title: 'Search MM-T2 - should find', job: 'detox-ios', error: 'Element not found'},
            ];
            const text = formatTriageVerdict({triage: lanes, legs, failures}).join('\n');
            assert.match(text, /Failure judgement/);
            assert.match(text, /^- 🤖 detox-android Channels MM-T1 - should open — /m, 'a run whose triage failed is judged from the error text');
            assert.match(text, /^- 📱 detox-ios Search MM-T2 - should find — /m, 'a run with no findings file is judged from the error text');
            assert.equal(text.match(/clock_display/g).length, 1, 'a test triage judged is not judged again');
            assert.match(text, /^⚙️ \*\*Not checked:\*\* 📱 maestro-ios — the triage job left no verdict; look at the run$/m);
        });

        it('judges a failed test triage left out, and names failed tests with neither a verdict nor detail', () => {
            const lanes = [{lane: 'detox-ios', counts: {flaky: 0}, findings: [row('Login MM-T3 - should log in', 'FLAKY_ON_TRUNK', 'flaky')]}];
            const legs = [{platform: 'ios', framework: 'detox', kind: 'e2e', serverVersion: 'default', failed: 4, passed: 5}];
            const failures = [
                {title: 'Login MM-T3 - should log in', job: 'detox-ios', error: 'Element not found'},
                {title: 'spec did not run', job: 'detox-ios', error: 'was assigned to a shard but produced no result'},
                {title: 'Search MM-T9 - should find', job: 'detox-ios', error: 'Element not found', passedOnRetry: true},
            ];
            const text = formatTriageVerdict({triage: lanes, legs, failures}).join('\n');
            assert.match(text, /^- 📱 detox-ios spec did not run — /m, 'a failure with no finding is judged from its error text');
            assert.equal(text.match(/Login MM-T3/g).length, 1);
            assert.doesNotMatch(text, /MM-T9/, 'a test that passed on retry is in the retry count, not a failure');
            assert.match(text, /^⚙️ \*\*Not checked:\*\* 📱 detox-ios \(2 of 4 failed tests\) — the triage job left no verdict; look at the run$/m);
        });

        // TSIO keeps each try as its own entry: main run 40764686027's detox-android had 2 tests that failed both
        // tries and 4 that failed, then passed.
        it('counts each test once: failed then passed is flaky, and a status with no known name failed', async () => {
            const at = (status, report = 'r1') => ({commit_sha: 'sha1', run_attempt: '1', report_id: report, status});
            const specs = [{history: [at('failed'), at('failed')]}, {history: [at('failed'), at('passed')]}, {history: [at(undefined)]}, {history: [at('timedOut')]}, {history: [at('passed')]}];
            const original = global.fetch;
            global.fetch = () => Promise.resolve({ok: true, text: () => Promise.resolve(''), json: () => Promise.resolve({specs})});
            try {
                const counts = await fetchPerJobCountsFromConsolidated('https://tsio.test', {commit_sha: 'sha1', gh_run_attempt: '1', name: 'n', gh_run_id: '1'}, {reports: [{id: 'r1', gh_job_name: 'detox-ios'}]});
                assert.deepEqual(counts, {'detox-ios': {passed: 1, failed: 3, skipped: 0, flaky: 1}});
            } finally {
                global.fetch = original;
            }
        });

        it('keeps CMT runs on different servers apart', () => {
            const lanes = [{lane: 'detox-ios-Server_11.9.0', counts: {flaky: 0}, findings: [row('Login MM-T3 - should log in', 'FLAKY_ON_TRUNK', 'flaky')]}];
            const legs = [
                {platform: 'ios', framework: 'detox', kind: 'cmt', serverVersion: '11.9.0', failed: 1, passed: 5},
                {platform: 'ios', framework: 'detox', kind: 'cmt', serverVersion: '10.11.0', failed: 1, passed: 5},
            ];
            const text = formatTriageVerdict({triage: lanes, legs}).join('\n');
            assert.match(text, /^⚙️ \*\*Not checked:\*\* .*10\.11\.0.* — the triage job left no verdict; look at the run$/m);
            assert.doesNotMatch(text, /Not checked:.*11\.9\.0/);
        });
    });

    // Main run 40764686027: 11 failed — 10 new on main (2 detox-android, 8 of maestro-android's 9), 1 flaky — and 5
    // passed on retry.
    describe('main-run message', () => {
        const row = (title, cls, label) => ({title, full_title: title, class: cls, label});
        const identity = {repository: 'mattermost/mattermost-mobile', name: 'mobile-main', run_group: 'mobile-main', branch: 'main', commit_sha: '0ec1413a1a8bd595c2f70f144d7de02051d382e7'};
        const newOnMain = (n) => Array.from({length: n}, (_, i) => row(`test ${i}`, 'REGRESSION', 'needs investigation'));
        const triage = [
            {lane: 'detox-ios', counts: {flaky: 1}, findings: []},
            {lane: 'detox-android', counts: {flaky: 4}, findings: newOnMain(2)},
            {lane: 'maestro-android-e2e', counts: {flaky: 0}, findings: [...newOnMain(8), row('call_ui_permission', 'FLAKY_ON_TRUNK', 'flaky')]},
        ];
        const perJobCounts = {
            'detox-ios': {passed: 616, failed: 0, skipped: 43, flaky: 1},
            'detox-android': {passed: 614, failed: 2, skipped: 43, flaky: 4},
            'detox-ipad': {passed: 19, failed: 0, skipped: 0, flaky: 0},
            'maestro-ios-e2e': {passed: 7, failed: 0, skipped: 1, flaky: 0},
            'maestro-android-e2e': {passed: 2, failed: 9, skipped: 2, flaky: 0},
        };
        const detail = {status: 'completed', test_stats: {passed: 1258, flaky: 5, failed: 11, skipped: 89}, reports: []};
        const changes = {from: '39272432327c8ce7c8bf074f86db656ca9be4b20', to: identity.commit_sha, prs: [{number: 10266, title: '[MM-71089] Log websocket client creation failures'}], partial: false};
        const runUrl = 'https://github.com/mattermost/mattermost-mobile/actions/runs/40764686027';
        const message = (overrides) => formatCmtChannelMessage({compositeIdentity: identity, detail, perJobCounts, triage, changes, runUrl, failures: [], ...overrides});

        // The re-run on fresh devices: detox-android's test 0 failed again, every other new failure passed.
        const results = (failedAgain) => ({
            'detox-android': new Map([['test 0', failedAgain ? 'failed' : 'passed'], ['test 1', 'passed']]),
            'maestro-android-e2e': new Map(newOnMain(8).map((r) => [r.title, 'passed'])),
        });
        const rerun = (failedAgain = true) => ({lanes: {}, tooMany: {}, results: results(failedAgain)});

        it('calls a failure a product bug only when it failed again on a fresh device', () => {
            assert.equal(message({rerun: rerun()}), [
                '🔴 **Mobile Main E2E — product bug** on `main`',
                '`0ec1413` · most likely from [#10266](https://github.com/mattermost/mattermost-mobile/pull/10266) [MM-71089] Log websocket client creation failures',
                '**11 failed** · 1263 passed · 89 skipped',
                '🐞 **Product bugs (1) — failed again on a fresh device:** 🤖 detox-android 1',
                '- 🤖 detox-android test 0',
                '🔁 **Not product bugs:** 9 passed on a fresh device · 1 flaky · 5 passed on retry',
                `➡️ [Workflow run](${runUrl})`,
                '',
            ].join('\n'));
        });

        it('posts nothing when every failure passed on a fresh device', () => {
            assert.equal(message({rerun: rerun(false)}), null);
        });

        it('takes the fresh-device re-run over a retry that passed with the same error', () => {
            const error = 'Test Failed: Timed out while waiting for expectation: TOBEVISIBLE WITH MATCHER(id == “login.screen”) TIMEOUT(10s)';
            const lanes = [{lane: 'detox-android', counts: {flaky: 1}, findings: [{...row('MM-T1 - logs in', 'REGRESSION', 'needs investigation'), error_first_line: error}]}];
            const params = {
                triage: lanes,
                perJobCounts: {'detox-android': {passed: 600, failed: 1, skipped: 0, flaky: 1}},
                failures: [{title: 'Login › MM-T2 - logs out', job: 'detox-android', error, passedOnRetry: true}],
            };
            assert.equal(message(params), null, 'the same error passed on retry: flaky');
            const again = message({...params, rerun: {lanes: {}, tooMany: {}, results: {'detox-android': new Map([['MM-T1 - logs in', 'failed']])}}});
            assert.match(again, /^🔴 \*\*Mobile Main E2E — product bug\*\* on `main`$/m);
        });

        it('confirms nothing that was not re-run', () => {
            assert.equal(message(), [
                '🟡 **Mobile Main E2E — no product bug confirmed** on `main`',
                '`0ec1413`',
                '**11 failed** · 1263 passed · 89 skipped',
                "🔎 **Not confirmed (10) — not re-run, or the re-run gave no result:** 🤖 detox-android 2 · 🤖 maestro-android 8 (9 of 11 tests failed: check that run's setup first)",
                '🔁 **Not product bugs:** 1 flaky · 5 passed on retry',
                `➡️ [Workflow run](${runUrl})`,
                '',
            ].join('\n'));
            const stale = message({rerun: {lanes: {}, tooMany: {}, results: {}, stale: {'detox-android': ['test 0', 'test 1']}}});
            assert.match(stale, /^📝 \*\*Test differs from main \(2\) — out of date on this branch, not re-run:\*\* 🤖 detox-android 2$/m);
            assert.match(stale, /^🟡 /);
            const tooMany = message({rerun: {lanes: {}, tooMany: {'maestro-android-e2e': 12}, results: {}}});
            assert.match(tooMany, /🤖 maestro-android 8 \(12 failed at once, too many to re-run: check that run's setup first\)$/m);
        });

        it('posts nothing when the run passed, or when no failure is a product bug', () => {
            assert.equal(message({detail: {status: 'completed', test_stats: {passed: 1263, failed: 0, skipped: 89}, reports: []}, perJobCounts: {'detox-ios': {passed: 1263, failed: 0, skipped: 89}}, triage: []}), null);
            const cleared = [
                {lane: 'detox-android', counts: {flaky: 4}, findings: [row('a', 'FLAKY_ON_TRUNK', 'flaky'), row('b', 'BROKEN_ON_TRUNK', 'broken on main')]},
                {lane: 'maestro-android-e2e', counts: {flaky: 0}, findings: [row('c', 'REGRESSION', 'test bug')]},
            ];
            const counts = {'detox-android': {passed: 614, failed: 2, skipped: 0, flaky: 4}, 'maestro-android-e2e': {passed: 10, failed: 1, skipped: 0}};
            assert.equal(message({triage: cleared, perJobCounts: counts, detail: {...detail, test_stats: {passed: 624, failed: 3, skipped: 0}}}), null);
        });

        it('names which change most likely broke a test new on main', () => {
            const second = (changed) => message({changes: changed, rerun: rerun()}).split('\n')[1];
            assert.equal(second(null), '`0ec1413` · most likely from a change merged since the last main run');
            assert.equal(second({from: identity.commit_sha, to: identity.commit_sha, prs: []}), '`0ec1413` · no change was merged since the last main run, so no new change explains these');
            const prs = [10300, 10301, 10302, 10303].map((number) => ({number, title: 'x'}));
            assert.match(second({...changes, prs}), /^`0ec1413` · most likely from one of the 4 changes merged since the last main run: \[#10300\]\(.*\) · \[#10301\]\(.*\) · \[#10302\]\(.*\) and 1 more$/);
            assert.match(second({...changes, prs, partial: true}), /^`0ec1413` · most likely from one of the many changes merged since the last main run \(`3927243` → `0ec1413`\), among them \[#10300\]/);
            const appBug = [{lane: 'detox-android', counts: {flaky: 0}, findings: [row('a', 'REGRESSION', 'app bug')]}];
            const again = {lanes: {}, tooMany: {}, results: {'detox-android': new Map([['a', 'failed']])}};
            assert.equal(message({triage: appBug, rerun: again, perJobCounts: {'detox-android': {passed: 5, failed: 1}}}).split('\n')[1], '`0ec1413`', 'no change is named for a bug that is not new on main');
        });

        it('confirms nothing when triage could not tell, or left no verdict', () => {
            const lanes = [{lane: 'detox-android', counts: {flaky: 0}, findings: [row('a', 'INSUFFICIENT_DATA', 'needs investigation')]}];
            const counts = {'detox-android': {passed: 5, failed: 1}, 'detox-ios': {passed: 5, failed: 2}};
            const text = message({triage: lanes, perJobCounts: counts, detail: {...detail, test_stats: {passed: 10, failed: 3, skipped: 0}}});
            assert.match(text, /^🟡 \*\*Mobile Main E2E — no product bug confirmed\*\* on `main`$/m);
            assert.match(text, /^🔎 \*\*Not confirmed \(3\) — not re-run, or the re-run gave no result:\*\* 📱 detox-ios 2 · 🤖 detox-android 1$/m);
        });

        it('judges from the error text a failed test triage did not name', () => {
            const failures = [{title: 'Login MM-T1 - should log in', job: 'detox-ios', error: 'connect ECONNREFUSED 127.0.0.1:8065'}];
            const text = message({triage: [], failures, perJobCounts: {'detox-ios': {passed: 5, failed: 1}}, detail: {...detail, test_stats: {passed: 5, failed: 1, skipped: 0}}});
            assert.match(text, /^🟡 \*\*Mobile Main E2E — setup problem\*\* on `main`$/m);
            assert.match(text, /^🔁 \*\*Not product bugs:\*\* 1 setup \(device or server\)$/m);
        });

        it('calls a run with no results, or a CI failure outside the tests, a setup problem', () => {
            const noResults = message({triage: [], perJobCounts: {'detox-ios': {passed: 5, failed: 0}}, detail: {status: 'completed', test_stats: {passed: 5, failed: 0}, reports: [{gh_job_name: 'maestro-ios-e2e', status: 'complete'}]}});
            assert.match(noResults, /^🟡 \*\*Mobile Main E2E — setup problem\*\*/);
            assert.match(noResults, /^⚙️ \*\*No results:\*\* 📱 maestro-ios — test results did not upload, or the run ran no tests; re-run to see if anything failed$/m);
            const ci = message({triage: [], perJobCounts: {'detox-ios': {passed: 5, failed: 0}}, detail: {status: 'completed', test_stats: {passed: 5, failed: 0}, reports: []}, upstreamJobsSucceeded: false});
            assert.match(ci, /^⚙️ A CI job failed outside the tests \(install, build or teardown\)\.$/m);
        });

        it('is what the PR and CMT messages are not', () => {
            assert.equal(formatMainChannelMessage({compositeIdentity: identity, detail, perJobCounts, triage, changes, failures: []}), message({runUrl: undefined}));
            assert.match(formatCmtChannelMessage({compositeIdentity: {...identity, name: 'mobile-pr', run_group: 'mobile-pr'}, detail, perJobCounts, triage, failures: []}), /^## ❌ Mobile PR E2E/);
        });
    });

    // Error lines from main runs 39227310405, 39245443446, 39295124902 and 40764686027: none was a product bug.
    describe('judgeFinding', () => {
        const finding = (error, cls = 'REGRESSION', label = 'needs investigation') => ({title: 't', class: cls, label, error_first_line: error});
        const lane = (findings, counts = {passed: 600, failed: findings.length}) => ({findings, counts});
        const judge = (error) => {
            const row = finding(error);
            return judgeFinding(row, lane([row]));
        };

        it('clears a failure whose error is the setup, the harness, the device or the test code', () => {
            assert.equal(judge('Error: thrown: "Exceeded timeout of 300000 ms for a hook.'), 'setup');
            assert.equal(judge('Error: thrown: "Exceeded timeout of 360000 ms for a test.'), 'setup');
            assert.equal(judge('Error: Failed to enable ABAC: {"message":"No response from server: timeout of 45000ms exceeded.'), 'setup');
            assert.equal(judge('Error: [beforeAll] Failed to create regular bot: {"id":"api.context.invalid_param.app_error","message":"Invalid post.channel_id"}'), 'setup');
            assert.equal(judge('AllowDownloadLogs=false never reached the client config; the flow\'s pre-condition was not in force'), 'setup');
            assert.equal(judge('maestro.android.DeviceServerDiedException: Device server died during \'viewHierarchy\' on emulator-5554'), 'setup');
            assert.equal(judge('Detox can\'t seem to connect to the test app(s)!'), 'setup');
            assert.equal(judge('TypeError: Cannot read properties of undefined (reading \'id\')'), 'test');
        });

        it('leaves an app assertion to the re-run, and never touches what triage cleared', () => {
            assert.equal(judge('Test Failed: Timed out while waiting for expectation: TOBEVISIBLE WITH MATCHER(id == “login.screen”) TIMEOUT(10s)'), 'new');
            assert.equal(judge(''), 'new');
            const flaky = finding('Error: thrown: "Exceeded timeout of 300000 ms for a hook.', 'FLAKY_ON_TRUNK', 'flaky');
            assert.equal(judgeFinding(flaky, lane([flaky])), 'flaky');
        });

        it('calls it setup when the server said the feature is off for another spec of the same feature', () => {
            const folder = 'detox/e2e/test/products/channels/channel_attributes';
            const off = {...finding('Error: failed to create the channel for MM-T6310_1: {"id":"api.channel.create_channel.attributes_feature_disabled"}'), file: `${folder}/chip_update.e2e.ts`};
            const ui = {...finding('Test Failed: Timed out while waiting for expectation: TOBEVISIBLE WITH MATCHER(id == “channel_attribute_labels”)'), file: `${folder}/chips.e2e.ts`};
            const elsewhere = {...ui, file: 'detox/e2e/test/products/channels/messaging/chips.e2e.ts'};
            assert.equal(judgeFinding(ui, lane([off, ui])), 'setup');
            assert.equal(judgeFinding(elsewhere, lane([off, elsewhere])), 'new', 'another feature is judged on its own');
        });

        it('calls it the run when most tests that ran failed with the same error', () => {
            const rows = Array.from({length: 9}, () => finding('Assertion is false: id: login_form.forgot_password.button is visible'));
            assert.equal(judgeFinding(rows[0], lane(rows, {passed: 2, failed: 9})), 'setup', '9 of 11 Maestro flows');
            assert.equal(judgeFinding(rows[0], lane(rows, {passed: 600, failed: 9})), 'new', 'a minority of the lane is judged one by one');
            assert.equal(judgeFinding(rows[0], lane(rows.slice(0, 2), {passed: 0, failed: 2})), 'new', 'two tests are too few to call it the run');
        });

        it('calls it flaky when a test failed with the same error and passed its retry', () => {
            const error = 'Test Failed: Timed out while waiting for expectation: TOBEVISIBLE WITH MATCHER(id == “login.screen”) TIMEOUT(10s)';
            const row = finding(error);
            assert.equal(judgeFinding(row, lane([row]), new Set([error])), 'flaky');
            assert.equal(judgeFinding(row, lane([row]), new Set(['Test Failed: something else'])), 'new');
        });
    });
});
