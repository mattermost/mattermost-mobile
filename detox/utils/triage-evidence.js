// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console -- CI utility script */

/**
 * Evidence for the E2E triage judge on tests that hit the Jest timeout. Their
 * error text is only "Exceeded timeout", so this collects what the run saw at
 * the time: the simulator screenshot e2e/timeout_evidence.js took, and the
 * tasks Detox reported the app was still busy with. Output follows the
 * e2e-triage action's evidence-dir format.
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
 * Detox's "app is busy" reports printed while the test ran, between the spec
 * reporter's start line ("<describe>: <title>") and its "[FAIL]" line.
 *
 * @param {string} logText
 * @param {string} title
 * @returns {{time: string, tasks: string[]}[]}
 */
function busyReports(logText, title) {
    const lines = String(logText || '').replace(ANSI_RE, '').split(/\r?\n/);
    const end = lines.findLastIndex((l) => l.includes(`: ${title} [FAIL]`));
    if (end < 0) {
        return [];
    }
    let start = end - 1;
    while (start >= 0 && !(lines[start].includes(`: ${title}`) && !lines[start].includes(`: ${title} [`))) {
        start--;
    }
    const reports = [];
    for (let i = start + 1; i < end; i++) {
        if (!BUSY_RE.test(lines[i])) {
            continue;
        }
        const tasks = [];
        for (let j = i + 1; j < end && lines[j].trim().startsWith('•'); j++) {
            tasks.push(lines[j].trim().replace(/^•\s*/, ''));
        }
        reports.push({time: TIME_RE.exec(lines[i])?.[1] ?? '', tasks});
    }
    return reports;
}

/**
 * One paragraph for the judge: how long the app stayed busy and on what.
 *
 * @param {{time: string, tasks: string[]}[]} reports
 * @returns {string}
 */
function summarize(reports) {
    if (!reports.length) {
        return '';
    }
    const last = reports[reports.length - 1];
    const waiting = last.tasks.filter((t) => !ROUTINE_TASK_RE.test(t)).map((t) => t.slice(0, TASK_MAX));
    const span = reports[0].time && last.time ? ` between ${reports[0].time} and ${last.time}` : '';
    const tail = waiting.length ? ` When the test timed out it was still waiting on: ${waiting.join(' | ')}` : '';
    return `Detox reported the app busy ${reports.length} time(s)${span} while this test ran.${tail}`.slice(0, NOTES_MAX);
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
        const notes = summarize(busyReports(logText, t.title));
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

module.exports = {timedOutTests, busyReports, summarize, buildEvidence};
