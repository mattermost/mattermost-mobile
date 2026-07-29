// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const fs = require('fs');
const os = require('os');
const path = require('path');

const {extractDurations, mergeDurations, suiteDuration} = require('../../../detox/utils/spec-durations');

const {DeviceInfo, Specs, loadDurations, packByDuration} = require('./split-tests');

// generateSplits() without touching the filesystem: findFiles() is what walks the tree.
const split = (files, parallelism, durations = {}) => {
    const s = new Specs('detox/e2e/test', parallelism, new DeviceInfo('iPhone', 'iOS 26.2'), durations);
    s.rawFiles = files;
    s.generateSplits();
    return s.groupedFiles.map((g) => g.specs.split(' ').filter(Boolean));
};

const shardTotals = (bins) => bins.map((bin) => bin.total);

describe('packByDuration', () => {
    const specs = ['a.e2e.ts', 'b.e2e.ts', 'c.e2e.ts', 'd.e2e.ts'];

    it('should return null when no spec has a recorded duration so the caller falls back to the even split', () => {
        expect(packByDuration(specs, 2, {})).toBeNull();
        expect(packByDuration(specs, 2, {'a.e2e.ts': 0})).toBeNull();
    });

    it('should balance shards by duration rather than by spec count', () => {
        const durations = {'a.e2e.ts': 900, 'b.e2e.ts': 100, 'c.e2e.ts': 100, 'd.e2e.ts': 100};
        const bins = packByDuration(specs, 2, durations);

        expect(bins).toHaveLength(2);
        expect(shardTotals(bins)).toEqual([900, 300]);

        // The equal-count split would have paired the 900ms spec with another,
        // making the slow shard 1000ms; balancing by cost keeps the makespan at 900.
        expect(bins[0].files).toEqual(['a.e2e.ts']);
        expect(bins[1].files.sort()).toEqual(['b.e2e.ts', 'c.e2e.ts', 'd.e2e.ts']);
    });

    it('should reduce the makespan versus an equal-count split on a skewed suite', () => {
        const skewed = {'a.e2e.ts': 600, 'b.e2e.ts': 500, 'c.e2e.ts': 100, 'd.e2e.ts': 100};
        const bins = packByDuration(specs, 2, skewed);

        // Alphabetical equal-count would be [a,b]=1100 vs [c,d]=200.
        expect(Math.max(...shardTotals(bins))).toBe(700);
    });

    it('should cost specs with no history at the median of the known ones', () => {
        const durations = {'a.e2e.ts': 100, 'b.e2e.ts': 200, 'c.e2e.ts': 300};
        const bins = packByDuration(specs, 4, durations);

        const dShard = bins.find((bin) => bin.files.includes('d.e2e.ts'));
        expect(dShard.total).toBe(200);
    });

    it('should drop empty shards instead of scheduling a runner with nothing to run', () => {
        const bins = packByDuration(['a.e2e.ts'], 4, {'a.e2e.ts': 100});

        expect(bins).toHaveLength(1);
        expect(bins[0].files).toEqual(['a.e2e.ts']);
    });

    it('should fall back to a single shard rather than throwing on a non-finite parallelism', () => {
        const durations = {'a.e2e.ts': 100, 'b.e2e.ts': 200, 'c.e2e.ts': 300, 'd.e2e.ts': 400};

        for (const bad of [Number.NaN, 0, -3, undefined]) {
            const bins = packByDuration(specs, bad, durations);
            expect(bins).toHaveLength(1);
            expect(bins[0].files.sort()).toEqual(specs);
        }
    });

    it('should place every spec exactly once', () => {
        const durations = {'a.e2e.ts': 30, 'b.e2e.ts': 700, 'c.e2e.ts': 120, 'd.e2e.ts': 450};
        const bins = packByDuration(specs, 3, durations);

        expect(bins.flatMap((bin) => bin.files).sort()).toEqual(specs);
    });

    it('should be deterministic for identical inputs including ties', () => {
        const ties = {'a.e2e.ts': 100, 'b.e2e.ts': 100, 'c.e2e.ts': 100, 'd.e2e.ts': 100};

        expect(packByDuration(specs, 2, ties)).toEqual(packByDuration(specs, 2, ties));
    });
});

describe('generateSplits — mm_blocks isolation vs duration packing', () => {
    const mm = 'detox/e2e/test/mm_blocks_tunnel.e2e.ts';
    const others = ['detox/e2e/test/a.e2e.ts', 'detox/e2e/test/b.e2e.ts', 'detox/e2e/test/c.e2e.ts'];
    const durations = {
        [mm]: 600,
        'detox/e2e/test/a.e2e.ts': 900,
        'detox/e2e/test/b.e2e.ts': 100,
        'detox/e2e/test/c.e2e.ts': 100,
    };

    it('should keep mm_blocks in its own shard even when duration packing is active', () => {
        const groups = split([mm, ...others], 3, durations);

        // mm_blocks needs a Cloudflare tunnel; a tunnel failure must not take
        // unrelated specs down with it, so it must never be packed alongside them.
        expect(groups[0]).toEqual([mm]);
        expect(groups.slice(1).flat().sort()).toEqual(others);
    });

    it('should pack the remaining specs by duration across the shards left over', () => {
        const groups = split([mm, ...others], 3, durations);

        // 2 shards remain for a=900, b=100, c=100 -> [a] and [b,c], not an even 2/1 count split.
        expect(groups).toHaveLength(3);
        expect(groups[1]).toEqual(['detox/e2e/test/a.e2e.ts']);
        expect(groups[2]).toEqual(['detox/e2e/test/b.e2e.ts', 'detox/e2e/test/c.e2e.ts']);
    });

    it('should number shards contiguously from 1 across the mm_blocks and packed shards', () => {
        const s = new Specs('detox/e2e/test', 3, new DeviceInfo('iPhone', 'iOS 26.2'), durations);
        s.rawFiles = [mm, ...others];
        s.generateSplits();

        expect(s.groupedFiles.map((g) => g.runId)).toEqual(['1', '2', '3']);
    });

    it('should merge mm_blocks into the single shard at parallelism 1', () => {
        const groups = split([mm, ...others], 1, durations);

        expect(groups).toHaveLength(1);
        expect(groups[0].sort()).toEqual([mm, ...others].sort());
    });

    it('should still isolate mm_blocks when there is no duration history', () => {
        const groups = split([mm, ...others], 3, {});

        expect(groups[0]).toEqual([mm]);
        expect(groups.slice(1).flat().sort()).toEqual(others);
    });

    it('should emit a single shard when mm_blocks are the only specs', () => {
        const groups = split([mm], 3, durations);

        expect(groups).toEqual([[mm]]);
    });
});

describe('loadDurations', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'split-tests-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    it('should return an empty map for a missing file', () => {
        expect(loadDurations(path.join(tmpDir, 'nope.json'))).toEqual({});
    });

    it('should return an empty map for malformed JSON instead of throwing', () => {
        const file = path.join(tmpDir, 'bad.json');
        fs.writeFileSync(file, '{not json');

        expect(loadDurations(file)).toEqual({});
    });

    it('should drop non-positive and non-numeric durations', () => {
        const file = path.join(tmpDir, 'manifest.json');
        fs.writeFileSync(file, JSON.stringify({durations: {'a.e2e.ts': 120, 'b.e2e.ts': 0, 'c.e2e.ts': 'slow', 'd.e2e.ts': -5}}));

        expect(loadDurations(file)).toEqual({'a.e2e.ts': 120});
    });
});

describe('suiteDuration', () => {
    it('should prefer suite wall-clock because that is what the shard pays', () => {
        const suite = {
            startTime: 1000,
            endTime: 9000,
            assertionResults: [{duration: 10}],
        };

        expect(suiteDuration(suite)).toBe(8000);
    });

    it('should fall back to the sum of case durations when wall-clock is unusable', () => {
        expect(suiteDuration({assertionResults: [{duration: 10}, {duration: 25}]})).toBe(35);
        expect(suiteDuration({startTime: 9000, endTime: 1000, assertionResults: [{duration: 7}]})).toBe(7);
    });

    it('should return null when nothing usable is present', () => {
        expect(suiteDuration({assertionResults: []})).toBeNull();
        expect(suiteDuration({})).toBeNull();
    });
});

describe('extractDurations', () => {
    let tmpDir;

    const writeReport = (name, report) => {
        const file = path.join(tmpDir, name);
        fs.writeFileSync(file, JSON.stringify(report));
        return file;
    };

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-durations-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    it('should key durations by repo-relative spec path', () => {
        const file = writeReport('one.json', {
            testResults: [{name: '/work/mattermost-mobile/mattermost-mobile/detox/e2e/test/a.e2e.ts', startTime: 0, endTime: 4200}],
        });

        expect(extractDurations([file])).toEqual({'detox/e2e/test/a.e2e.ts': 4200});
    });

    it('should keep the longest observation when shards disagree', () => {
        const first = writeReport('first.json', {testResults: [{name: 'detox/e2e/test/a.e2e.ts', startTime: 0, endTime: 1000}]});
        const second = writeReport('second.json', {testResults: [{name: 'detox/e2e/test/a.e2e.ts', startTime: 0, endTime: 7000}]});

        expect(extractDurations([first, second])).toEqual({'detox/e2e/test/a.e2e.ts': 7000});
        expect(extractDurations([second, first])).toEqual({'detox/e2e/test/a.e2e.ts': 7000});
    });

    it('should skip an unreadable report rather than failing the whole extraction', () => {
        const good = writeReport('good.json', {testResults: [{name: 'detox/e2e/test/a.e2e.ts', startTime: 0, endTime: 500}]});
        const bad = path.join(tmpDir, 'missing.json');

        expect(extractDurations([bad, good])).toEqual({'detox/e2e/test/a.e2e.ts': 500});
    });
});

describe('mergeDurations', () => {
    it('should smooth a new observation against history so one slow run cannot dominate', () => {
        expect(mergeDurations({'a.e2e.ts': 1000}, {'a.e2e.ts': 2000}, 0.5)).toEqual({'a.e2e.ts': 1500});
    });

    it('should take a first observation as-is', () => {
        expect(mergeDurations({}, {'a.e2e.ts': 2000}, 0.5)).toEqual({'a.e2e.ts': 2000});
    });

    it('should preserve history for specs this run did not exercise', () => {
        const merged = mergeDurations({'a.e2e.ts': 1000, 'b.e2e.ts': 4000}, {'a.e2e.ts': 1000}, 0.5);

        expect(merged).toEqual({'a.e2e.ts': 1000, 'b.e2e.ts': 4000});
    });
});
