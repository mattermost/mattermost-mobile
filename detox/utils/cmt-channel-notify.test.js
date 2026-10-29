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
    formatTriageVerdict,
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
        it('renders one combined table with overall + per-leg rows and consolidated link', () => {
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

            assert.match(text, /^## ❌ Mobile CMT\n/);
            assert.match(text, /\*\*Branch:\*\* `release-2\.40` · \*\*Commit:\*\* `55afc0b`/);
            assert.match(text, /🔴 \*\*1 failing test\*\*/);
            assert.doesNotMatch(text, /#### Detailed results/);
            assert.doesNotMatch(text, /<details>/);
            assert.match(text, /\| \*\*Overall\*\* \| \*\*460\*\* \| \*\*1\*\* \| \*\*40\*\* \| ❌ Failed \|/);
            assert.match(
                text,
                /\| \[📱 detox-ios \(11\.9\.0\)\]\(https:\/\/test-io\.test\.mattermost\.com\/reports\/r\/rid-ios\) \| 231 \| 0 \| 20 \| ✅ 231\/231 \|/,
            );
            assert.match(
                text,
                /\| \[🤖 detox-android \(11\.9\.0\)\]\(https:\/\/test-io\.test\.mattermost\.com\/reports\/r\/rid-android\) \| 230 \| 1 \| 20 \| ❌ 230\/231 \|/,
            );
            assert.match(text, /➡️ \*\*Consolidated report:\*\* https:\/\/test-io\.test\.mattermost\.com\/reports\/mattermost-mobile\/release-2\.40\/55afc0b\/mobile-release/);
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
                    branch: 'main',
                    commit_sha: 'a1b2c3d4e5f678901234567890abcdef12345678',
                    name: 'mobile-main',
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
            assert.match(text, /^## ❌ Mobile Main E2E\n/);
            assert.match(text, /\| \*\*Overall\*\* \| \*\*100\*\* \| \*\*0\*\* \| \*\*0\*\* \| ❌ Failed \|/);
            assert.match(text, /TSIO reported failed shard\(s\) not reflected in the test totals/);
        });

        it('does not blame CI when the failing jobs are explained by failing tests', () => {
            const text = formatCmtChannelMessage({
                compositeIdentity: {branch: 'main', commit_sha: 'a1b2c3d', name: 'mobile-main'},
                detail: {
                    status: 'incomplete',
                    test_stats: {passed: 100, failed: 3, skipped: 0, total: 103},
                    reports: [],
                },
                perJobCounts: {},
                upstreamJobsSucceeded: false,
                hasFailures: true,
            });
            assert.match(text, /^## ❌ Mobile Main E2E\n/);
            assert.doesNotMatch(text, /outside tracked tests/);
        });

        it('still flags CI failures outside tracked tests when no test failed', () => {
            const text = formatCmtChannelMessage({
                compositeIdentity: {branch: 'main', commit_sha: 'a1b2c3d', name: 'mobile-main'},
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
                compositeIdentity: {branch: 'main', commit_sha: 'a1b2c3d', name: 'mobile-main'},
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
                compositeIdentity: {branch: 'build-release-833', commit_sha: '97a2993abc', name: 'mobile-release'},
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
                compositeIdentity: {branch: 'build-release-833', commit_sha: '97a2993abc', name: 'mobile-release'},
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
                compositeIdentity: {branch: 'build-release-833', commit_sha: '97a2993abc', name: 'mobile-release'},
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
                compositeIdentity: {branch: 'build-release-833', commit_sha: '97a2993abc', name: 'mobile-release'},
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
                compositeIdentity: {branch: 'main', commit_sha: 'a1b2c3d', name: 'mobile-main'},
                detail: {status: 'completed', test_stats: {passed: 1, failed: 0}, reports: []},
                perJobCounts: {},
            });
            assert.doesNotMatch(text, /Failure judgement/);
        });
    });

    describe('notifyCmtChannel', () => {
        const identity = {
            repository: 'mattermost/mattermost-mobile',
            branch: 'refs/heads/main',
            commit_sha: 'a1b2c3d4e5f6',
            gh_run_id: '30424009936',
            name: 'mobile-main',
            run_group: 'mobile-main',
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
        const changes = {from: '39272432327c8ce7c8bf074f86db656ca9be4b20', to: '0ec1413a1a8bd595c2f70f144d7de02051d382e7', prs: [{number: 10266, title: '[MM-71089] Log websocket client creation errors'}]};

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

        it('names the change merged since the last main run for new failures, and counts retried passes as flaky', () => {
            const text = formatTriageVerdict({triage, onMain: true, changes}).join('\n');
            assert.match(text, /^🆕 \*\*New on main\*\* — passed every earlier main run, fail now \(2\)$/m);
            assert.match(text, /^Most likely broken by the one change merged since the last main run \(`3927243` → `0ec1413`\): \[#10266\]\(https:\/\/github\.com\/mattermost\/mattermost-mobile\/pull\/10266\) \[MM-71089\] Log websocket client creation errors$/m);
            assert.match(text, /^- 🤖 maestro-android clock_display$/m, 'a Maestro flow is named by its title, not its file path');
            assert.match(text, /^- 🤖 maestro-android call_ui_permission — failed by chance; it passes on retry or on other runs$/m);
            assert.match(text, /^🔁 \*\*Passed on retry, not product bugs:\*\* 5 tests \(🤖 detox-android 4, 📱 detox-ios 1\)$/m);
        });

        it('says when the changes since the last main run are unknown, and names a failed run with no verdict', () => {
            const legs = [{platform: 'ios', framework: 'maestro', kind: 'e2e', serverVersion: 'default', failed: 2, passed: 5}];
            const text = formatTriageVerdict({triage, onMain: true, changes: null, legs}).join('\n');
            assert.match(text, /^_Most likely broken by a change merged since the last main run\._$/m);
            const many = formatTriageVerdict({triage, onMain: true, changes: {...changes, partial: true}}).join('\n');
            assert.match(many, /one of the many changes merged since the last main run \(.*too many for GitHub to list them all\), among them: \[#10266\]/);
            const same = formatTriageVerdict({triage, onMain: true, changes: {from: 'cccc000', to: 'cccc000', prs: []}}).join('\n');
            assert.match(same, /^_No change was merged since the last main run \(same commit `cccc000`\), so no new change explains these\._$/m);
            assert.match(text, /^⚙️ \*\*Not checked:\*\* 📱 maestro-ios — the triage job left no verdict; look at the run$/m);
        });

        it('calls out a run where most tests failed at once', () => {
            const leg = (failed, passed) => ({platform: 'android', framework: 'maestro', kind: 'e2e', serverVersion: 'default', failed, passed});
            assert.deepEqual(formatMassFailures([leg(9, 2)]), ['⚠️ **🤖 maestro-android: 9 of 11 tests failed.** When most of a run fails at once it is usually its setup (device, app build or server) or one broken screen — look at that run before the single tests.']);
            assert.deepEqual(formatMassFailures([leg(4, 1), leg(9, 20)]), [], 'a few failures, or a minority of the run, are judged one by one');
        });

        it('uses the triage verdict instead of the error-text judgement when the triage jobs left one', () => {
            const params = {
                compositeIdentity: {repository: 'mattermost/mattermost-mobile', name: 'mobile-main', run_group: 'mobile-main', branch: 'main', commit_sha: '0ec1413a1'},
                detail: {status: 'completed', test_stats: {passed: 2, failed: 1, skipped: 0}, reports: []},
                perJobCounts: {'maestro-android-e2e': {passed: 2, failed: 1, skipped: 0}},
                failures: [{title: 'clock_display', job: 'maestro-android-e2e', error: 'Element not found'}],
            };
            const withTriage = formatCmtChannelMessage({...params, triage, changes});
            assert.match(withTriage, /🆕 \*\*New on main\*\*/);
            assert.doesNotMatch(withTriage, /Failure judgement/);
            const without = formatCmtChannelMessage(params);
            assert.match(without, /Failure judgement/, 'with no triage verdict the earlier judgement still runs');
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
            const text = formatTriageVerdict({triage: lanes, onMain: true, changes, legs, failures}).join('\n');
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
            const text = formatTriageVerdict({triage: lanes, onMain: false, legs, failures}).join('\n');
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
            const text = formatTriageVerdict({triage: lanes, onMain: false, legs}).join('\n');
            assert.match(text, /^⚙️ \*\*Not checked:\*\* .*10\.11\.0.* — the triage job left no verdict; look at the run$/m);
            assert.doesNotMatch(text, /Not checked:.*11\.9\.0/);
        });
    });
});
