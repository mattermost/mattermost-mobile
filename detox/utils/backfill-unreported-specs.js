// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console -- CI utility script */

/**
 * Make a shard that stopped early report red instead of small.
 *
 * When Jest is killed mid-run (`detox ... E Command failed with exit code = null`,
 * i.e. a signal, not an exit), `--outputFile` never flushes. The templates then
 * promote `jest-stare/{ios,android}-data.json`, which jest-stare writes
 * incrementally and therefore holds only the suites that had already finished.
 * That file is a perfectly valid artifact, so:
 *
 *   - the missing-shard retry does not fire (the artifact exists),
 *   - merge-jest-results-for-tsio's stub does not fire (it only covers a
 *     *missing* jest-results.json),
 *   - `continue-on-error: true` hides the shard's non-zero exit,
 *
 * and the specs that never ran simply vanish from the report. Observed on main
 * d943628 (run 34884299661, iOS machine-4): jest was killed entering spec 3 of 5,
 * so channel_bookmarks / find_channels / file_upload — 22 tests — disappeared and
 * the gate published "560 passed, 100%" against the usual 582.
 *
 * Backfilling a failed entry per unreported spec keeps the shard's test count
 * honest and names exactly what did not run.
 */

const fs = require('fs');

const {parseArgs} = require('./cli-args');

const DEFAULT_REASON = 'Spec was assigned to this shard but produced no result — the Jest process died before reaching it (see the shard log for "Command failed with exit code = null").';

/**
 * Split a space-separated spec list the way the templates pass it.
 *
 * @param {string} specs
 * @returns {string[]}
 */
function parseSpecList(specs) {
    return String(specs || '').split(/\s+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * A suite is "reported" when some result's file path ends with the requested
 * spec path. Shard reports carry absolute CI paths (/Users/runner/work/...)
 * while the matrix passes repo-relative ones, and the key is `name` in Jest CLI
 * JSON but `testFilePath` once merge-jest-results-for-tsio has reshaped it.
 *
 * @param {{testResults?: object[]}} results
 * @returns {string[]}
 */
function reportedPaths(results) {
    const suites = Array.isArray(results?.testResults) ? results.testResults : [];
    return suites.
        map((suite) => String(suite?.name || suite?.testFilePath || '').replace(/\\/g, '/')).
        filter(Boolean);
}

/**
 * @param {{testResults?: object[]}} results  parsed jest-results.json (mutated)
 * @param {string[]} specs  spec paths this shard was asked to run
 * @param {{jobName?: string, reason?: string, now?: number}} [opts]
 * @returns {{added: string[], results: object}}
 */
function backfillUnreportedSpecs(results, specs, opts = {}) {
    const jobName = opts.jobName || 'unknown-shard';
    const reason = opts.reason || DEFAULT_REASON;
    const now = opts.now ?? Date.now();

    const report = results && typeof results === 'object' ? results : {};
    if (!Array.isArray(report.testResults)) {
        report.testResults = [];
    }

    const present = reportedPaths(report);
    const added = [];
    for (const spec of specs) {
        const normalized = spec.replace(/\\/g, '/');
        if (present.some((p) => p === normalized || p.endsWith(`/${normalized}`))) {
            continue;
        }
        added.push(normalized);

        // Jest CLI shape (name + assertionResults); merge-jest-results-for-tsio
        // accepts it alongside the TSIO shape.
        report.testResults.push({
            name: normalized,
            status: 'failed',
            startTime: now,
            endTime: now,
            perfStats: {start: now, end: now},
            message: reason,
            assertionResults: [{
                ancestorTitles: [jobName],
                title: 'spec did not run',
                fullName: `${normalized} — spec did not run on ${jobName}`,
                status: 'failed',
                duration: 0,
                failureMessages: [reason],
            }],
        });
    }

    if (added.length) {
        // Keep the summary counters consistent so anything reading them directly
        // (rather than recounting testResults) also sees the shard as failed.
        report.numTotalTestSuites = (report.numTotalTestSuites ?? present.length) + added.length;
        report.numFailedTestSuites = (report.numFailedTestSuites ?? 0) + added.length;
        report.numTotalTests = (report.numTotalTests ?? 0) + added.length;
        report.numFailedTests = (report.numFailedTests ?? 0) + added.length;
        report.success = false;
    }

    return {added, results: report};
}

function main() {
    const args = parseArgs(process.argv);
    const resultsPath = args.results;
    const specs = parseSpecList(args.specs);
    if (!resultsPath || specs.length === 0) {
        console.error('backfill-unreported-specs: --results and --specs are required');
        process.exit(1);
    }
    if (!fs.existsSync(resultsPath)) {
        // Nothing to repair: the missing-file path already writes a failure stub.
        console.log(`backfill-unreported-specs: ${resultsPath} does not exist — nothing to backfill`);
        return;
    }

    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    } catch (err) {
        console.error(`backfill-unreported-specs: ${resultsPath} is not valid JSON (${err.message}) — leaving it alone`);
        return;
    }

    const {added, results} = backfillUnreportedSpecs(parsed, specs, {jobName: args['job-name']});
    if (!added.length) {
        console.log(`backfill-unreported-specs: all ${specs.length} assigned spec(s) reported`);
        return;
    }

    fs.writeFileSync(resultsPath, JSON.stringify(results));
    console.log(`backfill-unreported-specs: ${added.length}/${specs.length} assigned spec(s) never reported — marked failed:`);
    for (const spec of added) {
        console.log(`  - ${spec}`);
    }
}

if (require.main === module) {
    main();
}

module.exports = {backfillUnreportedSpecs, parseSpecList, reportedPaths};
