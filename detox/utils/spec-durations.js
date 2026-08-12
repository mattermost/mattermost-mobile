// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env -- CI utility script */

/**
 * Build the per-spec duration manifest that drives duration-aware shard
 * packing in .github/actions/generate-specs/split-tests.js.
 *
 * Reads the Jest `--json` reports each shard uploaded, records how long every
 * spec file actually took, and folds the result into the previous manifest with
 * an exponential moving average so one slow/flaky run cannot dominate the
 * packing for the next.
 *
 * Only main-push runs publish the manifest — see the trust-scope note in
 * .github/actions/s3-build-cache/action.yml. A PR must not be able to steer how
 * other branches shard their tests.
 */

const fs = require('fs');
const path = require('path');

const {parseArgs} = require('./cli-args');
const {findJestResultFiles, relativizeDetoxPath} = require('./merge-jest-results-for-test-system-io');

// Weight given to the newest observation. 0.5 halves the influence of any single
// run within two runs while still tracking real changes in spec cost quickly.
const DEFAULT_SMOOTHING = 0.5;

/**
 * Duration of one Jest suite in ms, or null when it cannot be determined.
 *
 * Prefers the suite wall-clock (startTime/endTime) because that is what a shard
 * actually pays — it includes Detox app launch and teardown, which the sum of
 * assertion durations misses. Falls back to that sum when the wall-clock pair is
 * absent (e.g. a crashed shard wrote a partial report).
 *
 * @param {object} suite
 * @returns {number|null}
 */
function suiteDuration(suite) {
    const start = Number(suite?.startTime);
    const end = Number(suite?.endTime);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        return end - start;
    }

    const cases = Array.isArray(suite?.testResults) ? suite.testResults : (suite?.assertionResults || []);
    const summed = cases.reduce((total, testCase) => {
        const d = Number(testCase?.duration);
        return total + (Number.isFinite(d) && d > 0 ? d : 0);
    }, 0);

    return summed > 0 ? summed : null;
}

/**
 * Extract {specPath: ms} from a set of Jest `--json` report files.
 *
 * When several shards report the same spec (retries, overlapping matrices) the
 * longest observation wins — under-estimating a slow spec is what causes the
 * unbalanced shards this manifest exists to prevent.
 *
 * @param {string[]} reportPaths
 * @param {{repoRoot?: string}} [opts]
 * @returns {Record<string, number>}
 */
function extractDurations(reportPaths, opts = {}) {
    const durations = {};
    for (const reportPath of reportPaths) {
        let report;
        try {
            report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        } catch (err) {
            console.error(`spec-durations: skipping unreadable report ${reportPath}: ${err.message}`);
            continue;
        }
        for (const suite of report.testResults || []) {
            const spec = relativizeDetoxPath(suite.testFilePath || suite.name || '', opts);
            const ms = suiteDuration(suite);
            if (!spec || ms == null) {
                continue;
            }
            durations[spec] = Math.max(durations[spec] || 0, Math.round(ms));
        }
    }
    return durations;
}

/**
 * Fold fresh observations into the previous manifest.
 *
 * Specs absent from this run keep their previous value: a run that only exercised
 * a subset (or a shard that died) must not erase history for everything else.
 *
 * @param {Record<string, number>} previous
 * @param {Record<string, number>} observed
 * @param {number} [alpha] weight of the new observation, 0 < alpha <= 1
 * @returns {Record<string, number>}
 */
function mergeDurations(previous, observed, alpha = DEFAULT_SMOOTHING) {
    const merged = {...previous};
    for (const [spec, ms] of Object.entries(observed)) {
        const prev = Number(merged[spec]);
        merged[spec] = Number.isFinite(prev) && prev > 0 ? Math.round((alpha * ms) + ((1 - alpha) * prev)) : ms;
    }
    return merged;
}

/**
 * Read a manifest, returning {} for any missing or malformed file.
 *
 * @param {string} [filePath]
 * @returns {Record<string, number>}
 */
function readManifest(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        return {};
    }
    try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const durations = raw?.durations ?? raw;
        if (!durations || typeof durations !== 'object') {
            return {};
        }
        const out = {};
        for (const [spec, ms] of Object.entries(durations)) {
            const n = Number(ms);
            if (Number.isFinite(n) && n > 0) {
                out[spec] = Math.round(n);
            }
        }
        return out;
    } catch (err) {
        console.error(`spec-durations: ignoring malformed manifest ${filePath}: ${err.message}`);
        return {};
    }
}

/**
 * @param {{dir: string, previous?: string, output: string, key?: string, repoRoot?: string, alpha?: number}} opts
 * @returns {{specs: number, observed: number, output: string}}
 */
function writeDurationManifest({dir, previous, output, key, repoRoot, alpha}) {
    const reportPaths = findJestResultFiles(dir);
    const observed = extractDurations(reportPaths, {repoRoot});
    const merged = mergeDurations(readManifest(previous), observed, alpha);

    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.writeFileSync(output, JSON.stringify({
        key: key || null,
        updatedAt: new Date().toISOString(),
        durations: merged,
    }));

    return {specs: Object.keys(merged).length, observed: Object.keys(observed).length, output};
}

function main() {
    const args = parseArgs(process.argv);
    if (!args.dir || !args.output) {
        console.error('spec-durations: --dir and --output are required');
        process.exit(1);
    }

    const alpha = args.alpha ? Number(args.alpha) : undefined;
    const {specs, observed} = writeDurationManifest({
        dir: args.dir,
        previous: args.previous,
        output: args.output,
        key: args.key,
        repoRoot: args['repo-root'] || process.env.GITHUB_WORKSPACE || process.cwd(),
        alpha: Number.isFinite(alpha) && alpha > 0 && alpha <= 1 ? alpha : undefined,
    });

    if (observed === 0) {
        // Not fatal: the caller treats a manifest with no new data as "nothing to
        // publish" rather than failing the reporting job.
        console.error(`spec-durations: no durations found under ${args.dir}`);
    }
    console.error(`spec-durations: ${observed} spec(s) observed, ${specs} in manifest -> ${args.output}`);
    console.log(observed);
}

if (require.main === module) {
    main();
}

module.exports = {
    suiteDuration,
    extractDurations,
    mergeDurations,
    readManifest,
    writeDurationManifest,
};
