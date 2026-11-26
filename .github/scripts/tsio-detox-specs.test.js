// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const fs = require('fs');
const os = require('os');
const path = require('path');

const {buildPlan, classify, prepareCheckout, stackPlan} = require('./tsio-detox-specs');

const SITE3 = [
    'file_upload_max_size.e2e.ts',
    'share_with_connected_workspaces.e2e.ts',
];

function writeSpec(root, rel) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), {recursive: true});
    fs.writeFileSync(full, '// spec\n');
}

function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tsio-detox-specs-'));
    const pool = 'detox/e2e/test/products/channels/messaging/send.e2e.ts';
    const blocks = 'detox/e2e/test/products/channels/messaging/mm_blocks_card.e2e.ts';
    const ipad = 'detox/e2e/test/products/channels/ipad/ipad_sidebar.e2e.ts';
    const onB = 'detox/e2e/test/products/channels/server_login/login_mfa.e2e.ts';
    const onSite3 = 'detox/e2e/test/products/channels/messaging/file_upload_max_size.e2e.ts';
    for (const rel of [pool, blocks, ipad, onB, onSite3]) {
        writeSpec(root, rel);
    }
    const manifest = path.join(root, 'manifest.json');
    fs.writeFileSync(manifest, JSON.stringify({
        mutation: [
            {spec: onB, target: 'B'},
            {spec: onSite3, target: 'B', iosTarget: 'site3'},
            {spec: 'detox/e2e/test/missing.e2e.ts', target: 'B'},
        ],
    }));
    return {root, manifest, pool, blocks, ipad, onB, onSite3};
}

describe('tsio detox spec selection', () => {
    let tmp;

    afterEach(() => {
        if (tmp) {
            fs.rmSync(tmp.root, {recursive: true, force: true});
        }
    });

    it('should keep mutation specs off the pool and skip the ipad directory', () => {
        tmp = fixture();
        const ios = classify(tmp.root, {searchPath: 'detox/e2e/test', platform: 'ios', manifestPath: tmp.manifest});

        expect(ios.pool).toEqual([tmp.blocks, tmp.pool].sort());
        expect(ios.mutationB).toEqual([tmp.onB]);
        expect(ios.mutationSite3).toEqual([tmp.onSite3]);
        expect(ios.webhook).toBe(true);
        expect(ios.pool.some((file) => file.includes('/ipad/'))).toBe(false);
    });

    it('should run an iOS site3 spec on B for Android', () => {
        tmp = fixture();
        const android = classify(tmp.root, {searchPath: 'detox/e2e/test', platform: 'android', manifestPath: tmp.manifest});

        expect(android.mutationSite3).toEqual([]);
        expect(android.mutationB).toEqual([tmp.onB, tmp.onSite3].sort());
        expect(android.pool).toEqual([tmp.blocks, tmp.pool].sort());
    });

    it('should find no mutation specs when the search path is the ipad directory', () => {
        tmp = fixture();
        const ipad = classify(tmp.root, {
            searchPath: 'detox/e2e/test/products/channels/ipad',
            platform: 'ios',
            manifestPath: tmp.manifest,
        });

        expect(ipad.pool).toEqual([tmp.ipad]);
        expect(ipad.mutationB).toEqual([]);
        expect(ipad.mutationSite3).toEqual([]);
        expect(ipad.webhook).toBe(false);
    });

    it('should delete every spec the run must not discover', () => {
        tmp = fixture();
        const kept = prepareCheckout(tmp.root, {
            searchPath: 'detox/e2e/test',
            platform: 'ios',
            role: 'pool',
            manifestPath: tmp.manifest,
        });

        expect(kept).toEqual({kept: 2});
        expect(fs.existsSync(path.join(tmp.root, tmp.pool))).toBe(true);
        expect(fs.existsSync(path.join(tmp.root, tmp.blocks))).toBe(true);
        expect(fs.existsSync(path.join(tmp.root, tmp.onB))).toBe(false);
        expect(fs.existsSync(path.join(tmp.root, tmp.onSite3))).toBe(false);
        expect(fs.existsSync(path.join(tmp.root, tmp.ipad))).toBe(false);
    });

    it('should report an empty role without throwing', () => {
        tmp = fixture();
        const kept = prepareCheckout(tmp.root, {
            searchPath: 'detox/e2e/test/products/channels/ipad',
            platform: 'ios',
            role: 'mutation-b',
            manifestPath: tmp.manifest,
        });

        expect(kept).toEqual({kept: 0});
    });

    it('should add a server for B and not for site3', () => {
        expect(stackPlan({parallelism: 32, mutationB: true})).toMatchObject({
            poolWorkers: 32,
            mutationBShard: '33',
            stackCount: 35,
        });
        expect(stackPlan({parallelism: 32, mutationB: true}).slices).toHaveLength(8);
        expect(stackPlan({parallelism: 1, mutationB: false})).toMatchObject({
            poolWorkers: 1,
            mutationBShard: '',
            stackCount: 3,
            slices: ['0', '1', '2'],
        });
    });

    it('should refuse a pool with no specs', () => {
        tmp = fixture();
        fs.rmSync(path.join(tmp.root, tmp.pool));
        fs.rmSync(path.join(tmp.root, tmp.blocks));

        expect(() => buildPlan(tmp.root, {
            searchPath: 'detox/e2e/test',
            platform: 'ios',
            parallelism: '32',
            manifestPath: tmp.manifest,
        })).toThrow(/no pool specs/);
    });

    it('should match the committed suite', () => {
        const repo = path.join(__dirname, '../..');
        const ios = classify(repo, {searchPath: 'detox/e2e/test', platform: 'ios'});
        const android = classify(repo, {searchPath: 'detox/e2e/test', platform: 'android'});
        const ipad = classify(repo, {searchPath: 'detox/e2e/test/products/channels/ipad', platform: 'ios'});

        expect(ios.mutationB.length).toBeGreaterThan(0);
        expect(ios.mutationSite3.map((file) => path.basename(file)).sort()).toEqual(SITE3.sort());
        expect(ios.pool.some((file) => file.includes('/ipad/'))).toBe(false);
        for (const file of [...ios.mutationB, ...ios.mutationSite3]) {
            expect(ios.pool).not.toContain(file);
        }
        expect([...ios.mutationB, ...ios.mutationSite3].sort()).toEqual([...android.mutationB].sort());
        expect(android.mutationSite3).toEqual([]);
        expect(ipad.mutationB).toEqual([]);
        expect(ipad.mutationSite3).toEqual([]);
        expect(ipad.pool).toHaveLength(4);
        expect(buildPlan(repo, {searchPath: 'detox/e2e/test', platform: 'ios', parallelism: '32'}).stackCount).toBe(35);
        expect(buildPlan(repo, {
            searchPath: 'detox/e2e/test/products/channels/ipad',
            platform: 'ios',
            parallelism: '1',
        }).stackCount).toBe(3);
    });
});
