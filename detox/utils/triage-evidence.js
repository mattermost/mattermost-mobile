// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console -- CI utility script */

/**
 * Evidence for the E2E triage judge on tests that hit the Jest timeout. Their
 * error text is only "Exceeded timeout", so this collects what the run saw at
 * the time: the simulator screenshot e2e/timeout_evidence.js took, the tasks
 * Detox reported the app was still busy with, and the test's own calls to
 * the test server that failed. Output follows the e2e-triage action's
 * evidence-dir format.
 *
 * Usage: node utils/triage-evidence.js --results artifacts/jest-results.json \
 *   --log <detox run output> --dir artifacts/triage-evidence --out <file.json>
 */

const fs = require('fs');
const path = require('path');

const {sanitize} = require('../e2e/path_builder');

const {parseArgs} = require('./cli-args');
const {specKey} = require('./failed-jest-specs');

const TIMEOUT_RE = /Exceeded timeout of \d+ ms for a test/;
const ANSI_RE = /\x1b\[[0-9;]*m/g; // eslint-disable-line no-control-regex
const BUSY_RE = /The app is busy with the following tasks:/;
const TIME_RE = /^(\d{2}:\d{2}:\d{2})\.\d{3}\s/;

// The test's own server calls failing: a timeout spent here is the server's, not the app's.
const SERVER_ERROR_RE = /No response from server|Network error|is not healthy|_cf_chl_opt|ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up|status(?: code)? 5\d\d/;
const DETOX_PREFIX_RE = /^\d{2}:\d{2}:\d{2}\.\d{3}\s+detox\[\d+\]\s+\S+\s+/;
const ERROR_MAX = 200;

// Always present while the app works at all, so they say nothing about where it is stuck.
const ROUTINE_TASK_RE = /work items pending on the dispatch queue|Run loop "Main Run Loop" is awake/;
const NOTES_MAX = 1500;
const TASK_MAX = 240;

/**
 * Failed tests whose failure is the Jest timeout.
 *
 * @param {object} results Jest --json output
 * @returns {{file: string, title: string, fullName: string}[]}
 */
function timedOutTests(results) {
    const out = [];
    for (const suite of results?.testResults || []) {
        const file = specKey(suite.testFilePath || suite.name);
        for (const t of suite.assertionResults || []) {
            if (t.status === 'failed' && (t.failureMessages || []).some((m) => TIMEOUT_RE.test(m))) {
                out.push({file, title: t.title, fullName: t.fullName || [...(t.ancestorTitles || []), t.title].join(' ')});
            }
        }
    }
    return out;
}

/**
 * The Detox output printed while the test ran: between the spec reporter's
 * start line ("<describe>: <title>") and its "[FAIL]" line.
 *
 * @param {string} logText
 * @param {string} title
 * @returns {string[]}
 */
function testLines(logText, title) {
    const lines = String(logText || '').replace(ANSI_RE, '').split(/\r?\n/);
    const end = lines.findLastIndex((l) => l.includes(`: ${title} [FAIL]`));
    if (end < 0) {
        return [];
    }
    let start = end - 1;
    while (start >= 0 && !(lines[start].includes(`: ${title}`) && !lines[start].includes(`: ${title} [`))) {
        start--;
    }
    return lines.slice(start + 1, end);
}

/**
 * Detox's "app is busy" reports printed while the test ran.
 *
 * @param {string} logText
 * @param {string} title
 * @returns {{time: string, tasks: string[]}[]}
 */
function busyReports(logText, title) {
    const lines = testLines(logText, title);
    const reports = [];
    for (let i = 0; i < lines.length; i++) {
        if (!BUSY_RE.test(lines[i])) {
            continue;
        }
        const tasks = [];
        for (let j = i + 1; j < lines.length && lines[j].trim().startsWith('•'); j++) {
            tasks.push(lines[j].trim().replace(/^•\s*/, ''));
        }
        reports.push({time: TIME_RE.exec(lines[i])?.[1] ?? '', tasks});
    }
    return reports;
}

/**
 * The test's own calls to the test server that failed while it ran, grouped by
 * message with URLs and numbers (retry counters, delays) left out, most
 * frequent first.
 *
 * @param {string} logText
 * @param {string} title
 * @returns {{message: string, count: number}[]}
 */
function serverErrors(logText, title) {
    const counts = new Map();
    for (const line of testLines(logText, title)) {
        if (!DETOX_PREFIX_RE.test(line) || !SERVER_ERROR_RE.test(line)) {
            continue;
        }
        const message = line.replace(DETOX_PREFIX_RE, '').replace(/https?:\/\/\S+/g, '<url>').replace(/\d+/g, 'N').trim().slice(0, ERROR_MAX);
        counts.set(message, (counts.get(message) || 0) + 1);
    }
    return [...counts].map(([message, count]) => ({message, count})).sort((a, b) => b.count - a.count);
}

/**
 * One paragraph for the judge: how long the app stayed busy and on what, and
 * how often the test's own server calls failed.
 *
 * @param {{time: string, tasks: string[]}[]} reports
 * @param {{message: string, count: number}[]} errors
 * @returns {string}
 */
function summarize(reports, errors = []) {
    const parts = [];
    if (reports.length) {
        const last = reports[reports.length - 1];
        const waiting = last.tasks.filter((t) => !ROUTINE_TASK_RE.test(t)).map((t) => t.slice(0, TASK_MAX));
        const span = reports[0].time && last.time ? ` between ${reports[0].time} and ${last.time}` : '';
        const tail = waiting.length ? ` When the test timed out it was still waiting on: ${waiting.join(' | ')}` : '';
        parts.push(`Detox reported the app busy ${reports.length} time(s)${span} while this test ran.${tail}`);
    }
    if (errors.length) {
        const total = errors.reduce((n, e) => n + e.count, 0);
        const top = errors.slice(0, 2).map((e) => `${e.message} (x${e.count})`).join(' | ');
        parts.push(`The test's own calls to the test server failed ${total} time(s) while it ran: ${top}`);
    }
    return parts.join(' ').slice(0, NOTES_MAX);
}

/**
 * @param {{results: object, logText: string, evidenceDir: string}} input
 * @returns {object[]} entries in the e2e-triage evidence-dir format
 */
function buildEvidence({results, logText, evidenceDir}) {
    const entries = [];
    for (const t of timedOutTests(results)) {
        const shot = path.join(sanitize(t.fullName), 'timeout.png');
        const images = fs.existsSync(path.join(evidenceDir, shot)) ? [shot] : [];
        const notes = summarize(busyReports(logText, t.title), serverErrors(logText, t.title));
        if (images.length || notes) {
            entries.push({file: t.file, title: t.title, full_title: t.fullName, notes, images});
        }
    }
    return entries;
}

function main() {
    const args = parseArgs(process.argv);
    if (!args.results || !args.dir || !args.out) {
        console.error('usage: triage-evidence.js --results <jest.json> --log <detox output> --dir <evidence dir> --out <file.json>');
        process.exit(2);
    }
    if (!fs.existsSync(args.results)) {
        console.log(`No Jest results at ${args.results}; no triage evidence.`);
        return;
    }
    const results = JSON.parse(fs.readFileSync(args.results, 'utf8'));
    const logText = args.log && fs.existsSync(args.log) ? fs.readFileSync(args.log, 'utf8') : '';
    const entries = buildEvidence({results, logText, evidenceDir: args.dir});
    if (!entries.length) {
        console.log('No timed-out tests with evidence.');
        return;
    }
    fs.mkdirSync(path.dirname(args.out), {recursive: true});
    fs.writeFileSync(args.out, JSON.stringify(entries, null, 2));
    console.log(`Wrote triage evidence for ${entries.length} timed-out test(s) to ${args.out}`);
}

if (require.main === module) {
    main();
}

module.exports = {timedOutTests, busyReports, serverErrors, summarize, buildEvidence};
