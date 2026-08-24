// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {test} = require('node:test');

const {DeviceInfo, Specs, parseSpecList} = require('./split-tests');

function deviceInfo() {
    return new DeviceInfo('iPhone 17 Pro', 'iOS 26.2');
}

test('parseSpecList normalizes and deduplicates while preserving order', () => {
    const absolute = path.join(process.cwd(), 'detox/e2e/test/a.e2e.ts');
    assert.deepEqual(
        parseSpecList(`${absolute}\n detox/e2e/test/b.e2e.ts detox/e2e/test/a.e2e.ts`),
        ['detox/e2e/test/a.e2e.ts', 'detox/e2e/test/b.e2e.ts'],
    );
    assert.deepEqual(parseSpecList('  \n '), []);
});

test('an explicit spec list skips discovery and rejects missing files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'split-tests-'));
    const spec = path.join(dir, 'real.e2e.ts');
    fs.writeFileSync(spec, '');

    const specs = new Specs('detox/e2e/test', 1, deviceInfo(), {}, spec);
    let walked = false;
    specs.findFiles = () => {
        walked = true;
    };
    specs.collectFiles();

    assert.equal(walked, false);
    assert.deepEqual(specs.rawFiles, [path.relative(process.cwd(), spec)]);
    assert.throws(
        () => new Specs('detox/e2e/test', 1, deviceInfo(), {}, 'missing.e2e.ts').collectFiles(),
        /do not exist/,
    );
    fs.rmSync(dir, {recursive: true, force: true});
});

test('an empty spec list falls back to discovery', () => {
    const specs = new Specs('detox/e2e/test', 1, deviceInfo(), {}, '   ');
    let walked = false;
    specs.findFiles = () => {
        walked = true;
    };
    specs.collectFiles();

    assert.equal(walked, true);
});

test('one targeted spec produces one shard', () => {
    const specs = new Specs('detox/e2e/test', 1, deviceInfo());
    specs.rawFiles = ['a.e2e.ts'];
    specs.generateSplits();

    assert.equal(specs.groupedFiles.length, 1);
    assert.equal(specs.groupedFiles[0].specs, 'a.e2e.ts');
});

test('mm_blocks shares the only shard at parallelism one', () => {
    const specs = new Specs('detox/e2e/test', 1, deviceInfo());
    specs.rawFiles = ['mm_blocks_a.e2e.ts', 'b.e2e.ts'];
    specs.generateSplits();

    assert.equal(specs.groupedFiles.length, 1);
    assert.equal(specs.groupedFiles[0].specs, 'mm_blocks_a.e2e.ts b.e2e.ts');
});
