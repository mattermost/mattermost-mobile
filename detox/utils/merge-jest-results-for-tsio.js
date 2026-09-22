// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env -- CI utility script */

/**
 * Merge per-shard Jest `--json` reports into the shape TSIO's Detox ingest
 * expects (`testFilePath` + nested `testResults`), not Jest CLI's
 * (`name` + `assertionResults`).
 *
 * See mattermost-test-system-io extractDetox().
 */

const fs = require('fs');
const path = require('path');

const {parseArgs} = require('./cli-args');

/**
 * Resolve candidate repo roots for stripping absolute CI paths.
 * Prefer explicit override, then GITHUB_WORKSPACE, then cwd.
 *
 * @param {string} [explicitRoot]
 * @returns {string[]}
 */
function resolveRepoRoots(explicitRoot) {
    const roots = [];
    if (explicitRoot) {
        roots.push(explicitRoot);
    }
    if (process.env.GITHUB_WORKSPACE) {
        roots.push(process.env.GITHUB_WORKSPACE);
    }
    roots.push(process.cwd());
    return [...new Set(roots.map((r) => path.resolve(r)))];
}

/**
 * Make a test file path repo-relative without hardcoding detox/e2e layout.
 * Absolute CI paths are stripped against workspace roots; already-relative
 * paths are returned unchanged (so `e2e/detox/...` and `detox/e2e/...` both work).
 *
 * @param {string} filePath
 * @param {{repoRoot?: string}} [opts]
 * @returns {string}
 */
function relativizeDetoxPath(filePath, opts = {}) {
    if (!filePath) {
        return filePath;
    }
    const normalized = filePath.replace(/\\/g, '/');

    // Already repo-relative — keep as-is for stable TSIO identity across moves.
    if (!path.isAbsolute(filePath) && !normalized.startsWith('/')) {
        return normalized.replace(/^\.\//, '');
    }

    const abs = path.resolve(filePath);
    for (const root of resolveRepoRoots(opts.repoRoot)) {
        const rootNorm = root.replace(/\\/g, '/').replace(/\/$/, '');
        const absNorm = abs.replace(/\\/g, '/');
        if (absNorm === rootNorm) {
            return '';
        }
        if (absNorm.startsWith(`${rootNorm}/`)) {
            return absNorm.slice(rootNorm.length + 1);
        }
    }

    // GitHub Actions / nested workspaces: .../work/<repo>/<repo>/<relative>
    const workMatch = normalized.match(/\/work\/[^/]+\/[^/]+\/(.+)$/);
    if (workMatch) {
        return workMatch[1];
    }

    return normalized.replace(/^\.\//, '');
}

/**
 * Map one suite from Jest CLI JSON (or already-TSIO-shaped) into TSIO Detox shape.
 *
 * @param {object} suite
 * @param {{repoRoot?: string}} [opts]
 * @returns {object|null}
 */
function toTsioDetoxSuite(suite, opts = {}) {
    if (!suite || typeof suite !== 'object') {
        return null;
    }

    const testFilePath = suite.testFilePath || suite.name || '';
    const cases = Array.isArray(suite.testResults) && suite.testResults.length > 0 ?
        suite.testResults :
        (suite.assertionResults || []);

    if (!testFilePath && cases.length === 0) {
        return null;
    }

    const startTime = typeof suite.startTime === 'number' ? suite.startTime : undefined;
    const out = {
        testFilePath: relativizeDetoxPath(testFilePath, opts),
        testResults: cases.map((c) => ({
            ancestorTitles: c.ancestorTitles || [],
            duration: c.duration ?? null,
            failureMessages: c.failureMessages || [],
            fullName: c.fullName || c.title || '',
            status: c.status || 'failed',
            title: c.title || c.fullName || 'unnamed',
        })),
    };

    if (startTime != null) {
        out.perfStats = {start: startTime};
    } else if (suite.perfStats?.start) {
        out.perfStats = {start: suite.perfStats.start};
    }

    return out;
}

/**
 * @param {string[]} inputPaths
 * @param {{repoRoot?: string}} [opts]
 * @returns {{testResults: object[]}}
 */
function mergeJestResultsForTsio(inputPaths, opts = {}) {
    const testResults = [];
    for (const inputPath of inputPaths) {
        const report = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        const suites = report.testResults || [];
        for (const suite of suites) {
            const converted = toTsioDetoxSuite(suite, opts);
            if (converted) {
                testResults.push(converted);
            }
        }
    }
    return {testResults};
}

/**
 * Flatten a generate-specs matrix ({"include":[{specs:"a.e2e.ts b.e2e.ts"}]}) into spec paths.
 *
 * @param {string} specsJson
 * @returns {string[]}
 */
function parseExpectedSpecs(specsJson) {
    if (!specsJson) {
        return [];
    }
    const include = JSON.parse(specsJson)?.include;
    if (!Array.isArray(include)) {
        return [];
    }
    return [...new Set(include.flatMap((row) => String(row?.specs ?? '').split(/\s+/).filter(Boolean)))];
}

/**
 * Every spec generate-specs handed out must come back with a result, or a shard that
 * uploaded nothing just shrinks the suite and the gate goes green (main d943628).
 *
 * @param {{testResults: object[]}} merged
 * @param {string[]} expectedSpecs  repo-relative paths
 * @returns {string[]} the specs that never reported
 */
function appendUnreportedSpecs(merged, expectedSpecs) {
    if (expectedSpecs.length === 0) {
        return [];
    }
    const reported = new Set(merged.testResults.map((suite) => suite.testFilePath));
    const missing = expectedSpecs.filter((spec) => !reported.has(spec));
    const now = Date.now();
    for (const spec of missing) {
        merged.testResults.push({
            testFilePath: spec,
            perfStats: {start: now},
            testResults: [{
                ancestorTitles: ['CI shard reporting'],
                duration: 0,
                failureMessages: [`${spec} was assigned to a shard but produced no result. The shard uploaded nothing, or its Jest process died before reaching this spec.`],
                fullName: `${spec} — spec did not run`,
                status: 'failed',
                title: 'spec did not run',
            }],
        });
    }
    return missing;
}

/**
 * Recursively collect jest-results.json under dir, skipping `excludePath`.
 *
 * @param {string} dir
 * @param {string} [excludePath]
 * @returns {string[]}
 */
function findJestResultFiles(dir, excludePath) {
    const exclude = excludePath ? path.resolve(excludePath) : null;
    const found = [];

    /** @param {string} current */
    function walk(current) {
        let entries;
        try {
            entries = fs.readdirSync(current, {withFileTypes: true});
        } catch {
            return;
        }
        for (const entry of entries) {
            const full = path.join(current, entry.name);
            if (exclude && path.resolve(full) === exclude) {
                continue;
            }
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.isFile() && entry.name === 'jest-results.json') {
                found.push(full);
            }
        }
    }

    walk(dir);
    return found.sort();
}

/**
 * @param {string[]} inputPaths
 * @param {string} outputPath
 * @param {{repoRoot?: string}} [opts]
 * @returns {{suites: number, tests: number}}
 */
function writeMergedJestResultsForTsio(inputPaths, outputPath, opts = {}) {
    const merged = mergeJestResultsForTsio(inputPaths, opts);
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, JSON.stringify(merged));
    const tests = merged.testResults.reduce((n, s) => n + (s.testResults?.length || 0), 0);
    return {suites: merged.testResults.length, tests};
}

function main() {
    const args = parseArgs(process.argv);
    const output = args.output;
    if (!output) {
        console.error('merge-jest-results-for-tsio: --output is required');
        process.exit(1);
    }

    let inputPaths = [];
    if (args.dir) {
        inputPaths = findJestResultFiles(args.dir, output);
    }

    const opts = {
        repoRoot: args['repo-root'] || process.env.GITHUB_WORKSPACE || process.cwd(),
    };
    const expectedSpecs = parseExpectedSpecs(args['expected-specs']);

    // Exiting here would leave TSIO with no report, so the status stays pending forever.
    // Fall through and let appendUnreportedSpecs produce the failure rows.
    if (inputPaths.length === 0 && expectedSpecs.length === 0) {
        console.error('merge-jest-results-for-tsio: no jest-results.json found and no expected spec list');
        process.exit(1);
    }

    const merged = mergeJestResultsForTsio(inputPaths, opts);
    const missing = appendUnreportedSpecs(merged, expectedSpecs);

    fs.mkdirSync(path.dirname(output), {recursive: true});
    fs.writeFileSync(output, JSON.stringify(merged));
    const suites = merged.testResults.length;
    const tests = merged.testResults.reduce((n, s) => n + (s.testResults?.length || 0), 0);
    console.log(`Merged ${inputPaths.length} shard JSON(s) -> ${suites} suite(s), ${tests} test(s) -> ${output}`);
    if (missing.length > 0) {
        console.error(`merge-jest-results-for-tsio: ${missing.length}/${expectedSpecs.length} assigned spec(s) never reported — marked failed:`);
        for (const spec of missing) {
            console.error(`  - ${spec}`);
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    mergeJestResultsForTsio,
    writeMergedJestResultsForTsio,
    appendUnreportedSpecs,
    parseExpectedSpecs,
    toTsioDetoxSuite,
    relativizeDetoxPath,
    resolveRepoRoots,
    findJestResultFiles,
};
