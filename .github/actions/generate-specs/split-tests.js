const fs = require('fs');
const path = require('path');

// Diagnostics go to stderr: the action captures stdout as the matrix JSON
// (`node split-tests.js | tee output.json`).
const logDiag = (msg) => console.error(msg);

const DEFAULT_MUTATION_MANIFEST = 'detox/e2e/server_mutation_specs.json';

class DeviceInfo {
  constructor(deviceName, deviceOsVersion) {
    this.deviceName = deviceName;
    this.deviceOsVersion = deviceOsVersion;
  }
}

class SpecGroup {
  // role: 'pool' shares the parallel test servers; 'mutation' owns one server target.
  constructor(runId, specs, deviceInfo, {role = 'pool', target = 'A'} = {}) {
    this.runId = runId;
    this.specs = specs;
    this.deviceName = deviceInfo.deviceName;
    this.deviceOsVersion = deviceInfo.deviceOsVersion;
    this.role = role;
    this.target = target;
  }
}

/**
 * Load a {specPath: ms} manifest produced by detox/utils/spec-durations.js.
 *
 * Returns {} for a missing, unreadable or malformed file. Sharding must never
 * break because the manifest is absent — that is the normal state on the first
 * run, on an S3 miss, and for any suite that has no history yet.
 */
function loadDurations(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {};
  }
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const durations = (raw && typeof raw === 'object') ? (raw.durations || raw) : null;
    if (!durations || typeof durations !== 'object') {
      return {};
    }
    const out = {};
    for (const [spec, ms] of Object.entries(durations)) {
      const n = Number(ms);
      if (Number.isFinite(n) && n > 0) {
        out[spec] = n;
      }
    }
    return out;
  } catch (err) {
    logDiag(`split-tests: ignoring duration manifest ${filePath}: ${err.message}`);
    return {};
  }
}

/**
 * Pack specs into shards by recorded duration, longest first (LPT).
 *
 * Equal-*count* splitting makes total wall-clock hostage to whichever shard
 * happens to collect the slow specs — with specs ranging 5-15 min, the unluckiest
 * shard sets the bill for every runner. LPT greedy is a 4/3-approximation of the
 * optimal makespan and needs nothing but the previous run's timings.
 *
 * Specs with no recorded duration are costed at the median of the known ones, so
 * new specs are neither ignored nor allowed to dominate.
 *
 * @returns {{total: number, files: string[]}[]|null} null when there is no
 *   duration data at all, which tells the caller to use the even split.
 */
function packByDuration(files, parallelism, durations) {
  const known = files.map((f) => durations[f]).filter((d) => typeof d === 'number' && d > 0);
  if (known.length === 0) {
    return null;
  }

  const sorted = [...known].sort((a, b) => a - b);
  const medianCost = sorted[Math.floor(sorted.length / 2)];

  // Deterministic: cost desc, then path asc, so the same inputs always produce
  // the same matrix (re-runs stay comparable).
  const items = files
    .map((file) => ({file, cost: durations[file] > 0 ? durations[file] : medianCost}))
    .sort((a, b) => (b.cost - a.cost) || a.file.localeCompare(b.file));

  // A non-finite parallelism (unset/garbage PARALLELISM) must not produce zero
  // bins — that would throw here instead of silently emitting an empty matrix.
  const binCount = Number.isFinite(parallelism) && parallelism >= 1 ? Math.floor(parallelism) : 1;
  const bins = Array.from({length: binCount}, () => ({total: 0, files: []}));
  for (const item of items) {
    // Least-loaded bin; ties resolve to the lowest index.
    let target = bins[0];
    for (const bin of bins) {
      if (bin.total < target.total) {
        target = bin;
      }
    }
    target.files.push(item.file);
    target.total += item.cost;
  }

  // Drop empty bins rather than booting a runner with nothing to run.
  return bins.filter((bin) => bin.files.length > 0);
}

function toRepoRelative(filePath) {
  const repoRoot = process.cwd();
  if (path.isAbsolute(filePath)) {
    return path.relative(repoRoot, filePath);
  }
  return filePath;
}

function isMmBlocksSpec(filePath) {
  return path.basename(filePath).includes('mm_blocks_');
}

/**
 * Load the mutation manifest. Missing: nothing is isolated (warned). Malformed: throws,
 * because a silently dropped entry would run a mutating spec on a pool server.
 */
function loadMutationManifest(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    logDiag(`Warning: mutation manifest ${filePath} not found; no specs are isolated`);
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  if (!raw || !Array.isArray(raw.mutation)) {
    throw new Error(`${filePath}: expected a "mutation" array`);
  }
  raw.mutation.forEach((entry, i) => {
    const nonEmpty = (v) => typeof v === 'string' && v.length > 0;
    const ok = Boolean(entry) && nonEmpty(entry.spec) && nonEmpty(entry.target) &&
      (entry.iosTarget === undefined || nonEmpty(entry.iosTarget));
    if (!ok) {
      throw new Error(`${filePath}: mutation[${i}] needs non-empty "spec" and "target" strings`);
    }
  });
  return raw.mutation;
}

/** MUTATION_TARGETS is a comma list, e.g. "B,site3"; empty means single-server. */
function parseTargets(value) {
  return String(value || '').split(',').map((t) => t.trim()).filter(Boolean);
}

/**
 * Map a manifest target onto a target this run has a server for. A site3 spec may fall back
 * to the isolated B; nothing moves onto the shared site3. No targets at all means server A,
 * which planMutation rejects when any mutation spec is selected.
 */
function resolveMutationTarget(wanted, available) {
  if (available.length === 0) {
    return 'A';
  }
  if (available.includes(wanted)) {
    return wanted;
  }
  if (wanted === 'site3' && available.includes('B')) {
    return 'B';
  }
  throw new Error(`mutation target ${wanted} is not available (have: ${available.join(', ')})`);
}


class Specs {
  constructor(searchPath, parallelism, deviceInfo, durations = {}, mutation = {}) {
    this.searchPath = searchPath;
    this.parallelism = parallelism;
    this.rawFiles = [];
    this.groupedFiles = [];
    this.deviceInfo = deviceInfo;
    this.durations = durations;
    this.mutation = {
      entries: mutation.entries || [],
      targets: mutation.targets || [],
      platform: mutation.platform || '',
    };
  }

  findFiles() {
    const dirPath = path.join(this.searchPath);

    const fileRegex = /\.e2e\.ts$/;

    const walkSync = (currentPath) => {
      const files = fs.readdirSync(currentPath);

      files.forEach((file) => {
        const filePath = path.join(currentPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          // iPad tests are iOS-only; exclude from Android and other non-iPad runs.
          // They run in their own isolated job with search_path pointing directly at ipad/.
          if (file === 'ipad') {
            return;
          }
          walkSync(filePath);
        } else if (fileRegex.test(filePath)) {
          const relativeFilePath = filePath.replace(dirPath + '/', '');
          const fullPath = path.join(this.searchPath, relativeFilePath);
          this.rawFiles.push(toRepoRelative(fullPath));
        }
      });
    };

    walkSync(dirPath);
  }

  /**
   * Pool shards first (mm_blocks is runId 1 when present), then one mutation shard per
   * target. Mutation shards count toward PARALLELISM; the pool keeps at least one shard.
   */
  generateSplits() {
    const mutationGroups = this.planMutation();
    const mutationFiles = new Set(mutationGroups.flatMap((g) => g.files));
    const poolFiles = this.rawFiles.filter((f) => !mutationFiles.has(f));

    const parallelism = Number.isFinite(this.parallelism) && this.parallelism >= 1
      ? Math.floor(this.parallelism)
      : 1;
    const poolParallelism = Math.max(1, parallelism - mutationGroups.length);
    const nextRunNo = this.generatePoolSplits(poolFiles, poolParallelism);

    mutationGroups.forEach((group, i) => {
      // One shard per target: specs on the same server must not run concurrently.
      const runId = (nextRunNo + i).toString();
      this.groupedFiles.push(new SpecGroup(runId, group.files.join(' '), this.deviceInfo, {role: 'mutation', target: group.target}));
      logDiag(`split-tests: mutation shard ${runId} on target ${group.target}: ${group.files.length} spec(s)`);
    });
  }

  /**
   * Group manifest specs by the server they must run on. Specs not found in the search
   * path are skipped; the rest are returned as {target, files} sorted for determinism.
   */
  planMutation() {
    const available = this.mutation.targets;
    const foundByNormalized = new Map(this.rawFiles.map((f) => [path.normalize(f), f]));
    const byTarget = new Map();

    for (const entry of this.mutation.entries) {
      const file = foundByNormalized.get(path.normalize(entry.spec));
      if (!file) {
        logDiag(`Warning: mutation spec not found in search path, ignored: ${entry.spec}`);
        continue;
      }
      const wanted = this.mutation.platform === 'ios' && entry.iosTarget ? entry.iosTarget : entry.target;
      const target = resolveMutationTarget(wanted, available);
      if (available.length > 0 && target !== wanted) {
        logDiag(`split-tests: ${file} wants target ${wanted}, not available; running on ${target}`);
      }
      if (!byTarget.has(target)) {
        byTarget.set(target, new Set());
      }
      byTarget.get(target).add(file);
    }

    const total = [...byTarget.values()].reduce((n, set) => n + set.size, 0);
    if (total > 0 && available.length === 0) {
      throw new Error(`${total} server mutation spec(s) selected but there is no second test server; they would change state on the pool server`);
    }

    return [...byTarget.keys()].sort().map((target) => ({
      target,
      files: [...byTarget.get(target)].sort(),
    }));
  }

  /**
   * Split pool specs across `parallelism` shards. Returns the next free runId.
   * mm_blocks_* specs get their own shard: they need a public Cloudflare tunnel, and a
   * tunnel setup failure stalls the whole shard, so isolating them keeps unrelated specs
   * from being skipped alongside them. That isolation is a correctness constraint, so it
   * is applied before any duration packing — the remaining specs are then packed by
   * recorded duration across the shards that are left.
   */
  generatePoolSplits(poolFiles, parallelism) {
    let mmBlocksFiles = poolFiles.filter(isMmBlocksSpec);
    let otherFiles = poolFiles.filter((f) => !isMmBlocksSpec(f));

    // Isolating mm_blocks costs a whole shard, so it needs parallelism >= 2 once there
    // are other specs to separate it from. At parallelism=1 merge instead, otherwise we
    // emit two matrix jobs for a one-job configuration.
    if (mmBlocksFiles.length > 0 && otherFiles.length > 0 && parallelism < 2) {
      otherFiles = [...mmBlocksFiles, ...otherFiles];
      mmBlocksFiles = [];
    }

    let runNo = 1;
    if (mmBlocksFiles.length > 0) {
      this.groupedFiles.push(
        new SpecGroup(runNo.toString(), mmBlocksFiles.join(' '), this.deviceInfo),
      );
      runNo += 1;
    }

    const restParallelism = Math.max(
      1,
      parallelism - (mmBlocksFiles.length > 0 ? 1 : 0),
    );

    if (otherFiles.length === 0) {
      return runNo;
    }

    const packed = packByDuration(otherFiles, restParallelism, this.durations);
    if (packed) {
      const unknown = otherFiles.filter((f) => !(this.durations[f] > 0)).length;
      logDiag(`split-tests: duration-aware split of ${otherFiles.length} spec(s) across ${packed.length} shard(s) (${unknown} without history)`);
      for (const bin of packed) {
        logDiag(`  shard ${runNo}: ${bin.files.length} spec(s), est ${Math.round(bin.total / 1000)}s`);
        // Alphabetical within a shard keeps the run log readable; order does not
        // affect makespan.
        this.groupedFiles.push(new SpecGroup(runNo.toString(), [...bin.files].sort().join(' '), this.deviceInfo));
        runNo += 1;
      }
      return runNo;
    }

    logDiag(`split-tests: no duration history — even split of ${otherFiles.length} spec(s) across ${restParallelism} shard(s)`);
    return this.generateEvenSplits(otherFiles, restParallelism, runNo);
  }

  /** Original alphabetical equal-count split; the fallback when no timings exist. */
  generateEvenSplits(otherFiles, restParallelism, startRunNo) {
    let runNo = startRunNo;
    const chunkSize = Math.floor(otherFiles.length / restParallelism);
    let remainder = otherFiles.length % restParallelism;
    let start = 0;

    for (let i = 0; i < restParallelism; i++) {
      const end = start + chunkSize + (remainder > 0 ? 1 : 0);
      const fileGroup = otherFiles.slice(start, end).join(' ');
      this.groupedFiles.push(new SpecGroup(runNo.toString(), fileGroup, this.deviceInfo));

      start = end;
      runNo += 1;
      if (remainder > 0) {
        remainder -= 1;
      }
    }
    return runNo;
  }

  dumpSplits() {
    const output = {
      include: this.groupedFiles,
    };

    console.log(JSON.stringify(output));
  }
}

function main() {
  const searchPath = process.env.SEARCH_PATH;
  const parallelism = parseInt(process.env.PARALLELISM, 10);
  const deviceName = process.env.DEVICE_NAME;
  const deviceOsVersion = process.env.DEVICE_OS_VERSION;
  const deviceInfo = new DeviceInfo(deviceName, deviceOsVersion);
  const durations = loadDurations(process.env.DURATIONS_FILE);
  const mutation = {
    entries: loadMutationManifest(process.env.MUTATION_MANIFEST || DEFAULT_MUTATION_MANIFEST),
    targets: parseTargets(process.env.MUTATION_TARGETS),
    platform: (process.env.PLATFORM || '').trim().toLowerCase(),
  };
  const specs = new Specs(searchPath, parallelism, deviceInfo, durations, mutation);

  specs.findFiles();
  if (specs.rawFiles.length < parallelism) {
    console.error(
      `Warning: ${specs.rawFiles.length} spec(s) < parallelism ${parallelism}; some shards will be empty`,
    );
  }
  specs.generateSplits();
  specs.dumpSplits();
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`::error::${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  Specs,
  DeviceInfo,
  SpecGroup,
  loadDurations,
  packByDuration,
  loadMutationManifest,
  parseTargets,
  resolveMutationTarget,
};
