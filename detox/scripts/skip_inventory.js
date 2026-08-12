// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Usage: node scripts/skip_inventory.js   (from detox/)
// Scans e2e/test/**/*.ts for it.skip / describe.skip / (isIos()?it.skip|isAndroid()?it.skip) and prints MM-T* + file:line.

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const TEST_ROOT = path.join(__dirname, '..', 'e2e', 'test');
const MM_T = /MM-T\d+(?:_\d+)?/;

// Matches common skip forms used in this suite (see open-items-triage / SEC-11050).
const SKIP_LINE = /\b(?:it|describe|test)\.skip\s*\(|\(\s*is(?:Ios|Android)\s*\(\s*\)\s*\?\s*(?:it|describe|test)\.skip\b/;

function walkTsFiles(dir, out = []) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkTsFiles(full, out);
            continue;
        }
        if (entry.name.endsWith('.ts')) {
            out.push(full);
        }
    }
    return out;
}

function extractMmT(line) {
    const match = line.match(MM_T);
    return match ? match[0] : '(no MM-T id)';
}

function main() {
    if (!fs.existsSync(TEST_ROOT)) {
        console.error(`Test root not found: ${TEST_ROOT}`);
        process.exit(1);
    }

    const files = walkTsFiles(TEST_ROOT);
    const rows = [];

    for (const file of files) {
        const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
        lines.forEach((line, idx) => {
            if (!SKIP_LINE.test(line)) {
                return;
            }
            const rel = path.relative(path.join(__dirname, '..'), file);
            rows.push({
                id: extractMmT(line),
                loc: `${rel}:${idx + 1}`,
                line: line.trim(),
            });
        });
    }

    rows.sort((a, b) => a.id.localeCompare(b.id) || a.loc.localeCompare(b.loc));

    console.log(`Found ${rows.length} skip(s) in ${files.length} test file(s)\n`);
    for (const row of rows) {
        console.log(`${row.id}\t${row.loc}\t${row.line}`);
    }
}

main();
