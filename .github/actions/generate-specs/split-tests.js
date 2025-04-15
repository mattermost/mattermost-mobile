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
  const specs = new Specs(searchPath, parallelism, deviceInfo);

  specs.findFiles();
  specs.generateSplits();
  specs.dumpSplits();
}

main();
