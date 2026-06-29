#!/usr/bin/env node
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env */

/**
 * Build detox/e2e/failing-specs.manifest.json from downloaded CI junit artifacts.
 *
 * Usage:
 *   node detox/scripts/generate-failing-specs-manifest.js .e2e-debug/28357943955-ios .e2e-debug/28357943955-android
 *   node detox/scripts/generate-failing-specs-manifest.js  # scans repo root for *-junit.xml
 */

const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const defaultOut = path.join(repoRoot, 'detox/e2e/failing-specs.manifest.json');

function collectJunitFiles(roots) {
    const files = [];
    const walk = (dir) => {
        if (!fs.existsSync(dir)) {
            return;
        }
        for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.name.endsWith('-junit.xml')) {
                files.push(full);
            }
        }
    };
    for (const root of roots) {
        walk(path.resolve(root));
    }
    return files;
}

function collectFailedMmIds(junitFiles) {
    const failed = new Set();
    const re = /<testcase[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/testcase>/g;
    for (const file of junitFiles) {
        const xml = fs.readFileSync(file, 'utf8');
        let match;
        while ((match = re.exec(xml))) {
            if (!match[2].includes('<failure')) {
                continue;
            }
            const mm = match[1].match(/MM-T[\d_]+/)?.[0];
            if (mm) {
                failed.add(mm);
            }
        }
    }
    return [...failed];
}

function mapMmToSpecFiles(mmIds) {
    const specs = new Set();
    for (const mm of mmIds) {
        try {
            const out = execSync(
                `rg -l "${mm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" "${path.join(repoRoot, 'detox/e2e/test')}" --glob '*.e2e.ts'`,
                {encoding: 'utf8'},
            ).trim();
            out.split('\n').filter(Boolean).forEach((abs) => {
                specs.add(path.relative(repoRoot, abs));
            });
        } catch {
            // MM-T not found in any spec — skip
        }
    }
    return [...specs].sort();
}

function main() {
    const roots = process.argv.slice(2);
    const scanRoots = roots.length > 0 ? roots : [repoRoot];
    const junitFiles = collectJunitFiles(scanRoots);
    if (junitFiles.length === 0) {
        console.error('No *-junit.xml files found under:', scanRoots.join(', '));
        process.exit(1);
    }
    const mmIds = collectFailedMmIds(junitFiles);
    const specs = mapMmToSpecFiles(mmIds);
    const manifest = {
        source_run: process.env.SOURCE_RUN || 'manual',
        source_commit: process.env.SOURCE_COMMIT || 'unknown',
        generated_at: new Date().toISOString().slice(0, 10),
        note: 'Regenerate: node detox/scripts/generate-failing-specs-manifest.js <junit-dirs>',
        failed_mm_t_count: mmIds.length,
        specs,
    };
    fs.writeFileSync(defaultOut, `${JSON.stringify(manifest, null, 4)}\n`);
    console.log(`Wrote ${specs.length} specs (${mmIds.length} MM-T failures) → ${defaultOut}`);
}

main();
