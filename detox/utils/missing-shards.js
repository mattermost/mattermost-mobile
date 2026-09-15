// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env -- CI utility script */

/**
 * Compare the generate-specs matrix against uploaded shard artifacts and emit
 * a GitHub Actions matrix of the runIds that never reported.
 *
 * A macos/ubuntu runner that dies in "Set up job" never reaches upload-artifact,
 * so generate-report used to inject a synthetic failed test. Re-running only
 * those shards is the actual fix; this helper is the selector.
 */

const fs = require('fs');

const {parseArgs} = require('./cli-args');

/**
 * A retry is only worth paying for when a *few* runners died. When most or all of them
 * produced nothing the cause is systemic — a missing build artifact, a broken runner
 * image, a provisioning failure — and re-running every shard just spends another full
 * matrix (20 macOS runners at up to 180 min each) to arrive at the same red. Above this
 * share of the matrix we leave the merge-jest-results stub to report the gap.
 */
const MAX_MISSING_SHARE = 0.25;

/**
 * @param {{include?: Array<{runId: number|string}>}} expectedSpecs
 * @param {string[]} artifactNames
 * @param {string} prefix  e.g. `ios-results-abc123-`
 * @param {number} [maxMissingShare]
 * @returns {{has_missing: boolean, missing_count: number, found_count: number, expected_count: number, skipped_reason: string, specs: {include: object[]}}}
 */
function missingShardMatrix(expectedSpecs, artifactNames, prefix, maxMissingShare = MAX_MISSING_SHARE) {
    const include = Array.isArray(expectedSpecs?.include) ? expectedSpecs.include : [];
    const foundIds = new Set();
    for (const name of artifactNames) {
        if (typeof name !== 'string' || !name.startsWith(prefix)) {
            continue;
        }
        const suffix = name.slice(prefix.length);
        if (!suffix || suffix.includes('/')) {
            continue;
        }
        foundIds.add(suffix);
    }

    const missing = include.filter((row) => {
        const id = String(row?.runId ?? '');
        return id !== '' && !foundIds.has(id);
    });

    const overCap = include.length > 0 && missing.length > Math.ceil(include.length * maxMissingShare);
    const skippedReason = overCap ?
        `${missing.length}/${include.length} shards missing exceeds the ${Math.round(maxMissingShare * 100)}% retry cap — treating as a systemic failure, not runner deaths` :
        '';

    return {
        has_missing: missing.length > 0 && !overCap,
        missing_count: missing.length,
        found_count: include.length - missing.length,
        expected_count: include.length,
        skipped_reason: skippedReason,
        specs: {include: overCap ? [] : missing},
    };
}

function readNameList(text) {
    return text.
        split(/\r?\n/).
        map((line) => line.trim()).
        filter(Boolean);
}

function main() {
    const args = parseArgs(process.argv);
    const prefix = args.prefix;
    const expectedPath = args['expected-specs'];
    const namesPath = args['artifact-names'];
    const outputPath = args.output;
    if (!prefix || !expectedPath || !namesPath || !outputPath) {
        console.error('missing-shards: --prefix, --expected-specs, --artifact-names, and --output are required');
        process.exit(1);
    }

    const expectedSpecs = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
    const artifactNames = readNameList(fs.readFileSync(namesPath, 'utf8'));
    const result = missingShardMatrix(expectedSpecs, artifactNames, prefix);

    fs.writeFileSync(outputPath, JSON.stringify(result));
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, [
            `has_missing=${result.has_missing}`,
            `missing_count=${result.missing_count}`,
            `found_count=${result.found_count}`,
            `expected_count=${result.expected_count}`,
            `missing_specs=${JSON.stringify(result.specs)}`,
            '',
        ].join('\n'));
    }
    console.log(`missing-shards: expected=${result.expected_count} found=${result.found_count} missing=${result.missing_count} prefix=${prefix}`);
    if (result.skipped_reason) {
        console.log(`missing-shards: no retry — ${result.skipped_reason}`);
    }
}

if (require.main === module) {
    main();
}

module.exports = {missingShardMatrix, readNameList};
