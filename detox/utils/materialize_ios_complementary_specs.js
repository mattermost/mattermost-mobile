// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console -- CI utility script */

/**
 * Materialize the PR Detox iOS complementary allowlist as a search tree of
 * symlinks under detox/e2e/test/.ios_complementary so Test System IO path
 * discovery can lease only those specs.
 *
 * Usage (from repo root or detox/):
 *   node detox/utils/materialize_ios_complementary_specs.js
 */

const fs = require('node:fs');
const path = require('node:path');

const DETOX_ROOT = path.resolve(__dirname, '..');
const ALLOWLIST = path.join(DETOX_ROOT, 'e2e/config/ios_complementary_specs.json');
const OUT_DIR = path.join(DETOX_ROOT, 'e2e/test/.ios_complementary');

/**
 * @param {string} [allowlistPath]
 * @param {string} [outDir]
 * @param {string} [detoxRoot]
 * @returns {{outDir: string, count: number, specs: string[]}}
 */
function materializeIosComplementarySpecs(allowlistPath = ALLOWLIST, outDir = OUT_DIR, detoxRoot = DETOX_ROOT) {
    const cfg = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
    const specs = Array.isArray(cfg.specs) ? cfg.specs : [];
    if (specs.length === 0) {
        throw new Error(`ios complementary allowlist is empty: ${allowlistPath}`);
    }

    fs.rmSync(outDir, {recursive: true, force: true});
    fs.mkdirSync(outDir, {recursive: true});

    const linked = [];
    for (const rel of specs) {
        if (typeof rel !== 'string' || !rel.endsWith('.e2e.ts')) {
            throw new Error(`invalid complementary spec path: ${JSON.stringify(rel)}`);
        }
        const src = path.join(detoxRoot, rel);
        if (!fs.existsSync(src)) {
            throw new Error(`complementary spec missing: ${rel}`);
        }
        // Flatten to basename so discovery walks a single directory of units.
        const dest = path.join(outDir, path.basename(rel));
        if (fs.existsSync(dest)) {
            throw new Error(`duplicate complementary basename: ${path.basename(rel)}`);
        }
        fs.symlinkSync(src, dest);
        linked.push(rel);
    }

    return {outDir, count: linked.length, specs: linked};
}

if (require.main === module) {
    const result = materializeIosComplementarySpecs();
    console.log(`materialized ${result.count} iOS complementary specs → ${path.relative(process.cwd(), result.outDir)}`);
}

module.exports = {materializeIosComplementarySpecs, ALLOWLIST, OUT_DIR};
