// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/*
 * Split detox .e2e.ts files across shards using Longest-Processing-Time (LPT)
 * bin-packing on historical per-spec durations.
 *
 * Why LPT, not equal-count chunking:
 *   The previous implementation sliced files alphabetically into equal-count
 *   chunks. Test files vary 10× in runtime (a 60s spec vs a 600s spec), so the
 *   slowest shard ran 2-3× longer than the fastest. Wall-clock = slowest shard.
 *
 * Algorithm:
 *   1. Walk SEARCH_PATH for *.e2e.ts (excluding ipad/, which runs separately).
 *   2. Load historical durations from durations file (env: DURATIONS_FILE,
 *      default: detox/.shard-durations.json). Missing entries fall back to
 *      the median of known entries (or DEFAULT_DURATION if file is empty).
 *   3. Sort specs by duration DESC.
 *   4. For each spec, assign to the shard whose current total duration is
 *      smallest. (Greedy LPT — guaranteed worst case ≤ (4/3 − 1/(3m))×optimal.)
 *   5. Emit GitHub Actions matrix include[] in the existing schema:
 *      { runId, specs, deviceName, deviceOsVersion }.
 *
 * The durations file is treated as a CACHE, not a committed artifact:
 *   CI restores it from actions/cache before this step runs and saves a new
 *   version (parsed from junit reports) after each detox run. A cache miss
 *   degrades cleanly to median/default and the resulting shard split is still
 *   correct (just may be more skewed than optimal until the next run).
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_DURATION_SECONDS = 180; // 3 min — used when no historical data exists at all

function findSpecs(searchPath) {
    const specs = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir)) {
            const full = path.join(dir, entry);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
                // iPad tests are iOS-only and run in their own isolated job.
                if (entry === 'ipad') {
                    continue;
                }
                walk(full);
            } else if (/\.e2e\.ts$/.test(entry)) {
                specs.push(full);
            }
        }
    };
    walk(searchPath);
    return specs;
}

function loadDurations(durationsFile) {
    if (!durationsFile || !fs.existsSync(durationsFile)) {
        return {};
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(durationsFile, 'utf8'));
        // Tolerate either { "path": seconds } or
        // { "durations": { "path": seconds }, "updated_at": "..." }
        return parsed.durations || parsed;
    } catch (err) {
        process.stderr.write(`[split-tests] Failed to parse ${durationsFile}: ${err.message}. Falling back to default.\n`);
        return {};
    }
}

function median(values) {
    if (values.length === 0) {
        return DEFAULT_DURATION_SECONDS;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function packLPT(specs, parallelism, durations) {
    const knownValues = Object.values(durations).filter((d) => typeof d === 'number' && d > 0);
    const fallback = median(knownValues);

    // Resolve duration for each spec. Specs are stored in the durations file
    // by their path relative to repo root (or by basename — try both).
    const items = specs.map((spec) => {
        const direct = durations[spec];
        const basename = durations[path.basename(spec)];
        const duration = direct ?? basename ?? fallback;
        return {spec, duration};
    });

    // Sort descending so the biggest specs get placed first.
    items.sort((a, b) => b.duration - a.duration);

    // Initialize shards.
    const shards = Array.from({length: parallelism}, (_, i) => ({
        runId: String(i + 1),
        specs: [],
        total: 0,
    }));

    // Greedy: each item goes to the currently-shortest shard.
    for (const item of items) {
        let smallest = shards[0];
        for (const shard of shards) {
            if (shard.total < smallest.total) {
                smallest = shard;
            }
        }
        smallest.specs.push(item.spec);
        smallest.total += item.duration;
    }

    return shards;
}

function main() {
    const searchPath = process.env.SEARCH_PATH;
    const parallelism = parseInt(process.env.PARALLELISM, 10);
    const deviceName = process.env.DEVICE_NAME;
    const deviceOsVersion = process.env.DEVICE_OS_VERSION;
    const durationsFile = process.env.DURATIONS_FILE || path.resolve('detox/.shard-durations.json');

    if (!searchPath || !parallelism) {
        process.stderr.write('[split-tests] SEARCH_PATH and PARALLELISM env vars are required.\n');
        process.exit(1);
    }

    const specs = findSpecs(searchPath);
    const durations = loadDurations(durationsFile);
    const shards = packLPT(specs, parallelism, durations);

    // Diagnostics to stderr so they don't pollute the JSON output captured by
    // the action's `tee output.json` step.
    const totals = shards.map((s) => Math.round(s.total));
    const knownCount = specs.filter((s) => durations[s] != null || durations[path.basename(s)] != null).length;
    process.stderr.write(
        `[split-tests] specs=${specs.length} shards=${parallelism} durations_known=${knownCount}/${specs.length} ` +
        `shard_totals(seconds)=[${totals.join(',')}] max=${Math.max(...totals)} min=${Math.min(...totals)}\n`,
    );

    const output = {
        include: shards.map((s) => ({
            runId: s.runId,
            specs: s.specs.join(' '),
            deviceName,
            deviceOsVersion,
        })),
    };

    process.stdout.write(JSON.stringify(output));
}

main();
