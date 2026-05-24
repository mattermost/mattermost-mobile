// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/*
 * Parse detox junit XML reports and update the per-spec duration ledger used
 * by split-tests.js. Runs after the matrix completes, before the cache save.
 *
 * Inputs (env):
 *   JUNIT_ROOT        — directory to recursively scan for junit XML files
 *                       (default: detox/artifacts)
 *   JUNIT_NAME_REGEX  — filename regex to match (default: ^(ios|android)-junit.*\.xml$ —
 *                       matches detox's `${platform}-junit*.xml` output written by
 *                       detox/save_report.js via junit-report-merger)
 *   DURATIONS_FILE    — path to write the updated ledger (default detox/.shard-durations.json)
 *   EMA_ALPHA         — smoothing factor 0..1 for exponential moving average
 *                       between existing and new durations (default 0.3 — new
 *                       runs have moderate weight, older runs decay slowly so
 *                       CI hardware noise doesn't whipsaw the ledger).
 *
 * Junit format: detox writes <testsuite name="<spec-path>" time="<seconds>">
 *   per-spec. Failed runs still report a time; we count them too (the test
 *   ran, took N seconds, regardless of pass/fail).
 *
 * Why EMA, not last-write-wins:
 *   Individual runs can spike if a runner has hardware contention. EMA(0.3)
 *   makes the ledger stable while still tracking real changes in 3-4 runs.
 */

const fs = require('fs');
const path = require('path');

const JUNIT_ROOT = process.env.JUNIT_ROOT || 'detox/artifacts';
const JUNIT_NAME_REGEX = new RegExp(process.env.JUNIT_NAME_REGEX || '^(ios|android)-junit.*\\.xml$');
const DURATIONS_FILE = process.env.DURATIONS_FILE || path.resolve('detox/.shard-durations.json');
const EMA_ALPHA = parseFloat(process.env.EMA_ALPHA || '0.3');

function findJunitFiles(root) {
    // Recursive walk in pure Node — avoids depending on shell `**` (only works
    // with `shopt -s globstar`) or `find` (works but adds an extra process).
    const out = [];
    if (!fs.existsSync(root)) {
        return out;
    }
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.isFile() && JUNIT_NAME_REGEX.test(entry.name)) {
                out.push(full);
            }
        }
    };
    walk(root);
    return out;
}

function loadExisting() {
    if (!fs.existsSync(DURATIONS_FILE)) {
        return {};
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(DURATIONS_FILE, 'utf8'));
        return parsed.durations || parsed;
    } catch (err) {
        process.stderr.write(`[update-durations] Existing ${DURATIONS_FILE} unparseable, starting fresh: ${err.message}\n`);
        return {};
    }
}

function parseJunit(file) {
    const xml = fs.readFileSync(file, 'utf8');
    // Each <testsuite name="..." time="..."> represents one spec file in detox's
    // junit output. We don't need a full XML parser — a regex over the
    // testsuite open tags is sufficient and avoids adding a dependency.
    const out = {};
    const re = /<testsuite\b[^>]*\bname="([^"]+)"[^>]*\btime="([^"]+)"/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
        const name = m[1];
        const time = parseFloat(m[2]);
        if (Number.isFinite(time) && time > 0) {
            // junit's "name" is sometimes a class path and sometimes a file
            // path. Normalize: keep what we got and let split-tests.js try
            // both the full and basename match.
            out[name] = time;
        }
    }
    return out;
}

function main() {
    const files = findJunitFiles(JUNIT_ROOT);
    if (files.length === 0) {
        process.stderr.write(`[update-durations] No junit files matched under ${JUNIT_ROOT} (regex ${JUNIT_NAME_REGEX}). Leaving ledger unchanged.\n`);
        return;
    }
    process.stderr.write(`[update-durations] Ingesting ${files.length} junit file(s) from ${JUNIT_ROOT}\n`);

    const existing = loadExisting();
    const observed = {};
    for (const file of files) {
        Object.assign(observed, parseJunit(file));
    }

    // EMA merge: new = α·observed + (1-α)·existing.
    const merged = {...existing};
    for (const [spec, time] of Object.entries(observed)) {
        const prev = existing[spec];
        merged[spec] = prev == null ? time : (EMA_ALPHA * time) + ((1 - EMA_ALPHA) * prev);
    }

    fs.mkdirSync(path.dirname(DURATIONS_FILE), {recursive: true});
    fs.writeFileSync(DURATIONS_FILE, JSON.stringify({
        updated_at: new Date().toISOString(),
        ema_alpha: EMA_ALPHA,
        durations: merged,
    }, null, 2));

    process.stderr.write(
        `[update-durations] observed_specs=${Object.keys(observed).length} ` +
        `total_ledger=${Object.keys(merged).length} written=${DURATIONS_FILE}\n`,
    );
}

main();
