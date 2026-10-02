// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {describe, it} = require('node:test');

const {sanitize} = require('../e2e/path_builder');

const {failedTests, busyReports, serverErrors, summarize, buildEvidence} = require('./triage-evidence');

// detox-ios on mattermost-mobile#10172 (run 36863495910): MM-T4786_4 hit the
// 300 s Jest timeout while the app waited on a pin request the server never answered.
const TITLE = 'MM-T4786_4 - should be able to follow/unfollow a message, save/unsave a message, and pin/unpin a message';
const FULL = `Smoke Test - Messaging ${TITLE}`;
const SPEC = '/Users/runner/work/mattermost-mobile/mattermost-mobile/detox/e2e/test/products/channels/smoke_test/messaging.e2e.ts';
const PIN = 'The event "Network Request" is taking place with object: "URL: “https://site-1.test.mattermost.cloud/api/v4/posts/6qgx5feu7pbhtqgyejwyudj6pr/pin”".';
const LOG = [
    '14:18:38.358 detox[28001] i Smoke Test - Messaging: MM-T4786_3 - should be able to include emojis in a message',
    '14:20:01.000 detox[28001] i The app is busy with the following tasks:',
    '• The event "Network Request" is taking place with object: "URL: “https://site-1/api/v4/reactions”".',
    '14:21:32.149 detox[28001] i Smoke Test - Messaging: MM-T4786_3 - should be able to include emojis in a message [OK]',
    `14:21:32.151 detox[28001] i Smoke Test - Messaging: ${TITLE}`,
    '14:22:19.700 detox[28001] i The app is busy with the following tasks:',
    '• There are 1 work items pending on the dispatch queue: "Main Queue (<OS_dispatch_queue_main: com.apple.main-thread>)".',
    '• The event "Network Request" is taking place with object: "URL: “https://site-1/api/v4/channels/667d/stats”".',
    '• Run loop "Main Run Loop" is awake.',
    '14:26:30.439 detox[28001] i \u001b[90mThe app is busy with the following tasks:\u001b[39m',
    '• There are 1 work items pending on the dispatch queue: "Main Queue (<OS_dispatch_queue_main: com.apple.main-thread>)".',
    `• ${PIN}`,
    '• Run loop "Main Run Loop" is awake.',
    '14:26:53.620 detox[28001] i cannot save an already discarded artifact to: artifacts/ios.sim.debug/Smoke Test - Messaging MM-T4786_4',
    `14:26:53.685 detox[28001] i Smoke Test - Messaging: ${TITLE} [FAIL]`,
    '14:26:53.711 detox[28001] i Smoke Test - Messaging: MM-T4786_5 - should be able to post a message with at-mention',
].join('\n');
const RESULTS = {
    testResults: [{
        testFilePath: SPEC,
        assertionResults: [
            {status: 'passed', title: 'MM-T4786_3 - should be able to include emojis in a message', fullName: 'Smoke Test - Messaging MM-T4786_3 - should be able to include emojis in a message', failureMessages: []},
            {status: 'failed', title: TITLE, fullName: FULL, failureMessages: ['thrown: "Exceeded timeout of 300000 ms for a test.\nAdd a timeout value to this test to increase the timeout']},
            {status: 'failed', title: 'MM-T4786_5 - should be able to post a message with at-mention', fullName: 'Smoke Test - Messaging MM-T4786_5', failureMessages: ['Error: Test Failed: No elements found for “MATCHER(id == “post_list”)”']},
        ],
    }],
};

// detox-ios machine 17 on run 36901673758: MM-T4781_4 timed out without the app
// ever being busy; the test's own setup calls got Cloudflare challenge pages.
const CF_TITLE = 'MM-T4781_4 - should be able to create a message draft from reply thread';
const CF_LOG = [
    `18:31:15.758 detox[30878] i Messaging - Message Draft: ${CF_TITLE}`,
    '18:32:37.058 detox[30878] i [provision] [client] "_cf_chl_opt" HTML from server — retry 1/3 in 3000ms for https://site-1.test.mattermost.cloud/api/v4/channels/5rij/members',
    '18:32:40.234 detox[30878] i [provision] [client] "_cf_chl_opt" HTML from server — retry 2/3 in 6000ms for https://site-1.test.mattermost.cloud/api/v4/channels/9xk2/members',
    '18:32:55.639 detox[30878] i [getResponseFromError] Network error: No response from server: Server returned "_cf_chl_opt" HTML for https://site-1.test.mattermost.cloud/api/v4/channels/5rij',
    '    at Object.<anonymous> (/Users/runner/work/detox/e2e/support/server_api/client.ts:40:15) No response from server',
    `18:36:40.700 detox[30878] i Messaging - Message Draft: ${CF_TITLE} [FAIL]`,
].join('\n');

// mattermost-mobile#10172, detox-ios (run 36923637656): MM-T4809_1 failed with "No
// elements found" — not a timeout, so the timeout listener took no screenshot,
// but Detox kept its own failure screenshot for the test.
const REPLY_FULL = 'Threads MM-T4809_1 - should be able to reply to a thread via thread options';
const REPLY_RESULTS = {testResults: [{testFilePath: SPEC,
    assertionResults: [
        {status: 'failed', title: 'MM-T4809_1 - should be able to reply to a thread via thread options', fullName: REPLY_FULL, failureMessages: ['Test Failed: No elements found for “MATCHER(id == “thread.post_list.post.9m4g”)”']},
    ]}]};

describe('triage-evidence', () => {
    it('should pick every failed test, keyed by repository path, and mark the timeouts', () => {
        assert.deepEqual(failedTests(RESULTS).map((t) => [t.file, t.title, t.timedOut]), [
            ['detox/e2e/test/products/channels/smoke_test/messaging.e2e.ts', TITLE, true],
            ['detox/e2e/test/products/channels/smoke_test/messaging.e2e.ts', 'MM-T4786_5 - should be able to post a message with at-mention', false],
        ]);
    });

    it('should read the busy reports printed while that test ran, not the previous one', () => {
        const reports = busyReports(LOG, TITLE);
        assert.deepEqual(reports.map((r) => r.time), ['14:22:19', '14:26:30']);
        assert.ok(reports[1].tasks.includes(PIN));
        assert.deepEqual(busyReports(LOG, 'a test that never ran'), []);
    });

    it('should name what the app was still waiting on when the test timed out', () => {
        const notes = summarize(busyReports(LOG, TITLE));
        assert.match(notes, /^Detox reported the app busy 2 time\(s\) between 14:22:19 and 14:26:30/);
        assert.match(notes, /posts\/6qgx5feu7pbhtqgyejwyudj6pr\/pin/);
        assert.doesNotMatch(notes, /dispatch queue|Run loop/, 'routine tasks are present whenever the app runs');
        assert.doesNotMatch(notes, /stats/, 'a request that finished earlier is not what it was stuck on');
        assert.equal(summarize([]), '');
    });

    it('should count the test\'s failed server calls, grouped without their URLs', () => {
        const errors = serverErrors(CF_LOG, CF_TITLE);
        assert.deepEqual(errors.map((e) => e.count), [2, 1]);
        assert.match(errors[0].message, /^\[provision\] \[client\] "_cf_chl_opt" HTML from server — retry N\/N in Nms for <url>$/);
        assert.deepEqual(serverErrors(LOG, TITLE), [], 'a stuck app is not a failed server call');
        const notes = summarize(busyReports(CF_LOG, CF_TITLE), errors);
        assert.match(notes, /^The test's own calls to the test server failed 3 time\(s\) while it ran: .*_cf_chl_opt.*\(x2\)/);
    });

    it('should copy Detox\'s failure screenshot, from the newest run, for a failure that is not a timeout', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'triage-artifacts-'));
        const evidenceDir = path.join(root, 'triage-evidence');
        try {
            const old = path.join(root, 'ios.sim.debug.2026-10-01 20-00-00Z', sanitize(REPLY_FULL));
            const recent = path.join(root, 'ios.sim.debug.2026-10-01 21-00-00Z', sanitize(REPLY_FULL));
            fs.mkdirSync(old, {recursive: true});
            fs.mkdirSync(recent, {recursive: true});
            fs.writeFileSync(path.join(old, 'testFnFailure.png'), 'old');
            fs.writeFileSync(path.join(recent, 'testDone.png'), 'done');
            fs.writeFileSync(path.join(recent, 'testFnFailure.png'), 'recent');
            const past = new Date(Date.now() - 60000);
            fs.utimesSync(old, past, past);

            const [entry] = buildEvidence({results: REPLY_RESULTS, logText: '', evidenceDir, artifactsDir: root});
            assert.deepEqual(entry.images, [path.join(sanitize(REPLY_FULL), 'failure.png')]);
            assert.equal(fs.readFileSync(path.join(evidenceDir, entry.images[0]), 'utf8'), 'recent', 'the failure screenshot of the latest attempt');
            assert.equal(entry.notes, '');
        } finally {
            fs.rmSync(root, {recursive: true, force: true});
        }
    });

    it('should pair the timeout screenshot with the notes in the evidence-dir format', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'triage-evidence-'));
        try {
            fs.mkdirSync(path.join(dir, sanitize(FULL)), {recursive: true});
            fs.writeFileSync(path.join(dir, sanitize(FULL), 'timeout.png'), 'png');
            const [entry, ...rest] = buildEvidence({results: RESULTS, logText: LOG, evidenceDir: dir, artifactsDir: path.join(dir, 'none')});
            assert.equal(rest.length, 0, 'the other failure has neither a screenshot nor notes');
            assert.equal(entry.file, 'detox/e2e/test/products/channels/smoke_test/messaging.e2e.ts');
            assert.equal(entry.full_title, FULL);
            assert.deepEqual(entry.images, [path.join(sanitize(FULL), 'timeout.png')]);
            assert.match(entry.notes, /pin/);

            // No screenshot and no busy reports: nothing to say beyond the error.
            assert.deepEqual(buildEvidence({results: RESULTS, logText: '', evidenceDir: path.join(dir, 'none'), artifactsDir: path.join(dir, 'none')}), []);
        } finally {
            fs.rmSync(dir, {recursive: true, force: true});
        }
    });
});
