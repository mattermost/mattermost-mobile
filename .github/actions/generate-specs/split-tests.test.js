// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const fs = require('fs');
const os = require('os');
const path = require('path');

const {extractDurations, mergeDurations, suiteDuration} = require('../../../detox/utils/spec-durations');

const {
    DeviceInfo,
    Specs,
    loadDurations,
    packByDuration,
    loadMutationManifest,
    parseTargets,
    resolveMutationTarget,
} = require('./split-tests');

// generateSplits() without touching the filesystem: findFiles() is what walks the tree.
const split = (files, parallelism, durations = {}) => {
    const s = new Specs('detox/e2e/test', parallelism, new DeviceInfo('iPhone', 'iOS 26.2'), durations);
    s.rawFiles = files;
    s.generateSplits();
    return s.groupedFiles.map((g) => g.specs.split(' ').filter(Boolean));
};

// Same as split(), with the mutation manifest and target/platform inputs.
const splitWithMutation = ({files, parallelism, entries = [], targets = [], platform = 'android', durations = {}}) => {
    const s = new Specs('detox/e2e/test', parallelism, new DeviceInfo('iPhone', 'iOS 26.2'), durations, {entries, targets, platform});
    s.rawFiles = files;
    s.generateSplits();
    return s.groupedFiles;
};

const specsOf = (group) => group.specs.split(' ').filter(Boolean);

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

describe('server mutation isolation', () => {
    const pool = [
        'detox/e2e/test/a.e2e.ts',
        'detox/e2e/test/b.e2e.ts',
        'detox/e2e/test/c.e2e.ts',
        'detox/e2e/test/d.e2e.ts',
    ];
    const m1 = 'detox/e2e/test/m_login.e2e.ts';
    const m2 = 'detox/e2e/test/m_flag.e2e.ts';
    // m2 mutates B on Android but the shared SITE_3 on iOS.
    const entries = [
        {spec: m1, target: 'B'},
        {spec: m2, target: 'B', iosTarget: 'site3'},
    ];
    const mutationOf = (groups) => groups.filter((g) => g.role === 'mutation');
    const poolOf = (groups) => groups.filter((g) => g.role === 'pool');

    let errorSpy;
    beforeEach(() => {
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
        errorSpy.mockRestore();
    });

    it('should keep mutation specs out of the pool and give each target its own shard', () => {
        const groups = splitWithMutation({files: [...pool, m1, m2], parallelism: 4, entries, targets: ['B', 'site3'], platform: 'ios'});

        expect(groups.map((g) => [g.runId, g.role, g.target])).toEqual([
            ['1', 'pool', 'A'],
            ['2', 'pool', 'A'],
            ['3', 'mutation', 'B'],
            ['4', 'mutation', 'site3'],
        ]);
        expect(poolOf(groups).flatMap(specsOf).sort()).toEqual(pool);
        expect(specsOf(groups[2])).toEqual([m1]);
        expect(specsOf(groups[3])).toEqual([m2]);
    });

    it('should apply the iOS target override only on iOS', () => {
        const ios = splitWithMutation({files: [...pool, m1, m2], parallelism: 4, entries, targets: ['B', 'site3'], platform: 'ios'});
        const android = splitWithMutation({files: [...pool, m1, m2], parallelism: 4, entries, targets: ['B', 'site3'], platform: 'android'});

        expect(mutationOf(ios).map((g) => g.target)).toEqual(['B', 'site3']);
        expect(mutationOf(android)).toEqual([expect.objectContaining({target: 'B', specs: [m1, m2].sort().join(' ')})]);
    });

    it('should merge a target without a server into B', () => {
        const groups = splitWithMutation({files: [...pool, m1, m2], parallelism: 4, entries, targets: ['B'], platform: 'ios'});

        expect(mutationOf(groups)).toEqual([expect.objectContaining({target: 'B', specs: [m1, m2].sort().join(' ')})]);
    });

    it('should fail when mutation specs are selected and there is no second server', () => {
        expect(() => splitWithMutation({files: [...pool, m1, m2], parallelism: 4, entries, targets: [], platform: 'android'})).
            toThrow('2 server mutation spec(s) selected but there is no second test server');
    });

    it('should split normally without a second server when no mutation spec is selected', () => {
        const groups = splitWithMutation({files: pool, parallelism: 2, entries, targets: [], platform: 'android'});

        expect(mutationOf(groups)).toEqual([]);
        expect(groups.length).toBeGreaterThan(0);
    });

    it('should not warn about isolation when the manifest has no entries', () => {
        splitWithMutation({files: pool, parallelism: 2, entries: [], targets: []});

        expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining('::warning::'));
    });

    it('should count mutation shards toward PARALLELISM and keep runIds contiguous', () => {
        const many = Array.from({length: 30}, (_, i) => `detox/e2e/test/s${String(i).padStart(2, '0')}.e2e.ts`);
        const groups = splitWithMutation({files: [...many, m1, m2], parallelism: 28, entries, targets: ['B', 'site3'], platform: 'ios'});

        expect(groups).toHaveLength(28);
        expect(poolOf(groups)).toHaveLength(26);
        expect(groups.map((g) => g.runId)).toEqual(Array.from({length: 28}, (_, i) => String(i + 1)));
    });

    it('should keep at least one pool shard when mutation shards fill PARALLELISM', () => {
        const groups = splitWithMutation({files: [...pool, m1, m2], parallelism: 2, entries, targets: ['B', 'site3'], platform: 'ios'});

        expect(poolOf(groups)).toHaveLength(1);
        expect(mutationOf(groups)).toHaveLength(2);
    });

    it('should keep mm_blocks as the first pool shard at runId 1 and mutation shards after it', () => {
        const mm = 'detox/e2e/test/mm_blocks_tunnel.e2e.ts';
        const groups = splitWithMutation({files: [mm, ...pool, m1], parallelism: 3, entries: [{spec: m1, target: 'B'}], targets: ['B'], platform: 'android'});

        expect(groups[0]).toMatchObject({runId: '1', role: 'pool', target: 'A'});
        expect(specsOf(groups[0])).toEqual([mm]);
        expect(groups[groups.length - 1]).toMatchObject({role: 'mutation', target: 'B', specs: m1});
        expect(groups.map((g) => g.runId)).toEqual(['1', '2', '3']);
    });

    it('should ignore manifest entries that the search path does not contain, with a warning', () => {
        const missing = 'detox/e2e/test/not_written_yet.e2e.ts';
        const groups = splitWithMutation({
            files: pool,
            parallelism: 2,
            entries: [{spec: missing, target: 'B'}],
            targets: ['B'],
            platform: 'android',
        });

        expect(groups.every((g) => g.role === 'pool')).toBe(true);
        expect(groups.flatMap(specsOf).sort()).toEqual(pool);
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(missing));
    });
});

describe('mutation manifest and target helpers', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mutation-manifest-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    it('should load the committed manifest with only B or site3 targets', () => {
        const entries = loadMutationManifest(path.join(__dirname, '../../../detox/e2e/server_mutation_specs.json'));

        expect(entries.length).toBeGreaterThan(0);
        for (const entry of entries) {
            expect(['B', 'site3']).toContain(entry.target);
            expect(entry.spec.startsWith('detox/e2e/test/')).toBe(true);
        }
    });

    it('should return no entries for a missing manifest', () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        expect(loadMutationManifest(path.join(tmpDir, 'nope.json'))).toEqual([]);
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
        errorSpy.mockRestore();
    });

    it('should throw on malformed JSON instead of silently running mutations on pool servers', () => {
        const file = path.join(tmpDir, 'bad.json');
        fs.writeFileSync(file, '{not json');

        expect(() => loadMutationManifest(file)).toThrow();
    });

    it('should reject entries without a spec or target', () => {
        const file = path.join(tmpDir, 'partial.json');
        fs.writeFileSync(file, JSON.stringify({mutation: [{spec: 'detox/e2e/test/a.e2e.ts'}]}));

        expect(() => loadMutationManifest(file)).toThrow(/mutation\[0\]/);
    });

    it('should reject a manifest without a mutation array', () => {
        const file = path.join(tmpDir, 'shape.json');
        fs.writeFileSync(file, JSON.stringify({entries: []}));

        expect(() => loadMutationManifest(file)).toThrow(/"mutation" array/);
    });

    it('should split and trim MUTATION_TARGETS', () => {
        expect(parseTargets('B,site3')).toEqual(['B', 'site3']);
        expect(parseTargets(' B , ')).toEqual(['B']);
        expect(parseTargets('')).toEqual([]);
        expect(parseTargets(undefined)).toEqual([]);
    });

    it('should resolve a target to an available one, preferring the exact match, then B', () => {
        expect(resolveMutationTarget('site3', ['B', 'site3'])).toBe('site3');
        expect(resolveMutationTarget('site3', ['B'])).toBe('B');
        expect(resolveMutationTarget('site3', ['site3'])).toBe('site3');
        expect(resolveMutationTarget('B', [])).toBe('A');
        expect(() => resolveMutationTarget('B', ['site3'])).toThrow(/mutation target B is not available/);
    });
});
