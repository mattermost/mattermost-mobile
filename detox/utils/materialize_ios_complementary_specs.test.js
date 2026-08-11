// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {describe, it, afterEach} = require('node:test');

const {materializeIosComplementarySpecs} = require('./materialize_ios_complementary_specs');

describe('materializeIosComplementarySpecs', () => {
    /** @type {string[]} */
    const tmpDirs = [];

    afterEach(() => {
        for (const dir of tmpDirs.splice(0)) {
            fs.rmSync(dir, {recursive: true, force: true});
        }
    });

    it('should symlink allowlisted specs into the complementary search tree', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ios-comp-'));
        tmpDirs.push(root);
        const srcDir = path.join(root, 'e2e/test/products/channels/channels');
        fs.mkdirSync(srcDir, {recursive: true});
        const rel = 'e2e/test/products/channels/channels/browse_channels.e2e.ts';
        fs.writeFileSync(path.join(root, rel), 'export {};\n');
        const allowlist = path.join(root, 'allowlist.json');
        fs.writeFileSync(allowlist, JSON.stringify({specs: [rel]}));
        const outDir = path.join(root, 'e2e/test/.ios_complementary');

        const result = materializeIosComplementarySpecs(allowlist, outDir, root);
        assert.equal(result.count, 1);
        const link = path.join(outDir, 'browse_channels.e2e.ts');
        assert.equal(fs.lstatSync(link).isSymbolicLink(), true);
        assert.equal(fs.realpathSync(link), fs.realpathSync(path.join(root, rel)));
    });

    it('should reject missing specs', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ios-comp-missing-'));
        tmpDirs.push(root);
        const allowlist = path.join(root, 'allowlist.json');
        fs.writeFileSync(allowlist, JSON.stringify({specs: ['e2e/test/missing.e2e.ts']}));
        const outDir = path.join(root, 'out');
        assert.throws(
            () => materializeIosComplementarySpecs(allowlist, outDir, root),
            /complementary spec missing/,
        );
    });
});
