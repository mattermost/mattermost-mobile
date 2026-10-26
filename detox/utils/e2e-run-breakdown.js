// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-negated-condition -- CI utility script */

/**
 * Per-platform / per-framework breakdown of one or more GitHub Actions runs.
 *
 * The run list only says a whole E2E run failed; this groups its jobs so a
 * reader can see whether the red came from Detox or Maestro, iOS or Android,
 * without opening every job. Input is `gh run view <id> --json jobs` output
 * (a file path, or stdin), optionally repeated for several runs.
 *
 *   gh run view 123 --json jobs > run.json
 *   node detox/utils/e2e-run-breakdown.js run.json [more.json ...]
 *   node detox/utils/e2e-run-breakdown.js --json run.json   # machine-readable
 */

const fs = require('fs');

const {parseArgs} = require('./cli-args');

/**
 * @param {string} name job name, e.g. "mobile-cmt-ios-full-1 / machine-3-os-iOS 26.2"
 * @returns {'detox'|'maestro'|'other'}
 */
function frameworkOf(name) {
    const lower = (name || '').toLowerCase();
    if (lower.includes('maestro')) {
        return 'maestro';
    }
    if (lower.includes('detox') || lower.includes('machine-')) {
        return 'detox';
    }
    return 'other';
}

/**
 * @param {string} name
 * @returns {'ios'|'ipad'|'android'|'other'}
 */
function platformOf(name) {
    const lower = (name || '').toLowerCase();
    if (lower.includes('ipad')) {
        return 'ipad';
    }
    if (lower.includes('ios') || lower.includes('iphone')) {
        return 'ios';
    }
    if (lower.includes('android')) {
        return 'android';
    }
    return 'other';
}

/**
 * @param {Array<{name?: string, conclusion?: string}>} jobs
 * @returns {{groups: Map<string, {framework: string, platform: string, total: number, success: number, failure: number, cancelled: number, skipped: number, other: number, failingJobs: string[]}>}}
 */
function summarizeJobs(jobs) {
    const groups = new Map();
    for (const job of jobs || []) {
        const name = job.name || '';
        const framework = frameworkOf(name);
        const platform = platformOf(name);
        const key = `${framework}/${platform}`;
        if (!groups.has(key)) {
            groups.set(key, {framework, platform, total: 0, success: 0, failure: 0, cancelled: 0, skipped: 0, other: 0, failingJobs: []});
        }
        const group = groups.get(key);
        group.total++;
        const conclusion = job.conclusion || 'other';
        if (conclusion === 'success' || conclusion === 'failure' || conclusion === 'cancelled' || conclusion === 'skipped') {
            group[conclusion]++;
        } else {
            group.other++;
        }
        if (conclusion === 'failure') {
            group.failingJobs.push(name);
        }
    }
    return {groups};
}

/**
 * @param {object[]} runPayloads parsed `gh run view --json jobs` objects
 * @returns {ReturnType<typeof summarizeJobs>}
 */
function summarizeRuns(runPayloads) {
    const allJobs = [];
    for (const payload of runPayloads || []) {
        if (Array.isArray(payload?.jobs)) {
            allJobs.push(...payload.jobs);
        }
    }
    return summarizeJobs(allJobs);
}

function toPlainObject(summary) {
    const out = {};
    for (const [key, group] of [...summary.groups.entries()].sort()) {
        out[key] = {...group, failingJobs: [...group.failingJobs]};
    }
    return out;
}

function renderMarkdown(summary) {
    const lines = [
        '| Framework | Platform | Jobs | Passed | Failed | Cancelled | Skipped |',
        '|:---|:---|---:|---:|---:|---:|---:|',
    ];
    const failing = [];
    for (const group of [...summary.groups.values()].sort((a, b) => `${a.framework}/${a.platform}`.localeCompare(`${b.framework}/${b.platform}`))) {
        lines.push(`| ${group.framework} | ${group.platform} | ${group.total} | ${group.success} | ${group.failure} | ${group.cancelled} | ${group.skipped} |`);
        for (const name of group.failingJobs) {
            failing.push(`- [${group.framework}/${group.platform}] ${name}`);
        }
    }
    if (failing.length > 0) {
        lines.push('', 'Failing jobs:', ...failing);
    }
    return lines.join('\n');
}

function main() {
    const args = parseArgs(process.argv);
    const files = process.argv.slice(2).filter((entry) => entry.startsWith('--') === false);
    const readPayload = (text) => JSON.parse(text);
    let payloads;
    if (files.length > 0) {
        payloads = files.map((file) => readPayload(fs.readFileSync(file, 'utf8')));
    } else {
        payloads = [readPayload(fs.readFileSync(0, 'utf8'))];
    }
    const summary = summarizeRuns(payloads);
    if (args.json !== undefined) {
        console.log(JSON.stringify(toPlainObject(summary), null, 2));
    } else {
        console.log(renderMarkdown(summary));
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    frameworkOf,
    platformOf,
    summarizeJobs,
    summarizeRuns,
    toPlainObject,
    renderMarkdown,
};
