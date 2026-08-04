const fs = require('fs');
const path = require('path');

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

class Specs {
  constructor(searchPath, parallelism, deviceInfo) {
    this.searchPath = searchPath;
    this.parallelism = parallelism;
    this.rawFiles = [];
    this.groupedFiles = [];
    this.deviceInfo = deviceInfo;
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
   * Split the discovered specs into one group per shard.
   *
   * mm_blocks_* specs get their own shard: they need a public Cloudflare tunnel, and a
   * tunnel setup failure stalls the whole shard, so isolating them keeps unrelated specs
   * from being skipped alongside them.
   */
  generateSplits() {
    let mmBlocksFiles = this.rawFiles.filter(isMmBlocksSpec);
    let otherFiles = this.rawFiles.filter((f) => !isMmBlocksSpec(f));

    // Isolating mm_blocks costs a whole shard, so it needs parallelism >= 2 once there
    // are other specs to separate it from. At parallelism=1 merge instead, otherwise we
    // emit two matrix jobs for a one-job configuration.
    if (mmBlocksFiles.length > 0 && otherFiles.length > 0 && this.parallelism < 2) {
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
      this.parallelism - (mmBlocksFiles.length > 0 ? 1 : 0),
    );

    if (otherFiles.length === 0) {
      return;
    }

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
  const specs = new Specs(searchPath, parallelism, deviceInfo);

  specs.findFiles();
  if (specs.rawFiles.length < parallelism) {
    console.error(
      `Warning: ${specs.rawFiles.length} spec(s) < parallelism ${parallelism}; some shards will be empty`,
    );
  }
  specs.generateSplits();
  specs.dumpSplits();
}

main();
