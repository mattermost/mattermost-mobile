// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Normalize a run's downloaded E2E artifacts into a single failure record set.
 *
 * Everything downstream — clustering, the rule classifier, and the model — reads
 * this shape and nothing else. Handing a model raw multi-megabyte logs is both
 * expensive and unreliable; handing it a normalized record with a bounded log
 * window is neither.
 *
 * Inputs it understands, discovered by walking the artifact root:
 *   jest-results*.json     Detox (jest --json --outputFile)
 *   maestro-report*.xml    Maestro (JUnit XML)
 *   *.png                  failure screenshots (Detox keeps only failed tests')
 *   device.log / *.log     the log window around the failure
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// How much log context travels with each failure. Enough to see the failing
// action and what preceded it; small enough that a hundred failures still fit in
// a model context.
const LOG_WINDOW_BYTES = 8 * 1024;

// Failure text is truncated before hashing and before export. Stacks past this
// are boilerplate frames that add tokens without adding signal.
const MAX_MESSAGE_CHARS = 4000;

const TEST_ID_RE = /\bMM-T[0-9]+(?:_[0-9]+)?/;

/**
 * Reduce a failure message to its invariant shape so that the same underlying
 * failure hashes identically across tests and runs.
 *
 * Without this, clustering does nothing useful: every failure carries unique
 * IDs, ports, timings, and temp paths, so every failure would be its own cluster
 * and the whole cost model (bounded by cluster count, not failure count) breaks.
 */
function normalizeForSignature(message) {
    return String(message || '').
        slice(0, MAX_MESSAGE_CHARS).
        replace(/\b[0-9a-f]{8,}\b/gi, '<hex>').
        replace(/\b[0-9a-z]{26}\b/gi, '<id>').
        replace(/\b\d+(\.\d+)?(ms|s|m)\b/gi, '<dur>').
        replace(/:\d+:\d+/g, ':<pos>').

        // Whole file paths, basename included. The signature describes the failure
        // *mode*, not where it happened: two different specs failing with "server
        // returned 502" are one cause and must land in one cluster, which is the
        // entire reason the cost model is bounded by cluster count. Each member
        // keeps its own spec path, and the cluster keeps the full list.
        replace(/(?:[\w.~-]*\/)*[\w.~-]+\.(?:[jt]sx?|yaml|yml)\b/g, '<file>').
        replace(/\b\d{2,}\b/g, '<n>').
        replace(/\s+/g, ' ').
        trim().
        toLowerCase();
}

function signatureHash(message, errorType) {
    return crypto.
        createHash('sha1').
        update(`${errorType || ''}::${normalizeForSignature(message)}`).
        digest('hex').
        slice(0, 12);
}

/**
 * Short human label for a cluster. The normalized text is unreadable, so take the
 * first line of the raw message instead.
 */
function signatureLabel(message) {
    const firstLine = String(message || '').
        split('\n').
        map((l) => l.trim()).
        find((l) => l.length > 0);
    return (firstLine || 'unknown failure').slice(0, 120);
}

function walk(root, predicate, out = [], depth = 0) {
    // Artifact trees are shallow; the cap is a guard against symlink loops rather
    // than a real structural limit.
    if (depth > 12 || !fs.existsSync(root)) {
        return out;
    }
    let entries;
    try {
        entries = fs.readdirSync(root, {withFileTypes: true});
    } catch {
        return out;
    }
    for (const entry of entries) {
        const full = path.join(root, entry.name);
        if (entry.isDirectory()) {
            walk(full, predicate, out, depth + 1);
        } else if (predicate(entry.name, full)) {
            out.push(full);
        }
    }
    return out;
}

/**
 * Derive the shard label from the artifact directory name.
 *
 * Artifacts are uploaded as `<platform>-results-<hash>-<runId>`, so the trailing
 * segment is the shard. Falls back to the directory name so an unrecognised
 * layout degrades to something still distinguishable rather than to "unknown"
 * for every shard, which would collapse per-shard suite rules.
 */
function shardFromPath(filePath, root) {
    const rel = path.relative(root, filePath);
    const first = rel.split(path.sep)[0];
    if (!first || first === rel) {
        return 'default';
    }

    // Only a short trailing number is a shard index. Detox uploads
    // `<platform>-results-<hash>-<n>` where n is the matrix runId, but Maestro
    // uploads `maestro-<platform>-results-<github.run_id>` — and a greedy match
    // would read that 10-digit run id as a shard, giving the iOS and Android
    // Maestro artifacts the *same* shard label. They would then look like one
    // machine, which is exactly the distinction the suite-shape rules depend on.
    const m = first.match(/-(\d{1,3})$/);
    return m ? m[1] : first;
}

function platformFromPath(filePath) {
    const lower = filePath.toLowerCase();
    if (lower.includes('ipad')) {
        return 'ipad';
    }
    if (lower.includes('ios')) {
        return 'ios';
    }
    if (lower.includes('android')) {
        return 'android';
    }
    return 'unknown';
}

/**
 * Read the tail of a log file. The failure is at the end of the run, so the tail
 * is the relevant window — and reading only the tail keeps a 200MB device.log
 * from being loaded into memory.
 */
function readLogTail(logPath, bytes = LOG_WINDOW_BYTES) {
    try {
        const {size} = fs.statSync(logPath);
        const start = Math.max(0, size - bytes);
        const fd = fs.openSync(logPath, 'r');
        try {
            const buf = Buffer.alloc(Math.min(bytes, size));
            fs.readSync(fd, buf, 0, buf.length, start);
            return buf.toString('utf8');
        } finally {
            fs.closeSync(fd);
        }
    } catch {
        return '';
    }
}

// Per-root index of Detox's per-test artifact directories, built once.
//
// Without this the lookup below walks the entire artifact tree once per failure.
// A run with 50 failures against a multi-hundred-megabyte artifact tree turns
// that into a quadratic scan measured in minutes, inside a job whose whole point
// is to be cheap.
const artifactIndexCache = new Map();

function buildArtifactIndex(root) {
    if (artifactIndexCache.has(root)) {
        return artifactIndexCache.get(root);
    }
    const index = [];
    const seen = new Set();
    walk(root, (name, full) => {
        const dir = path.dirname(full);
        if (!seen.has(dir)) {
            seen.add(dir);
            index.push({
                dir,
                slug: path.basename(dir).replace(/[^a-z0-9]+/gi, '').toLowerCase(),
            });
        }
        return false;
    });
    artifactIndexCache.set(root, index);
    return index;
}

/**
 * Find the artifacts Detox wrote for one test. Detox's path builder names the
 * directory after the test, so match on a slugified title rather than on an
 * index — indices shift when the set of failing tests changes.
 */
function findTestArtifacts(root, title) {
    const slug = title.replace(/[^a-z0-9]+/gi, '').toLowerCase().slice(0, 40);
    if (!slug) {
        return {screenshot: null, log: null};
    }
    const needle = slug.slice(0, 24);
    const hit = buildArtifactIndex(root).find((entry) => entry.slug.includes(needle));
    if (!hit) {
        return {screenshot: null, log: null};
    }
    let files;
    try {
        files = fs.readdirSync(hit.dir);
    } catch {
        return {screenshot: null, log: null};
    }
    const screenshot = files.find((f) => f.endsWith('.png'));
    const log = files.find((f) => f.endsWith('.log'));
    return {
        screenshot: screenshot ? path.join(hit.dir, screenshot) : null,
        log: log ? path.join(hit.dir, log) : null,
    };
}

function parseJestResults(filePath, root) {
    let doc;
    try {
        doc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        return {failures: [], shard: null, error: `unreadable jest report: ${err.message}`};
    }

    const shard = shardFromPath(filePath, root);
    const platform = platformFromPath(filePath);
    const failures = [];
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const suite of doc.testResults || []) {
        // A suite that blew up during setup has no assertionResults at all — its
        // message is the only record that anything happened, and dropping it here
        // is exactly how a whole-shard death becomes invisible to triage.
        if ((!suite.assertionResults || suite.assertionResults.length === 0) && suite.message) {
            failed += 1;
            total += 1;
            failures.push(buildFailure({
                spec: suite.name,
                title: `${path.basename(suite.name || 'unknown')} (suite-level failure)`,
                message: suite.message,
                durationMs: 0,
                platform,
                shard,
                framework: 'detox',
                suiteLevel: true,
                root,
            }));
            continue;
        }

        for (const assertion of suite.assertionResults || []) {
            total += 1;
            if (assertion.status === 'passed') {
                passed += 1;
                continue;
            }
            if (assertion.status === 'pending' || assertion.status === 'skipped' || assertion.status === 'todo') {
                skipped += 1;
                continue;
            }
            failed += 1;
            failures.push(buildFailure({
                spec: suite.name,
                title: assertion.fullName || assertion.title,
                message: (assertion.failureMessages || []).join('\n'),
                durationMs: assertion.duration || 0,
                platform,
                shard,
                framework: 'detox',
                suiteLevel: false,
                root,
            }));
        }
    }

    return {failures, shard: {shard, platform, total, passed, failed, skipped}, error: null};
}

/**
 * Minimal JUnit XML reader for Maestro reports.
 *
 * Deliberately regex-based rather than a real XML parser: the detox package
 * carries no XML dependency, the producer is a single known tool, and the shape
 * consumed here is two elements deep. A malformed report degrades to zero
 * failures plus a parse error, which the suite rules then see as "shard produced
 * nothing" — the correct conclusion.
 */
function parseMaestroReport(filePath, root) {
    let xml;
    try {
        xml = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        return {failures: [], shard: null, error: `unreadable maestro report: ${err.message}`};
    }

    const shard = shardFromPath(filePath, root);
    const platform = platformFromPath(filePath);
    const failures = [];
    let total = 0;
    let failed = 0;
    let skipped = 0;

    // Attributes are matched lazily and the self-closing form is tried first:
    // a greedy `[^>]*` swallows the `/` of `<testcase … />`, which then forces the
    // open-tag branch to scan forward to the *next* `</testcase>` and silently eat
    // the following test case.
    const caseRe = /<testcase\b([^>]*?)\s*(?:\/>|>([\s\S]*?)<\/testcase>)/g;
    let match;
    while ((match = caseRe.exec(xml)) !== null) {
        total += 1;
        const attrs = match[1] || '';
        const body = match[2] || '';
        const name = (attrs.match(/name="([^"]*)"/) || [])[1] || 'unknown';
        const timeAttr = parseFloat((attrs.match(/time="([^"]*)"/) || [])[1] || '0');

        if (/<skipped\b/.test(body)) {
            skipped += 1;
            continue;
        }
        const failureMatch = body.match(/<(failure|error)\b([^>]*?)\s*(?:\/>|>([\s\S]*?)<\/\1>)/);
        if (!failureMatch) {
            continue;
        }
        failed += 1;
        const failAttrs = failureMatch[2] || '';
        const messageAttr = (failAttrs.match(/message="([^"]*)"/) || [])[1] || '';
        const body2 = failureMatch[3] || '';
        failures.push(buildFailure({
            spec: filePath,
            title: name,
            message: decodeXmlEntities(`${messageAttr}\n${body2}`).trim(),
            durationMs: Math.round((Number.isFinite(timeAttr) ? timeAttr : 0) * 1000),
            platform,
            shard,
            framework: 'maestro',
            suiteLevel: false,
            root,
        }));
    }

    return {
        failures,
        shard: {shard, platform, total, passed: total - failed - skipped, failed, skipped},
        error: null,
    };
}

function decodeXmlEntities(s) {
    return String(s).
        replace(/&lt;/g, '<').
        replace(/&gt;/g, '>').
        replace(/&quot;/g, '"').
        replace(/&apos;/g, "'").
        replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))).
        replace(/&amp;/g, '&');
}

/**
 * Normalize a spec path to repo-relative.
 *
 * Jest reports carry the absolute path from the machine that ran the test, and
 * that is a *different runner* — usually a different OS — from the one doing
 * triage. path.relative() against the triage job's cwd therefore produces a
 * garbage `../../../Users/runner/...` path, which then fails spec_list
 * validation and takes the whole rerun with it.
 *
 * Anchoring on the `detox/` segment is stable across runners because it is the
 * repo-relative prefix every spec shares. Anything that does not contain it is
 * not a rerunnable spec and is left null rather than guessed at.
 */
function toRepoRelativeSpec(filePath) {
    if (!filePath) {
        return null;
    }
    const normalized = String(filePath).replace(/\\/g, '/');
    const match = normalized.match(/(?:^|\/)(detox\/.*)$/);
    if (match) {
        return match[1];
    }
    return path.isAbsolute(normalized) ? null : normalized;
}

function buildFailure({spec, title, message, durationMs, platform, shard, framework, suiteLevel, root}) {
    const trimmed = String(message || '').slice(0, MAX_MESSAGE_CHARS);
    const errorType = (trimmed.match(/^\s*(\w*Error|\w*Exception|Timeout)\b/m) || [])[1] || 'Failure';
    const artifacts = framework === 'detox' && !suiteLevel ?findTestArtifacts(root, title || '') :{screenshot: null, log: null};

    const logExcerpt = artifacts.log ? readLogTail(artifacts.log) : '';

    return {
        test_id: (String(title || '').match(TEST_ID_RE) || [null])[0],
        spec: toRepoRelativeSpec(spec),
        title: title || 'unknown',
        platform,
        shard,
        framework,
        suite_level: Boolean(suiteLevel),
        error_type: errorType,
        error_message: trimmed,
        duration_ms: durationMs || 0,
        screenshot: artifacts.screenshot,
        device_log: artifacts.log,

        // Kept separate from error_message so the model can be told which text is
        // the assertion and which is ambient device noise.
        device_log_excerpt: logExcerpt,
        signature_hash: signatureHash(trimmed, errorType),
        signature_label: signatureLabel(trimmed),
    };
}

/**
 * Collect every failure under `root`.
 *
 * `root` is the directory GitHub's download-artifact populated — one subdirectory
 * per uploaded artifact, i.e. one per shard.
 */
/**
 * Read whatever the capture-server-diagnostics action left behind.
 *
 * This is what lets FLAKY_SERVER be a verdict rather than a guess: from the
 * device side a 502 and a broken selector are the same symptom, an element that
 * never appeared. A recorded non-200 ping at the time of the run is the only
 * thing that distinguishes them.
 */
function collectServerProbes(root) {
    const probes = [];
    for (const file of walk(root, (name) => name === 'summary.txt')) {
        if (!file.includes('server-diagnostics')) {
            continue;
        }
        try {
            const text = fs.readFileSync(file, 'utf8');
            const field = (key) => (text.match(new RegExp(`^${key}=(.*)$`, 'm')) || [])[1] || null;
            const code = field('ping_http_code');
            probes.push({
                site: field('site_url'),
                ping_http_code: code,
                reachable: code === '200',
                verdict_hint: field('verdict_hint'),
                captured_at: field('captured_at'),
                shard: shardFromPath(file, root),
                platform: platformFromPath(file),
                log_bytes: Number(field('server_log_bytes') || 0),
            });
        } catch {
            // A diagnostics file we cannot read tells us nothing; it must not
            // stop the rest of the collection.
        }
    }
    return probes;
}

function collect(root, {cwd = process.cwd()} = {}) {
    const absRoot = path.resolve(cwd, root);
    const jestReports = walk(absRoot, (name) => /^jest-results.*\.json$/.test(name));
    const maestroReports = walk(absRoot, (name) => /^maestro-report.*\.xml$/.test(name));

    const failures = [];
    const shards = [];
    const errors = [];

    for (const file of jestReports) {
        const result = parseJestResults(file, absRoot);
        failures.push(...result.failures);
        if (result.shard) {
            shards.push(result.shard);
        }
        if (result.error) {
            errors.push({file, error: result.error});
        }
    }
    for (const file of maestroReports) {
        const result = parseMaestroReport(file, absRoot);
        failures.push(...result.failures);
        if (result.shard) {
            shards.push(result.shard);
        }
        if (result.error) {
            errors.push({file, error: result.error});
        }
    }

    const summary = {
        totalTests: shards.reduce((n, s) => n + s.total, 0),
        passed: shards.reduce((n, s) => n + s.passed, 0),
        failed: shards.reduce((n, s) => n + s.failed, 0),
        skipped: shards.reduce((n, s) => n + s.skipped, 0),
        shards,
        platforms: [...new Set(shards.map((s) => s.platform))],
        reportsFound: jestReports.length + maestroReports.length,
        parseErrors: errors,
        serverProbes: collectServerProbes(absRoot),
    };

    return {summary, failures};
}

module.exports = {
    collect,
    collectServerProbes,
    toRepoRelativeSpec,
    normalizeForSignature,
    signatureHash,
    signatureLabel,
    parseJestResults,
    parseMaestroReport,
    readLogTail,
};
