// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// CI util unit tests: run with `node --test detox/utils/flake-verify.test.js`.

const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {describe, it} = require('node:test');

const {readRuns, summarize, overall, toMarkdown, upperBound, runsNeeded, fisherLess} = require('./flake-verify');

const SPEC = 'detox/e2e/test/products/channels/channels/archive_channel_from_settings.e2e.ts';
const TARGET = 'MM-T4932_3 - should be able to archive a private channel and confirm';
const SIBLING = 'MM-T4932_1 - should be able to archive a public channel and confirm';

function makeDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'flake-verify-'));
}

/**
 * @param {string} dir
 * @param {'baseline'|'candidate'} arm
 * @param {number} iteration
 * @param {Array<{title: string, status: string, retryReasons?: string[]}>|null} tests - null writes unreadable JSON
 */
function writeRun(dir, arm, iteration, tests, {lane = 'detox-android', attempt = 1} = {}) {
    const folder = path.join(dir, `e2e-rerun-results-${lane}-fv-${arm}-i${iteration}-a${attempt}`);
    fs.mkdirSync(folder, {recursive: true});
    const body = tests === null ? '{not json' : JSON.stringify({testResults: [{testFilePath: SPEC, testResults: tests}]});
    fs.writeFileSync(path.join(folder, 'jest-results-merged.json'), body);
}

/** Writes `runs` iterations of one arm, the first `failures` of them failing the target. */
function writeArm(dir, arm, runs, failures, extra = []) {
    for (let i = 1; i <= runs; i++) {
        writeRun(dir, arm, i, [{title: TARGET, status: i <= failures ? 'failed' : 'passed'}, ...extra]);
    }
}

const verify = (dir, repeats, targets = ['MM-T4932_3']) => {
    const rows = summarize(readRuns(dir), {repeats, specs: [SPEC], targets});
    return {rows, state: overall(rows), row: rows.find((r) => r.title === TARGET)};
};

describe('statistics', () => {
    it('should bound and size runs as the design notes say', () => {
        assert.equal(upperBound(10).toFixed(3), '0.259');
        assert.equal(runsNeeded(0.06), 49);
        assert.equal(upperBound(0), null);
    });

    it('should compute the one-sided Fisher p-value', () => {
        assert.equal(fisherLess(0, 10, 4, 10).toFixed(4), '0.0433');
        assert.ok(fisherLess(0, 10, 4, 10) < 0.05);
        assert.equal(fisherLess(0, 10, 1, 10), 0.5);
        assert.equal(fisherLess(0, 20, 3, 20).toFixed(3), '0.115');
    });
});

describe('verdicts', () => {
    it('should pass when main reproduced the failure and the PR fails significantly less', () => {
        const dir = makeDir();
        writeArm(dir, 'baseline', 10, 4);
        writeArm(dir, 'candidate', 10, 0);

        const {state, row} = verify(dir, 10);

        assert.equal(state, 'PASS');
        assert.equal(row.verdict, 'fixed');
        assert.ok(row.p < 0.05);
        assert.deepEqual([row.baseline.fail, row.baseline.n, row.candidate.fail, row.candidate.n], [4, 10, 0, 10]);
    });

    it('should call a clean target unproven when main never failed it', () => {
        const dir = makeDir();
        writeArm(dir, 'baseline', 10, 0);
        writeArm(dir, 'candidate', 10, 0);

        const {state, row} = verify(dir, 10);

        assert.equal(row.verdict, 'unproven');
        assert.equal(state, 'UNPROVEN');
        assert.equal(row.candidate.upperBound.toFixed(3), '0.259');
    });

    it('should call a fix not significant when main failed once', () => {
        const dir = makeDir();
        writeArm(dir, 'baseline', 10, 1);
        writeArm(dir, 'candidate', 10, 0);

        const {state, row} = verify(dir, 10);

        assert.equal(row.verdict, 'unproven');
        assert.equal(row.p, 0.5);
        assert.equal(state, 'UNPROVEN');
    });

    it('should fail on a single candidate failure', () => {
        const dir = makeDir();
        writeArm(dir, 'baseline', 10, 4);
        writeArm(dir, 'candidate', 10, 1);

        const {state, row} = verify(dir, 10);

        assert.equal(row.verdict, 'still-flaky');
        assert.equal(row.candidate.upperBound, null);
        assert.equal(state, 'FAIL');
    });

    it('should give a stable sibling test no say in the result', () => {
        const dir = makeDir();
        writeArm(dir, 'baseline', 10, 4, [{title: SIBLING, status: 'passed'}]);
        writeArm(dir, 'candidate', 10, 0, [{title: SIBLING, status: 'passed'}]);

        const {rows, state} = verify(dir, 10);

        assert.equal(rows.length, 2);
        assert.equal(rows.find((r) => r.title === SIBLING).verdict, 'stable');
        assert.equal(state, 'PASS');
    });

    it('should count a failing sibling that is not a target as still flaky', () => {
        const dir = makeDir();
        writeArm(dir, 'baseline', 10, 4, [{title: SIBLING, status: 'passed'}]);
        writeArm(dir, 'candidate', 10, 0);
        writeRun(dir, 'candidate', 11, [{title: TARGET, status: 'passed'}, {title: SIBLING, status: 'failed'}]);

        assert.equal(verify(dir, 10).state, 'FAIL');
    });

    it('should count iterations without results as missing, not as runs', () => {
        const dir = makeDir();
        writeArm(dir, 'baseline', 10, 4);
        writeArm(dir, 'candidate', 7, 0);
        writeRun(dir, 'candidate', 8, null);

        const {row, rows} = verify(dir, 10);

        assert.equal(row.candidate.n, 7);
        assert.equal(row.candidate.missing, 3);
        assert.equal(row.baseline.missing, 0);
        assert.match(toMarkdown(rows, overall(rows), 10), /1 test\(s\) have iterations with no result/);
    });

    it('should count a retry inside one run as a failure', () => {
        const dir = makeDir();
        writeArm(dir, 'baseline', 10, 4);
        writeArm(dir, 'candidate', 9, 0);
        writeRun(dir, 'candidate', 10, [{title: TARGET, status: 'failed'}, {title: TARGET, status: 'passed'}]);

        const {row, state} = verify(dir, 10);

        assert.equal(row.candidate.n, 10);
        assert.equal(row.candidate.fail, 1);
        assert.equal(state, 'FAIL');
    });

    it('should count a pass that carries an earlier attempt in retryReasons as a failure', () => {
        const dir = makeDir();
        writeArm(dir, 'baseline', 10, 4);
        writeArm(dir, 'candidate', 9, 0);
        writeRun(dir, 'candidate', 10, [{title: TARGET, status: 'passed', retryReasons: ['Error: first try']}]);

        assert.equal(verify(dir, 10).row.verdict, 'still-flaky');
    });

    it('should keep only the newest attempt of an iteration', () => {
        const dir = makeDir();
        writeArm(dir, 'baseline', 10, 4);
        writeArm(dir, 'candidate', 10, 0);
        writeRun(dir, 'candidate', 1, [{title: TARGET, status: 'failed'}], {attempt: 0});

        assert.equal(verify(dir, 10).row.candidate.n, 10);
        assert.equal(verify(dir, 10).state, 'PASS');
    });

    it('should report no data when no run has results', () => {
        const dir = makeDir();
        writeRun(dir, 'candidate', 1, null);

        assert.equal(verify(dir, 10, []).state, 'NO_DATA');
        assert.equal(verify(makeDir(), 10, []).state, 'NO_DATA');
    });

    it('should not let a PR pass by dropping the target it claims to fix', () => {
        const dir = makeDir();
        writeArm(dir, 'baseline', 10, 4, [{title: SIBLING, status: 'passed'}]);
        for (let i = 1; i <= 10; i++) {
            writeRun(dir, 'candidate', i, [{title: SIBLING, status: 'passed'}]);
        }

        const {row, state} = verify(dir, 10);

        assert.equal(row.verdict, 'no-data');
        assert.equal(state, 'UNPROVEN');
    });
});

describe('markdown', () => {
    it('should keep a hostile title inside one table cell', () => {
        const dir = makeDir();
        const hostile = 'MM-T1_1 x|y\n<script>alert(1)</script>` @team';
        writeArm(dir, 'baseline', 2, 1, [{title: hostile, status: 'failed'}]);
        writeArm(dir, 'candidate', 2, 0, [{title: hostile, status: 'passed'}]);
        const rows = summarize(readRuns(dir), {repeats: 2, specs: [SPEC], targets: []});

        const markdown = toMarkdown(rows, overall(rows), 2);
        const row = markdown.split('\n').find((line) => line.includes('MM-T1_1'));

        assert.ok(markdown.startsWith('<!-- e2e-flake-verify -->\n### E2E flake verify: '));
        assert.ok(!markdown.includes('<script>'));
        assert.ok(!markdown.includes('@team'));
        assert.equal(row.split('|').length, 8);
    });

    it('should print the bound, the verdict with its p-value, and the unproven note', () => {
        const fixedDir = makeDir();
        writeArm(fixedDir, 'baseline', 10, 4);
        writeArm(fixedDir, 'candidate', 10, 0);
        const fixed = verify(fixedDir, 10);
        assert.match(toMarkdown(fixed.rows, fixed.state, 10), /\| 4\/10 \| 0\/10 \| <= 25\.9% \| fixed \(p=0\.043\) \|/);

        const unprovenDir = makeDir();
        writeArm(unprovenDir, 'candidate', 10, 0);
        const unproven = verify(unprovenDir, 10);
        const markdown = toMarkdown(unproven.rows, unproven.state, 10);
        assert.match(markdown, /\| - \| 0\/10 \|/);
        assert.match(markdown, /_unproven_: main did not fail/);
    });
});

describe('cli', () => {
    const run = (dir, extra = []) => spawnSync(process.execPath, [path.join(__dirname, 'flake-verify.js'), '--dir', dir, '--repeats', '10', '--specs', SPEC, '--targets', 'MM-T4932_3', ...extra], {encoding: 'utf8', env: {GITHUB_OUTPUT: path.join(dir, 'out.txt')}});

    it('should exit 0 on UNPROVEN, or 2 with --require-reproduction, and write the state and files', () => {
        const dir = makeDir();
        writeArm(dir, 'candidate', 10, 0);

        assert.equal(run(dir).status, 0);
        assert.equal(run(dir, ['--require-reproduction']).status, 2);
        const outFile = path.join(dir, 'v.json');
        const mdFile = path.join(dir, 'v.md');
        run(dir, ['--out', outFile, '--markdown', mdFile]);
        assert.equal(JSON.parse(fs.readFileSync(outFile, 'utf8')).state, 'UNPROVEN');
        assert.ok(fs.readFileSync(mdFile, 'utf8').startsWith('<!-- e2e-flake-verify -->'));
        assert.match(fs.readFileSync(path.join(dir, 'out.txt'), 'utf8'), /state=UNPROVEN\n/);
    });

    it('should exit 1 on FAIL and 0 on PASS', () => {
        const failDir = makeDir();
        writeArm(failDir, 'baseline', 10, 4);
        writeArm(failDir, 'candidate', 10, 2);
        assert.equal(run(failDir).status, 1);

        const passDir = makeDir();
        writeArm(passDir, 'baseline', 10, 4);
        writeArm(passDir, 'candidate', 10, 0);
        assert.equal(run(passDir).status, 0);
    });
});
