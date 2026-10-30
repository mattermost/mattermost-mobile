// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env -- CI utility script */

/**
 * Re-run of a main or CMT run's failed specs on fresh devices, so the channel message can say for certain
 * whether a failure is a product bug: a test that fails again on a fresh device, on the same commit and server,
 * is real; one that passes there is not.
 *
 * Only the failures the message could not clear are re-run: those triage calls new, a product bug, or could not
 * tell. Flaky, setup and already-failing ones are cleared already. A run with more failed specs than
 * MAX_SPECS_PER_LANE is not re-run: that many failures at once is the run's setup, and a re-run would be the
 * whole suite again.
 *
 *   node rerun-failed.js --findings-dir <dir> [--cmt-matrix <json> --compare-ref <main commit>]
 * writes to $GITHUB_OUTPUT:
 *   detox-specs, maestro-flows  JSON map of lane to space-separated files ("{}" when none), for main
 *   <framework>-<platform>-matrix  {"server":[...]} for CMT (one entry per server with failed specs, with `specs`)
 *   stale                       CMT: JSON map of lane to the tests whose spec differs from main (not re-run)
 *   any                         "true" when anything is re-run
 */

const fs = require('fs');
const path = require('path');

const {judgeFinding} = require('./cmt-channel-notify');

const MAX_SPECS_PER_LANE = 10;

// What mobile's judge left uncleared (judgeFinding): new on main, a product bug, or not enough history.
const RERUN_KEYS = new Set(['product', 'new', 'look']);
const ARTIFACT_PREFIX = 'e2e-rerun-results-';

// Every spec and flow lives under detox/; a finding's file may carry the test root in front of it.
function repoPath(file) {
    const at = file.startsWith('detox/') ? 0 : file.indexOf('/detox/') + 1;
    return at > 0 || file.startsWith('detox/') ? file.slice(at) : null;
}

/**
 * A CMT build's spec that differs from main's is out of date on that release branch: re-running it on the old build
 * would fail again whether or not the app is broken.
 *
 * @param {string} ref - main's commit, fetched
 * @returns {(file: string) => boolean}
 */
function differsFrom(ref) {
    const {execFileSync} = require('child_process');
    return (file) => {
        try {
            execFileSync('git', ['diff', '--quiet', ref, 'HEAD', '--', file], {stdio: 'ignore'});
            return false;
        } catch (err) {
            return err.status === 1;
        }
    };
}

/**
 * @param {Array<{lane: string, findings?: Array}>} triage - findings files (schema 2)
 * @param {{isStale?: (file: string) => boolean}} [options]
 * @returns {{lanes: Record<string, {files: string[], titles: string[]}>, tooMany: Record<string, number>, stale: Record<string, string[]>}}
 *   tooMany: failed tests per lane not re-run; stale: tests per lane whose spec differs from main, not re-run
 */
function planRerun(triage, {isStale = () => false} = {}) {
    const lanes = {};
    const tooMany = {};
    const stale = {};
    for (const lane of triage || []) {
        const uncleared = (lane.findings || []).filter((row) => RERUN_KEYS.has(judgeFinding(row, lane)));
        const outdated = uncleared.filter((row) => row.file && repoPath(row.file) && isStale(repoPath(row.file)));
        if (outdated.length) {
            stale[lane.lane] = outdated.map((row) => row.title);
        }
        const rows = uncleared.filter((row) => !outdated.includes(row));
        const files = [...new Set(rows.map((row) => row.file && repoPath(row.file)).filter(Boolean))];
        if (!files.length) {
            continue;
        }
        if (files.length > MAX_SPECS_PER_LANE || rows.length > MAX_SPECS_PER_LANE) {
            tooMany[lane.lane] = rows.length;
            continue;
        }
        lanes[lane.lane] = {files, titles: rows.map((row) => row.title)};
    }
    return {lanes, tooMany, stale};
}

const isMaestro = (lane) => lane.startsWith('maestro-');

/**
 * Main run: the spec files per lane, for e2e-detox.yml (rerun-specs) and e2e-maestro-pr.yml (rerun-flows).
 *
 * @param {ReturnType<typeof planRerun>} plan
 * @returns {{detox: Record<string, string>, maestro: Record<string, string>}}
 */
function mainInputs(plan) {
    const detox = {};
    const maestro = {};
    for (const [lane, {files}] of Object.entries(plan.lanes)) {
        (isMaestro(lane) ? maestro : detox)[lane] = files.join(' ');
    }
    return {detox, maestro};
}

/**
 * CMT run: per framework and platform, the CMT matrix servers that had failed specs, each with its spec files.
 * A CMT lane is <framework>-<platform>-Server_<version>.
 *
 * @param {ReturnType<typeof planRerun>} plan
 * @param {{server?: Array<{version: string}>}} cmtMatrix
 * @returns {Record<string, {server: Array<Object>}>} keyed by detox-ios, detox-android, detox-ipad, maestro-ios, maestro-android
 */
function cmtMatrices(plan, cmtMatrix) {
    const out = {};
    for (const [lane, {files}] of Object.entries(plan.lanes)) {
        const match = (/^((?:detox|maestro)-(?:ios|android|ipad))-Server_(.+)$/).exec(lane);
        const server = match && (cmtMatrix?.server || []).find((s) => String(s.version) === match[2]);
        if (!server) {
            continue;
        }
        out[match[1]] = out[match[1]] || {server: []};
        out[match[1]].server.push({...server, specs: files.join(' ')});
    }
    return out;
}

/**
 * The re-run's result per test, from the artifacts e2e-rerun-results-<lane>-a<attempt>: Detox's merged Jest JSON
 * or Maestro's JUnit report. A test that passed on any try of the re-run passed.
 *
 * @param {string} dir - where the artifacts were downloaded, one folder each
 * @returns {Record<string, Map<string, 'passed'|'failed'>>} lane → test title → result
 */
function loadRerunResults(dir) {
    const out = {};
    if (!dir || !fs.existsSync(dir)) {
        return out;
    }
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        if (!entry.isDirectory() || !entry.name.startsWith(ARTIFACT_PREFIX)) {
            continue;
        }
        const lane = entry.name.slice(ARTIFACT_PREFIX.length).replace(/-a\d+$/, '');
        const results = new Map();
        const record = (title, passed) => {
            if (title && results.get(title) !== 'passed') {
                results.set(title, passed ? 'passed' : 'failed');
            }
        };
        const folder = path.join(dir, entry.name);
        try {
            const jest = path.join(folder, 'jest-results-merged.json');
            if (fs.existsSync(jest)) {
                for (const suite of JSON.parse(fs.readFileSync(jest, 'utf8')).testResults || []) {
                    for (const test of suite.testResults || []) {
                        if (test.status === 'passed' || test.status === 'failed') {
                            record(test.title, test.status === 'passed');
                        }
                    }
                }
            }
            const junit = path.join(folder, 'maestro-report.xml');
            if (fs.existsSync(junit)) {
                const xml = fs.readFileSync(junit, 'utf8');
                for (const match of xml.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)) {
                    const name = (/\bname="([^"]*)"/).exec(match[1])?.[1];
                    const body = match[3] || '';
                    if (!(/<skipped\b/).test(body)) {
                        record(name, !(/<(failure|error)\b/).test(body));
                    }
                }
            }
        } catch (err) {
            console.warn(`rerun-failed: could not read ${folder}: ${err.message}`);
        }
        if (results.size) {
            out[lane] = results;
        }
    }
    return out;
}

function main() {
    const {parseArgs} = require('./cli-args');
    const {loadTriageFindings} = require('./tsio-channel-notify-rollup');
    const args = parseArgs(process.argv);
    const ref = args['compare-ref'];
    const plan = planRerun(loadTriageFindings(args['findings-dir'] || ''), ref ? {isStale: differsFrom(ref)} : {});
    const lines = [];
    if (args['cmt-matrix']) {
        const matrices = cmtMatrices(plan, JSON.parse(args['cmt-matrix']));
        for (const key of ['detox-ios', 'detox-android', 'detox-ipad', 'maestro-ios', 'maestro-android']) {
            lines.push(`${key}-matrix=${JSON.stringify(matrices[key] || {server: []})}`);
        }
        lines.push(`stale=${JSON.stringify(plan.stale)}`, `any=${Object.keys(matrices).length > 0}`);
    } else {
        const {detox, maestro} = mainInputs(plan);
        lines.push(`detox-specs=${JSON.stringify(detox)}`, `maestro-flows=${JSON.stringify(maestro)}`);
        lines.push(`any=${Object.keys(detox).length + Object.keys(maestro).length > 0}`);
    }
    for (const [lane, count] of Object.entries(plan.tooMany)) {
        console.log(`rerun-failed: ${lane} not re-run — ${count} failed tests (more than ${MAX_SPECS_PER_LANE})`);
    }
    console.log(lines.join('\n'));
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n');
    }
}

if (require.main === module) {
    main();
}

module.exports = {MAX_SPECS_PER_LANE, planRerun, mainInputs, cmtMatrices, loadRerunResults};
