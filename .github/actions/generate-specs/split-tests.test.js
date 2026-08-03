// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {test} = require('node:test');

const {Specs, parseSpecList} = require('./split-tests');

function deviceInfo() {
    return {deviceName: 'iPhone 17 Pro', deviceOsVersion: 'iOS 26.2'};
}

test('parseSpecList deduplicates while preserving order', () => {
    // A rerun list is built from failed test records, and several failures in one
    // spec file would otherwise run that file more than once in the same shard.
    const out = parseSpecList('a.e2e.ts b.e2e.ts a.e2e.ts');
    assert.deepEqual(out, ['a.e2e.ts', 'b.e2e.ts']);
});

test('parseSpecList accepts newlines and stray whitespace', () => {
    // Callers pass either a shell-friendly single line or a here-doc.
    assert.deepEqual(parseSpecList('  a.e2e.ts \n\n b.e2e.ts \n'), ['a.e2e.ts', 'b.e2e.ts']);
    assert.deepEqual(parseSpecList(''), []);
    assert.deepEqual(parseSpecList('   \n  '), []);
});

test('parseSpecList makes absolute paths repo-relative', () => {
    const abs = path.join(process.cwd(), 'detox/e2e/test/x.e2e.ts');
    assert.deepEqual(parseSpecList(abs), ['detox/e2e/test/x.e2e.ts']);
});

test('the same spec written two ways is still one spec', () => {
    // Deduplication used to key on the raw entry while emitting the normalized
    // one, so these two spellings both survived and the spec ran twice in a
    // single shard.
    const abs = path.join(process.cwd(), 'detox/e2e/test/x.e2e.ts');
    const out = parseSpecList(`${abs} detox/e2e/test/x.e2e.ts`);

    assert.deepEqual(out, ['detox/e2e/test/x.e2e.ts']);
    assert.equal(out.length, new Set(out).size, 'no spec may appear twice');
});

test('an explicit spec list skips discovery entirely', () => {
    // Discovery is skipped rather than filtered, so a spec deleted or moved since
    // the run under analysis surfaces as an error rather than silently shrinking
    // the rerun to nothing.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'splittests-'));
    const spec = path.join(dir, 'real.e2e.ts');
    fs.writeFileSync(spec, '');

    const specs = new Specs('detox/e2e/test', 1, deviceInfo(), spec);
    let walked = false;
    specs.findFiles = () => {
        walked = true;
    };
    specs.collectFiles();

    assert.equal(walked, false, 'an explicit list must not trigger a directory walk');
    assert.equal(specs.rawFiles.length, 1);
});

test('a spec list naming a missing file is an error, not an empty rerun', () => {
    // This is the gate between a valid targeted rerun and a silent no-op: an
    // empty rerun produces no evidence, and no evidence resolves red for the
    // wrong reason.
    const specs = new Specs('detox/e2e/test', 1, deviceInfo(), 'detox/e2e/test/does-not-exist.e2e.ts');
    assert.throws(() => specs.collectFiles(), /do not exist/);
});

test('an empty spec list falls back to discovery', () => {
    const specs = new Specs('detox/e2e/test', 1, deviceInfo(), '   ');
    let walked = false;
    specs.findFiles = () => {
        walked = true;
    };
    specs.collectFiles();

    assert.equal(walked, true);
});

test('one spec at parallelism 1 produces exactly one shard', () => {
    // The shape the triage smoke validation and every targeted rerun rely on.
    const specs = new Specs('detox/e2e/test', 1, deviceInfo(), '');
    specs.rawFiles = ['a.e2e.ts'];
    specs.generateSplits();

    assert.equal(specs.groupedFiles.length, 1);
    assert.equal(specs.groupedFiles[0].specs, 'a.e2e.ts');
});

test('mm_blocks is not isolated into its own shard at parallelism 1', () => {
    // Isolating it costs a whole shard, which at parallelism 1 would emit two
    // matrix jobs for a one-job configuration.
    const specs = new Specs('detox/e2e/test', 1, deviceInfo(), '');
    specs.rawFiles = ['mm_blocks_a.e2e.ts', 'b.e2e.ts'];
    specs.generateSplits();

    assert.equal(specs.groupedFiles.length, 1);

    // And the merge must keep both specs — a shard count of 1 would also be
    // satisfied by silently dropping the mm_blocks spec.
    assert.equal(specs.groupedFiles[0].specs, 'mm_blocks_a.e2e.ts b.e2e.ts');
});
