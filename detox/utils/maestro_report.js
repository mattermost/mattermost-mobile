// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console */

const path = require('path');

const fse = require('fs-extra');
const xml2js = require('xml2js');

/**
 * Parse a Maestro JUnit XML file and return a summary object
 * matching the shape produced by report.js generateShortSummary().
 *
 * @param {string} xmlPath - Path to maestro-report.xml
 * @returns {{stats: object, statsFieldValue: string, flows: Array} | null}
 */
function parseMaestroReport(xmlPath) {
    if (!fse.existsSync(xmlPath)) {
        console.log(`Maestro report not found at ${xmlPath}`);
        return null;
    }

    const xml = fse.readFileSync(xmlPath, 'utf-8');
    let parsed;
    xml2js.parseString(xml, {mergeAttrs: true}, (err, result) => {
        if (err) {
            console.log('Failed to parse Maestro XML:', err.message);
            return;
        }
        parsed = result;
    });

    if (!parsed || !parsed.testsuites) {
        console.log('Maestro XML has unexpected structure');
        return null;
    }

    const testsuites = parsed.testsuites;
    let tests = 0;
    let failures = 0;
    let errors = 0;
    let skipped = 0;
    let duration = 0;
    const flows = [];
    const failedNames = [];

    const suites = testsuites.testsuite || [];
    for (const suite of suites) {
        tests += parseInt(suite.tests?.[0] || '0', 10);
        failures += parseInt(suite.failures?.[0] || '0', 10);
        errors += parseInt(suite.errors?.[0] || '0', 10);
        skipped += parseInt(suite.skipped?.[0] || '0', 10);
        duration += parseFloat(suite.time?.[0] || '0') * 1000;

        const testcases = suite.testcase || [];
        for (const tc of testcases) {
            const name = tc.name?.[0] || 'unknown';
            const classname = tc.classname?.[0] || suite.name?.[0] || '';

            // The XML's `file` attribute is the flow's full path
            // (e.g. "maestro/flows/calls/start_call.yml"). We extract the
            // category (parent directory under flows/) so screenshots whose
            // filename starts with the category prefix can be matched even
            // when the flow filename token isn't a substring of the screenshot
            // name (which is the common case for Maestro screenshots whose
            // names are author-defined ad-hoc strings).
            const file = (tc.$ && tc.$.file) || tc.file?.[0] || '';
            const categoryMatch = String(file).match(/flows\/([^/]+)\//);
            const category = categoryMatch ? categoryMatch[1].toLowerCase() : '';
            const time = parseFloat(tc.time?.[0] || '0');
            let status = 'passed';
            let failureMessage = null;

            if (tc.failure) {
                status = 'failed';
                const failure = tc.failure[0];
                failureMessage = (typeof failure === 'string' ? failure : failure._ || failure.message?.[0] || '').toString();
                failedNames.push(name);
            } else if (tc.error) {
                status = 'error';
                const errVal = tc.error[0];
                failureMessage = (typeof errVal === 'string' ? errVal : errVal._ || errVal.message?.[0] || '').toString();
                failedNames.push(name);
            } else if (tc.skipped) {
                status = 'skipped';
            }

            flows.push({name, classname, file, category, time, status, failureMessage});
        }
    }

    const passes = tests - (failures + errors + skipped);
    const passPercent = tests > 0 ? ((passes / tests) * 100).toFixed(2) : '0.00';
    const now = new Date().toISOString();

    const stats = {
        suites: suites.length,
        tests,
        skipped,
        failures,
        errors,
        duration,
        start: now,
        end: now,
        passes,
        passPercent,
    };

    let statsFieldValue = `
| Key | Value |
|:---|:---|
| Passing Rate | ${stats.passPercent}% |
| Duration | ${(stats.duration / (60 * 1000)).toFixed(4)} mins |
| Tests | ${stats.tests} |
| :white_check_mark: Passed | ${stats.passes} |
| :x: Failed | ${stats.failures} |
| :fast_forward: Skipped | ${stats.skipped} |
`;

    if (failedNames.length > 0) {
        const maxShow = 5;
        const display = failedNames.length > maxShow
            ? [...failedNames.slice(0, maxShow - 1).map((f) => `- ${f}`), '- more...']
            : failedNames.map((f) => `- ${f}`);
        statsFieldValue += '###### Failed Tests:\n' + display.join('\n');
    }

    return {stats, statsFieldValue, flows};
}

/**
 * Recursively walk a directory and return relative file paths (POSIX-style).
 */
function walkFiles(rootDir) {
    if (!fse.existsSync(rootDir)) {
        return [];
    }
    const collected = [];
    const stack = [rootDir];
    while (stack.length) {
        const dir = stack.pop();
        for (const entry of fse.readdirSync(dir, {withFileTypes: true})) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                stack.push(full);
            } else if (entry.isFile()) {
                collected.push(path.relative(rootDir, full).split(path.sep).join('/'));
            }
        }
    }
    return collected;
}

/**
 * Sanitize a flow name to a filesystem-style token used for matching artifact
 * filenames. Maestro names artifacts using the flow name (minus extension),
 * with spaces/special-chars replaced.
 */
function normalizeFlowToken(name) {
    return name.toLowerCase().replace(/\.ya?ml$/i, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Score how strongly a screenshot/log path belongs to a given flow.
 *
 * Maestro screenshots are named by the flow author via `takeScreenshot:` and
 * usually combine a category prefix with an ad-hoc state name
 * (e.g. `calls-mute-initial-state.png`). The simple substring rule
 * (`lowerToken.includes(token)`) fails because the flow filename token
 * (`mute_unmute`) is rarely a substring of the screenshot's token
 * (`calls_mute_initial_state`).
 *
 * Scoring:
 *   +100 per full-token substring match (kept so legacy well-named artifacts
 *        like `mute_unmute_step3.png` still attribute correctly).
 *   + 10 per shared word (>= 2 chars) between the flow's name tokens and
 *        the file's name tokens — picks up `mute` in `calls-mute-initial-state`.
 *   +  1 if the screenshot's leading prefix equals the flow's category
 *        (e.g. `calls-...` for a flow under `maestro/flows/calls/`) — a weak
 *        tie-breaker so screenshots stay within their suite.
 *
 * Returns 0 when there's no plausible link; bucketing falls back to
 * `__unattributed` in that case.
 */
function scoreFlowMatch(flow, fileToken, fileWords, filePrefix) {
    let score = 0;

    if (flow.token && fileToken.includes(flow.token)) {
        score += 100;
    }

    if (flow.words.size) {
        for (const w of fileWords) {
            if (flow.words.has(w)) {
                score += 10;
            }
        }
    }

    if (flow.category && filePrefix && flow.category === filePrefix) {
        score += 1;
    }

    return score;
}

/**
 * Group artifact files by which flow they belong to. Each file is scored
 * against every flow (see scoreFlowMatch); the highest-scoring flow wins.
 * Files with no plausible link land in `__unattributed`.
 */
function bucketArtifactsByFlow(flows, artifactPaths) {
    const buckets = {__unattributed: []};
    for (const flow of flows) {
        buckets[flow.name] = [];
    }

    const tokenized = flows.map((f) => {
        const token = normalizeFlowToken(f.name);
        return {
            original: f.name,
            token,
            words: new Set(token.split('_').filter((w) => w.length >= 1)),
            category: (f.category || '').toLowerCase(),
        };
    });

    for (const relPath of artifactPaths) {
        const lower = relPath.toLowerCase();
        const fileToken = lower.replace(/[^a-z0-9/]+/g, '_');
        const fileWords = path.basename(lower).
            replace(/\.[a-z0-9]+$/i, ''). // strip extension
            split(/[^a-z0-9]+/).
            filter((w) => w.length >= 1);
        const prefixMatch = path.basename(lower).match(/^([a-z0-9]+)[-_]/);
        const filePrefix = prefixMatch ? prefixMatch[1] : '';

        let bestFlow = null;
        let bestScore = 0;
        let bestUnique = true;
        for (const f of tokenized) {
            const score = scoreFlowMatch(f, fileToken, fileWords, filePrefix);
            if (score > bestScore) {
                bestScore = score;
                bestFlow = f;
                bestUnique = true;
            } else if (score === bestScore && score > 0) {
                bestUnique = false;
            }
        }

        // Only attribute when there's a UNIQUE best match. If multiple flows
        // tie at the highest score (common for ambiguous ad-hoc screenshot
        // names like `calls-call-ended.png` that share words with every
        // calls/* flow), defer to `__unattributed` rather than arbitrarily
        // picking the first one by iteration order.
        if (bestFlow && bestUnique) {
            buckets[bestFlow.original].push(relPath);
        } else {
            buckets.__unattributed.push(relPath);
        }
    }
    return buckets;
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

function formatDuration(seconds) {
    if (!seconds || seconds < 0.001) {
        return '—';
    }
    if (seconds < 1) {
        return `${(seconds * 1000).toFixed(0)} ms`;
    }
    if (seconds < 60) {
        return `${seconds.toFixed(2)} s`;
    }
    const m = Math.floor(seconds / 60);
    const s = seconds - (m * 60);
    return `${m}m ${s.toFixed(0)}s`;
}

function isImage(p) {
    return /\.(png|jpe?g|webp|gif)$/i.test(p);
}

function isText(p) {
    return /\.(log|txt|json|yaml|yml|md)$/i.test(p);
}

function buildFlowSection(flow, files, artifactDirHref) {
    const statusBadge = {
        passed: '<span class="badge passed">PASSED</span>',
        failed: '<span class="badge failed">FAILED</span>',
        error: '<span class="badge failed">ERROR</span>',
        skipped: '<span class="badge skipped">SKIPPED</span>',
    }[flow.status] || '<span class="badge">?</span>';

    const screenshots = files.filter(isImage).sort();
    const logs = files.filter(isText).sort();

    const screenshotsHtml = screenshots.length ?
        `<div class="screenshots">${screenshots.map((p) => `
                <a class="thumb" href="${escapeHtml(artifactDirHref + '/' + p)}" target="_blank" rel="noopener">
                    <img loading="lazy" src="${escapeHtml(artifactDirHref + '/' + p)}" alt="${escapeHtml(p)}">
                    <div class="caption">${escapeHtml(path.basename(p))}</div>
                </a>`).join('')}</div>` :
        '<p class="muted">No screenshots captured for this flow.</p>';

    const logsHtml = logs.length ?
        `<ul class="logs">${logs.map((p) => `<li><a href="${escapeHtml(artifactDirHref + '/' + p)}" target="_blank" rel="noopener">${escapeHtml(p)}</a></li>`).join('')}</ul>` :
        '';

    const failureBlock = flow.failureMessage ?
        `<pre class="failure">${escapeHtml(flow.failureMessage)}</pre>` :
        '';

    const isOpen = flow.status === 'failed' || flow.status === 'error';

    return `
    <details class="flow flow-${flow.status}"${isOpen ? ' open' : ''}>
        <summary>
            ${statusBadge}
            <span class="flow-name">${escapeHtml(flow.name)}</span>
            <span class="flow-duration">${escapeHtml(formatDuration(flow.time))}</span>
        </summary>
        <div class="flow-body">
            ${failureBlock}
            ${screenshotsHtml}
            ${logsHtml ? `<details class="logs-wrap"><summary>Log files (${logs.length})</summary>${logsHtml}</details>` : ''}
        </div>
    </details>`;
}

/**
 * Generate a self-contained HTML report from the JUnit XML and maestro artifact
 * directory. Designed to be served as a single S3 object — all CSS is inline,
 * images are referenced by relative URL so they resolve against the same S3
 * prefix when the HTML is opened from S3.
 *
 * @param {object} opts
 * @param {string} opts.xmlPath          path to maestro-report.xml
 * @param {string} opts.artifactsDir     path to maestro-artifacts/ dir
 * @param {string} opts.outputPath       where to write maestro-report.html
 * @param {string} opts.platform         'ios' | 'android'
 * @param {string} [opts.commitSha]      optional, for the header
 * @returns {boolean} true on success
 */
function generateMaestroHtmlReport({xmlPath, artifactsDir, outputPath, platform, commitSha = ''}) {
    const summary = parseMaestroReport(xmlPath);
    if (!summary) {
        console.log('Cannot generate HTML report — XML parse failed.');
        return false;
    }
    const {stats, flows} = summary;
    const allFiles = walkFiles(artifactsDir);
    const buckets = bucketArtifactsByFlow(flows, allFiles);

    // Artifact links from the HTML are relative to the report file's location.
    // We place the HTML at the same level as the artifacts dir so the relative
    // base is 'maestro-artifacts'.
    const artifactDirHref = 'maestro-artifacts';

    const passPct = parseFloat(stats.passPercent);
    const overallBadge = stats.failures + stats.errors === 0 ?
        '<span class="badge passed">ALL PASSED</span>' :
        '<span class="badge failed">FAILURES</span>';

    const sortedFlows = [...flows].sort((a, b) => {
        const rank = (s) => ({failed: 0, error: 0, skipped: 1, passed: 2}[s] ?? 3);
        const r = rank(a.status) - rank(b.status);
        return r === 0 ? a.name.localeCompare(b.name) : r;
    });
    const flowsHtml = sortedFlows.map((flow) => buildFlowSection(flow, buckets[flow.name] || [], artifactDirHref)).join('\n');

    const unattributed = buckets.__unattributed;
    const unattributedHtml = unattributed.length ? `
    <details class="flow">
        <summary>
            <span class="badge">FILES</span>
            <span class="flow-name">Unattributed artifacts (${unattributed.length})</span>
        </summary>
        <div class="flow-body"><ul class="logs">${unattributed.map((p) => `<li><a href="${escapeHtml(artifactDirHref + '/' + p)}" target="_blank" rel="noopener">${escapeHtml(p)}</a></li>`).join('')}</ul></div>
    </details>` : '';

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Maestro ${escapeHtml(platform)} report</title>
<style>
:root { --bg:#0f172a; --panel:#1e293b; --border:#334155; --text:#e2e8f0; --muted:#94a3b8; --pass:#22c55e; --fail:#ef4444; --skip:#f59e0b; --link:#60a5fa; }
* { box-sizing:border-box; }
body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,sans-serif; background:var(--bg); color:var(--text); line-height:1.5; }
header { position:sticky; top:0; background:var(--panel); border-bottom:1px solid var(--border); padding:16px 24px; z-index:10; }
header h1 { margin:0; font-size:20px; font-weight:600; display:flex; align-items:center; gap:12px; }
header .meta { color:var(--muted); font-size:13px; margin-top:4px; }
main { max-width:1200px; margin:0 auto; padding:24px; }
.stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:24px; }
.stat { background:var(--panel); border:1px solid var(--border); border-radius:8px; padding:12px 16px; }
.stat .label { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:0.05em; }
.stat .value { font-size:24px; font-weight:600; margin-top:4px; }
.stat.pass .value { color:var(--pass); }
.stat.fail .value { color:var(--fail); }
.stat.skip .value { color:var(--skip); }
.progress { height:8px; background:var(--border); border-radius:4px; overflow:hidden; margin-bottom:24px; }
.progress > .bar { height:100%; background:var(--pass); transition:width 0.3s; }
h2 { font-size:16px; font-weight:600; margin:24px 0 12px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em; }
.flow { background:var(--panel); border:1px solid var(--border); border-radius:8px; margin-bottom:8px; overflow:hidden; }
.flow > summary { padding:12px 16px; cursor:pointer; display:flex; align-items:center; gap:12px; user-select:none; list-style:none; }
.flow > summary::-webkit-details-marker { display:none; }
.flow > summary::before { content:'▸'; color:var(--muted); transition:transform 0.15s; display:inline-block; }
.flow[open] > summary::before { transform:rotate(90deg); }
.flow-name { flex:1; font-weight:500; }
.flow-duration { color:var(--muted); font-size:13px; font-variant-numeric:tabular-nums; }
.badge { font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; letter-spacing:0.05em; background:var(--border); color:var(--text); }
.badge.passed { background:rgba(34,197,94,0.15); color:var(--pass); }
.badge.failed { background:rgba(239,68,68,0.15); color:var(--fail); }
.badge.skipped { background:rgba(245,158,11,0.15); color:var(--skip); }
.flow-body { padding:16px; border-top:1px solid var(--border); background:rgba(0,0,0,0.15); }
.failure { background:rgba(239,68,68,0.08); border-left:3px solid var(--fail); padding:12px; border-radius:4px; font-family:'SF Mono',Menlo,Consolas,monospace; font-size:12px; white-space:pre-wrap; word-wrap:break-word; overflow-x:auto; margin:0 0 16px; }
.screenshots { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; }
.thumb { display:block; background:var(--bg); border:1px solid var(--border); border-radius:6px; overflow:hidden; text-decoration:none; color:inherit; transition:border-color 0.15s; }
.thumb:hover { border-color:var(--link); }
.thumb img { display:block; width:100%; height:200px; object-fit:contain; background:#000; }
.thumb .caption { padding:6px 8px; font-size:11px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.muted { color:var(--muted); font-style:italic; margin:0; }
.logs-wrap { margin-top:16px; }
.logs-wrap > summary { cursor:pointer; color:var(--link); font-size:13px; }
.logs { margin:8px 0 0; padding-left:20px; }
.logs a { color:var(--link); text-decoration:none; font-size:13px; }
.logs a:hover { text-decoration:underline; }
</style>
</head>
<body>
<header>
    <h1>Maestro ${escapeHtml(platform)} report ${overallBadge}</h1>
    <div class="meta">${escapeHtml(stats.tests)} tests · ${escapeHtml(stats.passPercent)}% passing · ${escapeHtml(formatDuration(stats.duration / 1000))}${commitSha ? ' · ' + escapeHtml(commitSha.slice(0, 7)) : ''}</div>
</header>
<main>
    <div class="stats">
        <div class="stat"><div class="label">Tests</div><div class="value">${escapeHtml(stats.tests)}</div></div>
        <div class="stat pass"><div class="label">Passed</div><div class="value">${escapeHtml(stats.passes)}</div></div>
        <div class="stat fail"><div class="label">Failed</div><div class="value">${escapeHtml(stats.failures + stats.errors)}</div></div>
        <div class="stat skip"><div class="label">Skipped</div><div class="value">${escapeHtml(stats.skipped)}</div></div>
        <div class="stat"><div class="label">Duration</div><div class="value">${escapeHtml(formatDuration(stats.duration / 1000))}</div></div>
    </div>
    <div class="progress"><div class="bar" style="width:${passPct}%"></div></div>
    <h2>Flows (${flows.length})</h2>
    ${flowsHtml || '<p class="muted">No flows reported.</p>'}
    ${unattributedHtml}
</main>
</body>
</html>`;

    fse.outputFileSync(outputPath, html, 'utf-8');
    console.log(`Wrote maestro HTML report: ${outputPath} (${allFiles.length} artifact files, ${flows.length} flows)`);
    return true;
}

module.exports = {parseMaestroReport, generateMaestroHtmlReport};
