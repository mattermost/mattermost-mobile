// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/tsio-triage-settle.test.js`.

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');

const {ownedByRun, readStatuses, settleTriageCheck, TRIAGE_CHECK_CONTEXT} = require('./tsio-triage-settle');

const repository = 'mattermost/mattermost-mobile';
const runId = '41806866909';
const runUrl = `https://github.com/${repository}/actions/runs/${runId}`;
const lanes = ['e2e-test/detox-ios', 'e2e-test/detox-android'];
const triage = (state, targetUrl = runUrl) => ({context: TRIAGE_CHECK_CONTEXT, state, target_url: targetUrl});
const lane = (context, state) => ({context, state, target_url: 'https://test-io.example/report'});
const settle = (rows, extra = {}) => settleTriageCheck({rows, lanes, repository, runId, runUrl, ...extra});

describe('tsio-triage-settle', () => {
    describe('ownedByRun', () => {
        it('owns its run page and the toolkit link that names the run', () => {
            assert.equal(ownedByRun(runUrl, repository, runId), true);
            assert.equal(ownedByRun(`https://github.com/${repository}/actions/runs/1?status_run_id=${runId}&status_run_attempt=2`, repository, runId), true);
        });

        it('does not own another run, another repository or a bad link', () => {
            assert.equal(ownedByRun(`https://github.com/${repository}/actions/runs/1`, repository, runId), false);
            assert.equal(ownedByRun(`https://github.com/${repository}/actions/runs/${runId}0`, repository, runId), false);
            assert.equal(ownedByRun(`https://github.com/other/repo/actions/runs/${runId}`, repository, runId), false);
            assert.equal(ownedByRun('not a url', repository, runId), false);
            assert.equal(ownedByRun(undefined, repository, runId), false);
        });
    });

    describe('settleTriageCheck', () => {
        it('settles this run\'s pending check red from the lanes, newest status first', () => {
            const rows = [
                lane('e2e-test/detox-ios', 'failure'),
                triage('pending'),
                lane('e2e-test/detox-android', 'success'),
                lane('e2e-test/detox-ios', 'pending'),
            ];
            assert.deepEqual(settle(rows), {
                state: 'failure',
                context: TRIAGE_CHECK_CONTEXT,
                description: 'No triage verdict: 1 E2E check(s) red as the tests set them',
                target_url: runUrl,
            });
        });

        it('counts a lane that is pending or never posted as not final, never green', () => {
            const settled = settle([triage('pending'), lane('e2e-test/detox-ios', 'pending')]);
            assert.equal(settled.state, 'failure');
            assert.equal(settled.description, 'No triage verdict: 2 with no final result');
        });

        it('settles green when every lane is green', () => {
            const settled = settle([triage('pending'), lane('e2e-test/detox-ios', 'success'), lane('e2e-test/detox-android', 'success')]);
            assert.equal(settled.state, 'success');
            assert.equal(settled.description, 'Every E2E check is green');
        });

        it('turns an earlier attempt\'s red green once a re-run made every lane green', () => {
            const rows = [lane('e2e-test/detox-ios', 'success'), lane('e2e-test/detox-android', 'success'), triage('failure', `${runUrl}?status_run_id=${runId}&status_run_attempt=1`)];
            assert.equal(settle(rows).state, 'success');
        });

        it('leaves a verdict triage wrote while a lane is still red, or one that is green', () => {
            assert.equal(settle([triage('failure'), lane('e2e-test/detox-ios', 'failure'), lane('e2e-test/detox-android', 'success')]), null);
            assert.equal(settle([triage('success'), lane('e2e-test/detox-ios', 'success'), lane('e2e-test/detox-android', 'success')]), null);
        });

        it('leaves another run\'s check, a missing check, or a run with no lanes alone', () => {
            assert.equal(settle([triage('pending', `https://github.com/${repository}/actions/runs/1`)]), null);
            assert.equal(settle([lane('e2e-test/detox-ios', 'failure')]), null);
            assert.equal(settle([triage('pending')], {lanes: []}), null);
        });
    });

    describe('readStatuses', () => {
        const wait = async () => {};
        const reply = (status, rows) => ({ok: status < 300, status, json: async () => rows, text: async () => `body ${status}`});

        it('tries a page again after a GitHub 5xx and reads every page', async () => {
            const full = Array.from({length: 100}, (_, i) => lane(`e2e-test/c${i}`, 'success'));
            const steps = [reply(503), reply(200, full), reply(200, [triage('pending')])];
            const urls = [];
            const fetchImpl = async (url) => {
                urls.push(url);
                return steps[urls.length - 1];
            };
            const rows = await readStatuses({token: 't', repository, sha: 'abc', fetchImpl, wait});
            assert.equal(rows.length, 101);
            assert.deepEqual(urls.map((u) => new URL(u).searchParams.get('page')), ['1', '1', '2']);
        });

        it('fails at once on a 4xx', async () => {
            let calls = 0;
            const fetchImpl = async () => {
                calls++;
                return reply(404);
            };
            await assert.rejects(readStatuses({token: 't', repository, sha: 'abc', fetchImpl, wait}), /reading statuses failed: 404/);
            assert.equal(calls, 1);
        });
    });
});
