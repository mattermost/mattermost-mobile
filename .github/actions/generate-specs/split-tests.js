const fs = require('fs');
const path = require('path');

// Diagnostics go to stderr: the action captures stdout as the matrix JSON
// (`node split-tests.js | tee output.json`).
const logDiag = (msg) => console.error(msg);

class DeviceInfo {
  constructor(deviceName, deviceOsVersion) {
    this.deviceName = deviceName;
    this.deviceOsVersion = deviceOsVersion;
  }
}

class SpecGroup {
  constructor(runId, specs, deviceInfo) {
    this.runId = runId;
    this.specs = specs;
    this.deviceName = deviceInfo.deviceName;
    this.deviceOsVersion = deviceInfo.deviceOsVersion;
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

class Specs {
  constructor(searchPath, parallelism, deviceInfo, durations = {}) {
    this.searchPath = searchPath;
    this.parallelism = parallelism;
    this.rawFiles = [];
    this.groupedFiles = [];
    this.deviceInfo = deviceInfo;
    this.durations = durations;
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
          this.rawFiles.push(fullPath);
        }
      });
    };

    walkSync(dirPath);
  }

  generateSplits() {
    const packed = packByDuration(this.rawFiles, this.parallelism, this.durations);
    if (packed) {
      const unknown = this.rawFiles.filter((f) => !(this.durations[f] > 0)).length;
      logDiag(`split-tests: duration-aware split of ${this.rawFiles.length} spec(s) across ${packed.length} shard(s) (${unknown} without history)`);
      packed.forEach((bin, i) => {
        logDiag(`  shard ${i + 1}: ${bin.files.length} spec(s), est ${Math.round(bin.total / 1000)}s`);
        // Alphabetical within a shard keeps the run log readable; order does not
        // affect makespan.
        const fileGroup = [...bin.files].sort().join(' ');
        this.groupedFiles.push(new SpecGroup(String(i + 1), fileGroup, this.deviceInfo));
      });
      return;
    }

    logDiag(`split-tests: no duration history — even split of ${this.rawFiles.length} spec(s) across ${this.parallelism} shard(s)`);
    this.generateEvenSplits();
  }

  /** Original alphabetical equal-count split; the fallback when no timings exist. */
  generateEvenSplits() {
    const chunkSize = Math.floor(this.rawFiles.length / this.parallelism);
    let remainder = this.rawFiles.length % this.parallelism;
    let runNo = 1;
    let start = 0;

    for (let i = 0; i < this.parallelism; i++) {
      let end = start + chunkSize + (remainder > 0 ? 1 : 0);
      const fileGroup = this.rawFiles.slice(start, end).join(' ');
      const specFileGroup = new SpecGroup(runNo.toString(), fileGroup, this.deviceInfo);
      this.groupedFiles.push(specFileGroup);

      start = end;
      runNo++;
      if (remainder > 0) {
        remainder--;
      }
    }
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
  const specs = new Specs(searchPath, parallelism, deviceInfo, durations);

  specs.findFiles();
  specs.generateSplits();
  specs.dumpSplits();
}

if (require.main === module) {
  main();
}

module.exports = {Specs, DeviceInfo, SpecGroup, loadDurations, packByDuration};
