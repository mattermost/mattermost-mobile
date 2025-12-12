#!/usr/bin/env node

/**
 * Patch the generated TypeScript code to use our wrapper for old architecture support
 * Note: MattermostE2ee.mm is overwritten from overrides/MattermostE2ee.mm
 */

const fs = require('fs');
const path = require('path');

const scriptDir = __dirname;
const indexFile = path.join(scriptDir, '../src/index.tsx');

function patchIndexFile() {
    if (!fs.existsSync(indexFile)) {
        console.log(`Warning: ${indexFile} not found, skipping index.tsx patch`);
        return;
    }

    console.log(`Patching ${indexFile} to use wrapper...`);

    let content = fs.readFileSync(indexFile, 'utf8');

    // Check if already patched
    if (content.includes("from './NativeMattermostE2ee.wrapper'")) {
        console.log('index.tsx already patched, skipping...');
        return;
    }

    // Replace import to use wrapper
    content = content.replace(
        "from './NativeMattermostE2ee'",
        "from './NativeMattermostE2ee.wrapper'",
    );

    fs.writeFileSync(indexFile, content, 'utf8');
    console.log('index.tsx patch complete!');
}

// Run patch
patchIndexFile();
