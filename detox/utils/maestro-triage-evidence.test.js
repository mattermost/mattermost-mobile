// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {describe, it} = require('node:test');

const {failedFlows, debugOutput, describeCommand, flowSteps, appErrors, errorsDuring, summarize, buildEvidence} = require('./maestro-triage-evidence');

// maestro-ios on mattermost-mobile#10172 (run 37094586969): the server rejected
// the bookmark save, the app showed "Error adding bookmark", and the flow's next
// assertion failed 31 s later.
const FLOW = 'channel_bookmark_link_external';
const FILE = 'detox/maestro/flows/channels/channel_bookmark_link_external.yml';
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="${FILE}" tests="1" failures="1">
    <testcase id="${FLOW}" name="${FLOW}" classname="${FILE}" file="${FILE}" time="387.0" status="FAILED">
      <failure>Assertion is false: id: channel_bookmark.screen is not visible</failure>
    </testcase>
  </testsuite>
  <testsuite name="detox/maestro/flows/account/attach_logs_toggle_visible.yml" tests="1" failures="0">
    <testcase id="attach_logs_toggle_visible" name="attach_logs_toggle_visible" file="detox/maestro/flows/account/attach_logs_toggle_visible.yml" time="256.0" status="SUCCESS"/>
  </testsuite>
</testsuites>`;

const START = Date.parse('2026-10-03T04:13:28.271Z');
const cmd = (offset, status, command, extra = {}) => ({command, metadata: {status, timestamp: START + offset, duration: 1000, ...extra}});
const COMMANDS = [
    cmd(0, 'COMPLETED', {runFlowCommand: {commands: []}}, {duration: 400000}),
    cmd(10000, 'COMPLETED', {inputTextCommand: {text: 'secret-password'}}),
    cmd(20000, 'COMPLETED', {tapOnElement: {selector: {idRegex: 'channel_bookmark.type.link'}}}),
    cmd(30000, 'COMPLETED', {inputTextCommand: {text: 'https://mattermost.com'}}),
    cmd(40000, 'COMPLETED', {assertConditionCommand: {condition: {visible: {idRegex: 'channel_bookmark.add.title.input'}}}}),
    cmd(50000, 'COMPLETED', {tapOnElement: {selector: {textRegex: 'Save'}}}),
    cmd(60000, 'FAILED', {runFlowCommand: {commands: []}}, {duration: 31127, error: {message: 'Assertion is false: id: channel_bookmark.screen is not visible'}}),
    cmd(60001, 'FAILED', {assertConditionCommand: {condition: {notVisible: {idRegex: 'channel_bookmark.screen'}}}}, {duration: 31127, error: {message: 'Assertion is false: id: channel_bookmark.screen is not visible'}}),
    cmd(95000, 'WARNED', {tapOnElement: {selector: {textRegex: 'Not Now', optional: true}}}),
];

// The bookmark error lands inside the flow; the metric error 6 minutes later belongs to another flow.
const IOS_LOG = [
    '2026-10-03 00:01:35.786312-0400 0x345c0    Debug       0x0                  89620  0    Mattermost: [com.mattermost.rnbeta:TurboLogger] getServerUrlAfterRedirect error https://site-1.test.mattermost.cloud',
    '2026-10-03 00:14:19.000000-0400 0x43fda    Error       0x0                  11167  0    Mattermost: (CFNetwork) [com.apple.CFNetwork:Default] Task finished with error',
    '2026-10-03 00:14:19.239031-0400 0x43fda    Error       0x0                  11167  0    Mattermost: [com.mattermost.rnbeta:TurboLogger] error on createChannelBookmark Could not save bookmark.',
    '2026-10-03 00:25:08.628504-0400 0x4bbb9    Error       0x0                  27139  0    Mattermost: [com.mattermost.rnbeta:TurboLogger] We could not retrieve the mobile load metric',
].join('\n');

// adb logcat -v threadtime -v year -v UTC
const ANDROID_LOG = [
    '2026-10-03 04:14:18.004  6137  6181 I TurboLogger: saving bookmark',
    '2026-10-03 04:14:19.004  6137  6181 E TurboLogger: error on createChannelBookmark Could not save bookmark.',
    '2026-10-03 04:14:20.004  6137  6181 E TurboLogger: websocket error server https://site-1.test.mattermost.cloud code reason',
    '10-03 00:14:21.004  6137  6181 E TurboLogger: legacy line without a year',
].join('\n');

function fixture() {
    const build = fs.mkdtempSync(path.join(os.tmpdir(), 'maestro-evidence-'));
    const old = path.join(build, 'maestro-artifacts', 'debug', 'maestro-batch-1');
    const latest = path.join(build, 'maestro-artifacts', 'debug', 'maestro-batch-2');
    fs.mkdirSync(old, {recursive: true});
    fs.mkdirSync(latest, {recursive: true});
    fs.writeFileSync(path.join(old, `screenshot-❌-1791000000000-(${FLOW}).png`), 'old');
    fs.writeFileSync(path.join(old, `commands-(${FLOW}).json`), '[]');
    fs.writeFileSync(path.join(latest, `screenshot-❌-1791001177254-(${FLOW}).png`), 'png');
    fs.writeFileSync(path.join(latest, `commands-(${FLOW}).json`), JSON.stringify(COMMANDS));
    fs.mkdirSync(path.join(build, 'maestro-artifacts-tsio'), {recursive: true});
    fs.writeFileSync(path.join(build, 'maestro-artifacts-tsio', `screenshot-❌-1891001177254-(${FLOW}).png`), 'copy');
    return build;
}

describe('maestro triage evidence', () => {
    it('lists only the flows that failed, with the path TSIO records', () => {
        assert.deepEqual(failedFlows(XML), [{file: FILE, title: FLOW, error: 'Assertion is false: id: channel_bookmark.screen is not visible'}]);
        assert.deepEqual(failedFlows('<testcase name="a" file="f.yml" status="ERROR"/>'), [{file: 'f.yml', title: 'a', error: ''}]);
        assert.deepEqual(failedFlows('<testcase name="a" file="a&amp;b.yml" status="SUCCESS"></testcase>'), []);
    });

    it('picks the newest failure screenshot and the command log beside it, ignoring the TSIO copies', () => {
        const build = fixture();
        const files = require('node:fs').readdirSync(build, {recursive: true}).map((f) => path.join(build, f));
        const {screenshot, commands} = debugOutput(files.filter((f) => !f.includes('maestro-artifacts-tsio')), FLOW);
        assert.match(screenshot, /maestro-batch-2\/screenshot-❌-1791001177254/u);
        assert.match(commands, /maestro-batch-2\/commands-/);
        assert.deepEqual(debugOutput(files, 'other_flow'), {screenshot: null, commands: null});
    });

    it('names the innermost failed step and the steps before it, never typed text', () => {
        const steps = flowSteps(COMMANDS);
        assert.deepEqual(steps.failed, {step: 'assert not visible id channel_bookmark.screen', error: 'Assertion is false: id: channel_bookmark.screen is not visible', ms: 31127});
        assert.deepEqual(steps.before, ['tap id channel_bookmark.type.link', 'input text', 'assert visible id channel_bookmark.add.title.input', 'tap text "Save"']);
        assert.equal(steps.start, START);
        assert.equal(steps.end, START + 60001 + 31127);
        assert.ok(!JSON.stringify(steps).includes('secret-password'));
        assert.equal(describeCommand({inputTextCommand: {text: 'hunter2'}}), 'input text');
        assert.deepEqual(flowSteps([]), {failed: null, before: [], start: null, end: null});
    });

    it('reads the app errors from both device logs with their real time', () => {
        assert.deepEqual(appErrors(IOS_LOG), [
            {time: Date.parse('2026-10-03T04:14:19.239Z'), message: 'error on createChannelBookmark Could not save bookmark.'},
            {time: Date.parse('2026-10-03T04:25:08.628Z'), message: 'We could not retrieve the mobile load metric'},
        ]);
        assert.deepEqual(appErrors(ANDROID_LOG).map((e) => e.message), [
            'error on createChannelBookmark Could not save bookmark.',
            'websocket error server https://site-1.test.mattermost.cloud code reason',
        ]);
    });

    it('keeps only errors logged while the flow ran, grouped and without server URLs', () => {
        const {start, end} = flowSteps(COMMANDS);
        assert.deepEqual(errorsDuring(appErrors(IOS_LOG), start, end), [{message: 'error on createChannelBookmark Could not save bookmark.', count: 1}]);
        assert.deepEqual(errorsDuring(appErrors(ANDROID_LOG), start, end), [
            {message: 'error on createChannelBookmark Could not save bookmark.', count: 1},
            {message: 'websocket error server <url> code reason', count: 1},
        ]);
        assert.deepEqual(errorsDuring(appErrors(IOS_LOG), null, null), []);
    });

    it('says so when the app logged nothing', () => {
        const steps = flowSteps(COMMANDS);
        assert.match(summarize(steps, []), /The app logged no errors while this flow ran\.$/);
        assert.equal(summarize({failed: null, before: []}, []), '');
    });

    it('writes one entry per failed flow in the e2e-triage evidence format', () => {
        const build = fixture();
        const evidenceDir = path.join(build, 'triage-evidence');
        const entries = buildEvidence({xml: XML, buildDir: build, deviceLog: IOS_LOG, evidenceDir});
        assert.equal(entries.length, 1);
        const [e] = entries;
        assert.equal(e.file, FILE);
        assert.equal(e.title, FLOW);
        assert.deepEqual(e.images, [path.join(FLOW, 'failure.png')]);
        assert.equal(fs.readFileSync(path.join(evidenceDir, e.images[0]), 'utf8'), 'png');
        assert.equal(e.notes, 'Maestro stopped at "assert not visible id channel_bookmark.screen" (Assertion is false: id: channel_bookmark.screen is not visible) after 31s on that step. ' +
            'Steps just before: tap id channel_bookmark.type.link -> input text -> assert visible id channel_bookmark.add.title.input -> tap text "Save". ' +
            'The app logged 1 error(s) while this flow ran: error on createChannelBookmark Could not save bookmark. (x1)');

        // A second run over the same build dir does not read its own output.
        assert.deepEqual(buildEvidence({xml: XML, buildDir: build, deviceLog: IOS_LOG, evidenceDir}), entries);
    });

    it('writes nothing for a flow with no debug output and no log', () => {
        const build = fs.mkdtempSync(path.join(os.tmpdir(), 'maestro-evidence-'));
        assert.deepEqual(buildEvidence({xml: XML, buildDir: build, deviceLog: '', evidenceDir: path.join(build, 'triage-evidence')}), []);
    });
});
