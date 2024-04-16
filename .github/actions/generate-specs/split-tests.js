const fs = require('fs');
const path = require('path');

class DeviceInfo {
  constructor(device, osVersion) {
    this.device = device;
    this.osVersion = osVersion;
  }
}

class SpecGroup {
  constructor(runId, specs, deviceInfo) {
    this.runId = runId;
    this.specs = specs;
    this.device = deviceInfo.device;
    this.osVersion = deviceInfo.osVersion;
  }
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
    const chunkSize = Math.ceil(this.rawFiles.length / this.parallelism);
    let runNo = 1;

    for (let i = 0; i < this.rawFiles.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, this.rawFiles.length);
      const fileGroup = this.rawFiles.slice(i, end).join(' ');
      const specFileGroup = new SpecGroup(runNo.toString(), fileGroup, this.deviceInfo);
      this.groupedFiles.push(specFileGroup);

      if (end === this.rawFiles.length) {
        break;
      }

      runNo++;
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
  const device = process.env.DEVICE;
  const osVersion = process.env.OS_VERSION;

  const deviceInfo = new DeviceInfo(device, osVersion);
  const specs = new Specs(searchPath, parallelism, deviceInfo);

  specs.findFiles();
  specs.generateSplits();
  specs.dumpSplits();
}

main();
