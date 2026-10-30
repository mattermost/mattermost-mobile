// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console -- CI utility script */

/**
 * Evidence for the E2E triage judge on every failed Maestro flow: what the run
 * saw at the failure. The screenshot Maestro took when the flow failed, the step
 * it stopped at and the steps just before, and the errors the app itself logged
 * while the flow ran (the device log). Output follows the e2e-triage action's
 * evidence-dir format, the same as utils/triage-evidence.js writes for Detox;
 * screenshots are copied into the evidence directory, the only place the action
 * reads images from.
 *
 * Usage: node utils/maestro-triage-evidence.js --report build/maestro-report.xml \
 *   --build build --device-log build/sim-device.log --dir build/triage-evidence --out <file.json>
 *
 * The device log is the iOS simulator's `log stream` or Android's
 * `adb logcat -v threadtime -v year -v UTC`; lines without a full date are skipped.
 */

const fs = require('fs');
const path = require('path');

const {parseArgs} = require('./cli-args');

// A run with more failures than this is a broken environment, which triage
// reports as such without asking the judge; evidence for it would go unread.
const MAX_TESTS = 20;
const NOTES_MAX = 1500;
const MESSAGE_MAX = 200;
const STEPS_BEFORE = 4;
const LOG_ERRORS_MAX = 3;

// Late app logs for the failing step still belong to it.
const LOG_GRACE_MS = 2000;

// Maestro's own output folders and earlier evidence are not Maestro debug output.
const SKIP_DIRS = new Set(['node_modules', 'maestro-artifacts-tsio', 'triage-evidence']);

// Wrappers around other commands; the step a flow stopped at is the command inside them.
const CONTAINER_COMMANDS = new Set(['runFlowCommand', 'retryCommand', 'repeatCommand', 'applyConfigurationCommand', 'defineVariablesCommand']);

// iOS `log stream`: "2026-10-03 00:19:03.239031-0400 0x43fda  Error  0x0  11167  0  Mattermost: [com.mattermost.rnbeta:TurboLogger] msg"
const IOS_LINE_RE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}\.\d{3})\d*([+-]\d{2})(\d{2})\s+\S+\s+(?:Error|Fault)\s.*?\b(?:Mattermost|MattermostRN):\s*\[[^\]]*(?:TurboLogger|ReactNativeJS)\]\s*(.*)$/;

// logcat -v threadtime -v year -v UTC: "2026-10-03 04:05:28.004  6137  6181 E TurboLogger: msg"
const ANDROID_LINE_RE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}\.\d{3})\s+\d+\s+\d+\s+[EF]\s+(?:TurboLogger|ReactNativeJS)\s*:\s*(.*)$/;

const unescapeXml = (s) => String(s).
    replace(/&lt;/g, '<').
    replace(/&gt;/g, '>').
    replace(/&quot;/g, '"').
    replace(/&apos;/g, "'").
    replace(/&amp;/g, '&');

const attr = (tag, name) => {
    const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
    return m ? unescapeXml(m[1]) : '';
};

/**
 * Flows whose final result in the JUnit report Test System IO received is a
 * failure. Maestro's report is flat: one testcase per flow, with `file` set to
 * the flow path TSIO records.
 *
 * @param {string} xml
 * @returns {{file: string, title: string, error: string}[]}
 */
function failedFlows(xml) {
    const out = [];
    const re = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
    for (let m = re.exec(xml); m; m = re.exec(xml)) {
        const tag = m[1];
        const body = m[3] || '';
        const status = attr(tag, 'status');
        const failure = /<(failure|error)\b[^>]*>([\s\S]*?)<\/\1>|<(failure|error)\b[^>]*\/>/.exec(body);
        if (!failure && !/^(FAILED|ERROR)$/i.test(status)) {
            continue;
        }
        const title = attr(tag, 'name');
        const file = attr(tag, 'file') || attr(tag, 'classname');
        if (title && file) {
            out.push({file, title, error: unescapeXml(failure?.[2] ?? '').trim()});
        }
    }
    return out;
}

/**
 * Every file under `dir` (a few levels deep), so a flow's debug output can be
 * found whichever batch or single-flow run wrote it.
 *
 * @param {string} dir
 * @param {number} depth
 * @returns {string[]}
 */
function listFiles(dir, depth = 5) {
    if (!dir || !fs.existsSync(dir)) {
        return [];
    }
    const out = [];
    for (const d of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, d.name);
        if (d.isDirectory() && depth > 0 && !SKIP_DIRS.has(d.name)) {
            out.push(...listFiles(full, depth - 1));
        } else if (d.isFile()) {
            out.push(full);
        }
    }
    return out;
}

/**
 * The screenshot Maestro took when the flow failed ("screenshot-❌-<ms>-(<flow>).png")
 * and the command log next to it. A flow retried in a later batch leaves one of
 * each per attempt; the newest failure is the one the report holds.
 *
 * @param {string[]} files
 * @param {string} title
 * @returns {{screenshot: string|null, commands: string|null}}
 */
function debugOutput(files, title) {
    const shots = files.
        map((f) => ({f, m: /^screenshot-❌-(\d+)-\((.+)\)\.png$/u.exec(path.basename(f))})).
        filter(({m}) => m && m[2] === title).
        sort((a, b) => Number(b.m[1]) - Number(a.m[1]));
    const screenshot = shots[0]?.f ?? null;
    const name = `commands-(${title}).json`;
    const logs = files.filter((f) => path.basename(f) === name);
    const besideShot = screenshot && logs.find((f) => path.dirname(f) === path.dirname(screenshot));
    const newest = logs.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    return {screenshot, commands: besideShot || newest || null};
}

/**
 * A command in a few words. Typed text is left out: flows type passwords.
 *
 * @param {object} command one entry's `command`
 * @returns {string}
 */
function describeCommand(command) {
    const type = Object.keys(command || {})[0] || 'unknown';
    const v = command?.[type] || {};
    if (typeof v.label === 'string' && v.label) {
        return v.label.slice(0, MESSAGE_MAX);
    }
    const cond = v.condition || {};
    const sel = v.selector || cond.visible || cond.notVisible || null;
    let target = '';
    if (sel?.idRegex) {
        target = ` id ${sel.idRegex}`;
    } else if (sel?.textRegex) {
        target = ` text "${sel.textRegex}"`;
    }
    let verb = type.replace(/Command$/, '').replace(/OnElement$/, '');
    if (type === 'assertConditionCommand') {
        verb = cond.notVisible ? 'assert not visible' : 'assert visible';
    } else if (type === 'inputTextCommand') {
        verb = 'input text';
    }
    return `${verb}${target}`.slice(0, MESSAGE_MAX);
}

/**
 * Where the flow stopped: the innermost failed command, the steps that
 * completed just before it, and the time span the flow ran.
 *
 * @param {object[]} entries Maestro's commands-(<flow>).json
 * @returns {{failed: {step: string, error: string, ms: number}|null, before: string[], start: number|null, end: number|null}}
 */
function flowSteps(entries) {
    const list = (Array.isArray(entries) ? entries : []).
        filter((e) => e?.command && Number.isFinite(e?.metadata?.timestamp)).
        sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);
    if (!list.length) {
        return {failed: null, before: [], start: null, end: null};
    }
    const inner = (e) => !CONTAINER_COMMANDS.has(Object.keys(e.command)[0]);
    const failures = list.filter((e) => e.metadata.status === 'FAILED');
    const fail = failures.find(inner) || failures[failures.length - 1] || null;
    const start = list[0].metadata.timestamp;
    const lastEnd = Math.max(...list.map((e) => e.metadata.timestamp + (Number(e.metadata.duration) || 0)));
    if (!fail) {
        return {failed: null, before: [], start, end: lastEnd};
    }
    const before = list.
        filter((e) => inner(e) && e.metadata.status === 'COMPLETED' && e.metadata.timestamp < fail.metadata.timestamp).
        slice(-STEPS_BEFORE).
        map((e) => describeCommand(e.command));
    const ms = Number(fail.metadata.duration) || 0;
    return {
        failed: {step: describeCommand(fail.command), error: String(fail.metadata.error?.message || '').slice(0, MESSAGE_MAX), ms},
        before,
        start,
        end: fail.metadata.timestamp + ms,
    };
}

/**
 * The errors the app itself logged (TurboLogger / ReactNativeJS at error level),
 * with their time. Framework and system noise in the same process is left out.
 *
 * @param {string} text iOS `log stream` or logcat output
 * @returns {{time: number, message: string}[]}
 */
function appErrors(text) {
    const out = [];
    const lines = String(text || '').match(/^.*(?:TurboLogger|ReactNativeJS).*$/gm) || [];
    for (const line of lines) {
        const ios = IOS_LINE_RE.exec(line);
        if (ios) {
            const time = Date.parse(`${ios[1]}T${ios[2]}${ios[3]}:${ios[4]}`);
            if (Number.isFinite(time)) {
                out.push({time, message: ios[5].trim()});
            }
            continue;
        }
        const android = ANDROID_LINE_RE.exec(line);
        if (android) {
            const time = Date.parse(`${android[1]}T${android[2]}Z`);
            if (Number.isFinite(time)) {
                out.push({time, message: android[3].trim()});
            }
        }
    }
    return out;
}

/**
 * The app's errors while the flow ran, grouped by message with server URLs
 * left out, most frequent first.
 *
 * @param {{time: number, message: string}[]} errors
 * @param {number|null} start
 * @param {number|null} end
 * @returns {{message: string, count: number}[]}
 */
function errorsDuring(errors, start, end) {
    if (start == null || end == null) {
        return [];
    }
    const counts = new Map();
    for (const e of errors) {
        if (e.time < start || e.time > end + LOG_GRACE_MS) {
            continue;
        }
        const message = e.message.replace(/https?:\/\/\S+/g, '<url>').slice(0, MESSAGE_MAX);
        counts.set(message, (counts.get(message) || 0) + 1);
    }
    return [...counts].map(([message, count]) => ({message, count})).sort((a, b) => b.count - a.count);
}

/**
 * One paragraph for the judge.
 *
 * @param {{failed: object|null, before: string[]}} steps
 * @param {{message: string, count: number}[]} errors
 * @returns {string}
 */
function summarize(steps, errors) {
    const parts = [];
    if (steps.failed) {
        const secs = Math.round(steps.failed.ms / 1000);
        const err = steps.failed.error ? ` (${steps.failed.error})` : '';
        parts.push(`Maestro stopped at "${steps.failed.step}"${err} after ${secs}s on that step.`);
        if (steps.before.length) {
            parts.push(`Steps just before: ${steps.before.join(' -> ')}.`);
        }
    }
    if (errors.length) {
        const total = errors.reduce((n, e) => n + e.count, 0);
        const top = errors.slice(0, LOG_ERRORS_MAX).map((e) => `${e.message} (x${e.count})`).join(' | ');
        parts.push(`The app logged ${total} error(s) while this flow ran: ${top}`);
    } else if (steps.failed) {
        parts.push('The app logged no errors while this flow ran.');
    }
    return parts.join(' ').slice(0, NOTES_MAX);
}

const folderFor = (title) => title.replace(/[^\w.-]+/g, '_').slice(0, 120);

/**
 * @param {{xml: string, buildDir: string, deviceLog: string, evidenceDir: string}} input
 * @returns {object[]} entries in the e2e-triage evidence-dir format
 */
function buildEvidence({xml, buildDir, deviceLog, evidenceDir}) {
    const files = listFiles(buildDir);
    const errors = appErrors(deviceLog);
    const entries = [];
    for (const flow of failedFlows(xml).slice(0, MAX_TESTS)) {
        const {screenshot, commands} = debugOutput(files, flow.title);
        let steps = {failed: null, before: [], start: null, end: null};
        if (commands) {
            try {
                steps = flowSteps(JSON.parse(fs.readFileSync(commands, 'utf8')));
            } catch (e) {
                console.log(`Unreadable Maestro command log ${commands}: ${String(e).slice(0, 120)}`);
            }
        }
        const images = [];
        if (screenshot) {
            const rel = path.join(folderFor(flow.title), 'failure.png');
            fs.mkdirSync(path.join(evidenceDir, folderFor(flow.title)), {recursive: true});
            fs.copyFileSync(screenshot, path.join(evidenceDir, rel));
            images.push(rel);
        }
        const notes = summarize(steps, errorsDuring(errors, steps.start, steps.end));
        if (images.length || notes) {
            entries.push({file: flow.file, title: flow.title, notes, images});
        }
    }
    return entries;
}

function main() {
    const args = parseArgs(process.argv);
    if (!args.report || !args.dir || !args.out) {
        console.error('usage: maestro-triage-evidence.js --report <maestro-report.xml> --build <build dir> [--device-log <file>] --dir <evidence dir> --out <file.json>');
        process.exit(2);
    }
    if (!fs.existsSync(args.report)) {
        console.log(`No Maestro report at ${args.report}; no triage evidence.`);
        return;
    }
    const xml = fs.readFileSync(args.report, 'utf8');
    const deviceLog = args['device-log'] && fs.existsSync(args['device-log']) ? fs.readFileSync(args['device-log'], 'utf8') : '';
    const entries = buildEvidence({xml, buildDir: args.build || path.dirname(args.report), deviceLog, evidenceDir: args.dir});
    if (!entries.length) {
        console.log('No failed flows with evidence.');
        return;
    }
    fs.mkdirSync(path.dirname(args.out), {recursive: true});
    fs.writeFileSync(args.out, JSON.stringify(entries, null, 2));
    console.log(`Wrote triage evidence for ${entries.length} failed flow(s) to ${args.out}`);
}

if (require.main === module) {
    main();
}

module.exports = {failedFlows, debugOutput, describeCommand, flowSteps, appErrors, errorsDuring, summarize, buildEvidence};
