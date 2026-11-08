// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env -- CI utility script */

/**
 * Verdict for e2e-flake-verify.yml: the same specs run N times on a main commit (baseline) and on a PR commit
 * (candidate), each run on a fresh device with no retry. Says whether the PR fixed the tests it claims to fix.
 *
 * N clean runs only bound a failure rate: 10 clean runs rule out a rate above 26%, and a 1-in-17 flake needs
 * about 49. So a clean candidate counts as fixed only when the baseline reproduced the failure and the candidate
 * fails significantly less (one-sided Fisher exact test, p < 0.05). Anything else is UNPROVEN, never PASS.
 *
 *   node flake-verify.js --dir <results dir> --repeats <N> [--specs "<files>"] [--targets "<titles>"]
 *                        [--out verdict.json] [--markdown verdict.md] [--require-reproduction]
 *
 * <dir> holds one folder per run, named as its artifact: e2e-rerun-results-<lane>-fv-<arm>-i<i>-a<attempt>,
 * each with the jest-results-merged.json of that run. Appends state=<STATE> to $GITHUB_OUTPUT.
 * Exit codes: 0 PASS or UNPROVEN, 1 FAIL, 2 NO_DATA (and UNPROVEN with --require-reproduction).
 */

const fs = require('fs');
const path = require('path');

const {parseArgs} = require('./cli-args');

const FOLDER_PATTERN = /^e2e-rerun-results-(.+?)-fv-(baseline|candidate)-i(\d+)-a(\d+)$/;
const RESULTS_FILE = 'jest-results-merged.json';
const CONFIDENCE = 0.05;
const MARKER = '<!-- e2e-flake-verify -->';
const MAX_CELL = 120;

/**
 * One result per test title per run: a title seen twice (a retry inside the run) failed if any try failed, and
 * Jest's retryReasons (a first attempt merged into a later pass) is a failure too.
 * @param {string} file - jest-results-merged.json
 * @returns {Map<string, {file: string, failed: boolean}>}
 */
function readResults(file) {
    const tests = new Map();
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const suite of data.testResults || []) {
        for (const test of suite.testResults || []) {
            if (!test.title || (test.status !== 'passed' && test.status !== 'failed')) {
                continue;
            }
            const failed = test.status === 'failed' || (Array.isArray(test.retryReasons) && test.retryReasons.length > 0);
            const seen = tests.get(test.title);
            tests.set(test.title, {file: seen?.file || suite.testFilePath || '', failed: Boolean(seen?.failed) || failed});
        }
    }
    return tests;
}

/**
 * One run per (lane, arm, iteration); a re-run of the workflow adds a newer attempt, which replaces the older.
 * A folder whose results cannot be read is a run with no results.
 * @param {string} dir
 * @returns {Array<{lane: string, arm: 'baseline'|'candidate', iteration: number, attempt: number, tests: Map<string, {file: string, failed: boolean}>}>}
 */
function readRuns(dir) {
    const byKey = new Map();
    if (!dir || !fs.existsSync(dir)) {
        return [];
    }
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const match = entry.isDirectory() && FOLDER_PATTERN.exec(entry.name);
        if (!match) {
            continue;
        }
        const [, lane, arm, iteration, attempt] = match;
        let tests = new Map();
        try {
            tests = readResults(path.join(dir, entry.name, RESULTS_FILE));
        } catch (error) {
            console.warn(`[flake-verify] ${entry.name}: no readable ${RESULTS_FILE} (${error.message}); counted as a run with no results`);
        }
        const run = {lane, arm, iteration: Number(iteration), attempt: Number(attempt), tests};
        const key = `${lane}|${arm}|${run.iteration}`;
        if (!byKey.has(key) || byKey.get(key).attempt < run.attempt) {
            byKey.set(key, run);
        }
    }
    return [...byKey.values()];
}

/**
 * Largest failure rate still consistent (95%) with n runs that all passed.
 * @param {number} n
 * @returns {number|null}
 */
function upperBound(n) {
    return n > 0 ? 1 - Math.pow(CONFIDENCE, 1 / n) : null;
}

/**
 * Clean runs needed to rule out (95%) a failure rate of `rate`.
 * @param {number} rate - between 0 and 1, exclusive
 * @returns {number}
 */
function runsNeeded(rate) {
    return Math.ceil(Math.log(CONFIDENCE) / Math.log(1 - rate));
}

function choose(n, k) {
    if (k < 0 || k > n) {
        return 0n;
    }
    let result = 1n;
    for (let i = 1n; i <= BigInt(k); i++) {
        result = (result * (BigInt(n - k) + i)) / i;
    }
    return result;
}

/**
 * One-sided Fisher exact p-value that the candidate fails less often than the baseline.
 * @param {number} candFail
 * @param {number} nC - candidate runs
 * @param {number} baseFail
 * @param {number} nB - baseline runs
 * @returns {number}
 */
function fisherLess(candFail, nC, baseFail, nB) {
    const total = candFail + baseFail;
    let favourable = 0n;
    for (let k = 0; k <= candFail; k++) {
        favourable += choose(nC, k) * choose(nB, total - k);
    }
    return Number(favourable) / Number(choose(nC + nB, total));
}

const matchesSpec = (file, specs) => !specs.length || specs.some((spec) => file.endsWith(spec) || (file && spec.endsWith(file)));
const isTarget = (title, targets) => targets.some((target) => title === target || title.startsWith(`${target} `));

function verdictFor(row, targets) {
    const {baseline, candidate} = row;
    if (!isTarget(row.title, targets) && baseline.fail === 0 && candidate.fail === 0) {
        return 'stable';
    }
    if (candidate.n === 0) {
        return 'no-data';
    }
    if (candidate.fail > 0) {
        return 'still-flaky';
    }
    if (baseline.n > 0 && baseline.fail > 0) {
        row.p = fisherLess(candidate.fail, candidate.n, baseline.fail, baseline.n);

        // A candidate run with no result may be the flake itself (a crashed shard), so it cannot count as fixed.
        if (row.p < CONFIDENCE && candidate.missing === 0) {
            return 'fixed';
        }
    }
    return 'unproven';
}

/**
 * One row per (lane, test title): how often each arm ran it and failed it, and its verdict. A target that no run
 * reported gets a no-data row, so a PR cannot pass by renaming or skipping the test it claims to fix.
 * @param {ReturnType<typeof readRuns>} runs
 * @param {{repeats: number, specs?: string[], targets?: string[]}} options
 */
function summarize(runs, {repeats, specs = [], targets = []}) {
    const rows = new Map();
    for (const run of runs) {
        for (const [title, result] of run.tests) {
            const key = `${run.lane}|${title}`;
            if (!rows.has(key)) {
                rows.set(key, {lane: run.lane, title, file: result.file, baseline: {n: 0, fail: 0}, candidate: {n: 0, fail: 0}});
            }
            const arm = rows.get(key)[run.arm];
            arm.n += 1;
            arm.fail += result.failed ? 1 : 0;
        }
    }
    const out = [...rows.values()].filter((row) => matchesSpec(row.file, specs));
    for (const target of targets) {
        if (!out.some((row) => isTarget(row.title, [target]))) {
            out.push({lane: '-', title: target, file: '', baseline: {n: 0, fail: 0}, candidate: {n: 0, fail: 0}});
        }
    }
    for (const row of out) {
        row.baseline.missing = Math.max(0, repeats - row.baseline.n);
        row.candidate.missing = Math.max(0, repeats - row.candidate.n);
        row.candidate.upperBound = row.candidate.fail === 0 ? upperBound(row.candidate.n) : null;
        row.verdict = verdictFor(row, targets);
    }
    return out.sort((a, b) => a.lane.localeCompare(b.lane) || a.title.localeCompare(b.title));
}

/**
 * @param {ReturnType<typeof summarize>} rows
 * @returns {'PASS'|'FAIL'|'UNPROVEN'|'NO_DATA'}
 */
function overall(rows) {
    if (!rows.length || rows.every((row) => row.candidate.n === 0)) {
        return 'NO_DATA';
    }
    const counted = rows.filter((row) => row.verdict !== 'stable');
    if (!counted.length) {
        return 'UNPROVEN';
    }
    if (counted.some((row) => row.verdict === 'still-flaky')) {
        return 'FAIL';
    }
    if (counted.some((row) => row.verdict === 'no-data' || row.verdict === 'unproven')) {
        return 'UNPROVEN';
    }
    return 'PASS';
}

// Titles come from the PR's own tests: nothing in them may end the cell, start markup or mention anyone.
const cell = (value) => String(value ?? '').replace(/[|\r\n`<>@]/g, ' ').slice(0, MAX_CELL);

function rateCell(arm) {
    if (arm.fail > 0) {
        return 'failed';
    }
    return arm.upperBound === null ? 'no data' : `<= ${(arm.upperBound * 100).toFixed(1)}%`;
}

function verdictCell(row) {
    return row.verdict === 'fixed' ? `fixed (p=${row.p.toFixed(3)})` : row.verdict;
}

/**
 * @param {ReturnType<typeof summarize>} rows
 * @param {string} state
 * @param {number} repeats
 * @returns {string}
 */
function toMarkdown(rows, state, repeats) {
    const hasBaseline = rows.some((row) => row.baseline.n > 0);
    const lines = [
        MARKER,
        `### E2E flake verify: ${state}`,
        '',
        `${repeats} runs per arm, fresh device each, no retry.`,
        '',
        '| Test | Lane | Main (fail/runs) | PR (fail/runs) | PR failure rate, 95% upper bound | Verdict |',
        '|---|---|---|---|---|---|',
    ];
    for (const row of rows) {
        const mainCell = hasBaseline ? `${row.baseline.fail}/${row.baseline.n}` : '-';
        lines.push(`| ${cell(row.title)} | ${cell(row.lane)} | ${mainCell} | ${row.candidate.fail}/${row.candidate.n} | ${rateCell(row.candidate)} | ${verdictCell(row)} |`);
    }
    lines.push('');
    if (rows.some((row) => row.verdict === 'unproven')) {
        lines.push('_unproven_: main did not fail significantly more in these runs, or some PR runs gave no result, so the clean PR runs only bound the failure rate shown; they do not show that the change fixed anything.');
    }
    const incomplete = rows.filter((row) => row.candidate.missing > 0 || (hasBaseline && row.baseline.missing > 0)).length;
    if (incomplete) {
        lines.push(`${incomplete} test(s) have iterations with no result (not counted in the runs above).`);
    }
    return lines.join('\n') + '\n';
}

const splitList = (value) => (value && value !== 'true' ? value.split(/\s+/).filter(Boolean) : []);

function main() {
    const args = parseArgs(process.argv);
    const repeats = Number(args.repeats);
    if (!args.dir || !Number.isInteger(repeats) || repeats < 1) {
        console.error('usage: flake-verify.js --dir <results dir> --repeats <N> [--specs "..."] [--targets "..."] [--out f] [--markdown f] [--require-reproduction]');
        process.exit(2);
    }
    const rows = summarize(readRuns(args.dir), {repeats, specs: splitList(args.specs), targets: splitList(args.targets)});
    const state = overall(rows);
    const markdown = toMarkdown(rows, state, repeats);
    console.log(markdown);
    if (args.out) {
        fs.writeFileSync(args.out, JSON.stringify({state, repeats, rows}, null, 2));
    }
    if (args.markdown) {
        fs.writeFileSync(args.markdown, markdown);
    }
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `state=${state}\n`);
    }
    const requireReproduction = args['require-reproduction'] === 'true';
    const codes = {PASS: 0, FAIL: 1, NO_DATA: 2, UNPROVEN: requireReproduction ? 2 : 0};
    process.exit(codes[state]);
}

if (require.main === module) {
    main();
}

module.exports = {readRuns, summarize, overall, toMarkdown, upperBound, runsNeeded, fisherLess};
