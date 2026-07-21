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
            assert.equal(resolveWebhookUrl('cmt-mobile', env), env.MATTERMOST_CMT_WEBHOOK_URL);
        });

        it('sends main runs to the master-health webhook', () => {
            assert.equal(resolveWebhookUrl('mobile-main', env), env.MATTERMOST_MASTER_HEALTH_WEBHOOK_URL);
        });

        it('sends PR runs to the E2E webhook', () => {
            assert.equal(resolveWebhookUrl('mobile-pr', env), env.MATTERMOST_E2E_WEBHOOK_URL);
        });

        it('does not fall back CMT to the E2E webhook when release secret is missing', () => {
            assert.equal(
                resolveWebhookUrl('cmt-mobile', {MATTERMOST_E2E_WEBHOOK_URL: env.MATTERMOST_E2E_WEBHOOK_URL}),
                '',
            );
        });

        it('does not use the shared webhook when a dedicated CMT secret is missing', () => {
            assert.equal(
                resolveWebhookUrl('cmt-mobile', {MATTERMOST_WEBHOOK_URL: env.MATTERMOST_WEBHOOK_URL}),
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
                    name: 'cmt-mobile',
                },
                detail: {
                    status: 'completed',
                    test_stats: {passed: 460, failed: 1, skipped: 40, total: 501},
                    reports: [
                        {id: 'rid-ios', gh_job_name: 'detox-ios-Server_11.9.0', status: 'complete'},
                        {id: 'rid-android', gh_job_name: 'detox-android-Server_11.9.0', status: 'complete'},
                    ],
                },
                reportUrl: 'https://test-io.test.mattermost.com/reports/mattermost-mobile/release-2.40/55afc0b/cmt-mobile',
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
            assert.match(text, /\| 📱 detox-ios \(11\.9\.0\) \| 231 \| 0 \| 20 \| ✅ 231\/231 \|/);
            assert.match(text, /\| 🤖 detox-android \(11\.9\.0\) \| 230 \| 1 \| 20 \| ❌ 230\/231 \|/);
            assert.match(text, /➡️ \*\*Consolidated report:\*\* https:\/\/test-io\.test\.mattermost\.com\/reports\/mattermost-mobile\/release-2\.40\/55afc0b\/cmt-mobile/);
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
});
