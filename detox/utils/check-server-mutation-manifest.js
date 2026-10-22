// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Checks detox/e2e/server_mutation_specs.json against the specs: every listed spec exists and
// calls requireMutationServer(), and no unlisted spec does (it would throw on a pool shard).

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const MANIFEST = 'detox/e2e/server_mutation_specs.json';
const SPEC_ROOT = 'detox/e2e/test';
const TARGETS = new Set(['B', 'site3']);
const MARKER = /\brequireMutationServer\(/;

function listSpecs(dir) {
    return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return listSpecs(full);
        }
        return entry.name.endsWith('.e2e.ts') ? [full] : [];
    });
}

/**
 * @param {unknown} manifest parsed manifest JSON
 * @param {Record<string, string>} specs repo-relative spec path -> source
 * @returns {string[]} problems found
 */
function checkManifest(manifest, specs) {
    const entries = manifest && Array.isArray(manifest.mutation) ? manifest.mutation : null;
    if (!entries) {
        return [`${MANIFEST} must have a "mutation" array`];
    }

    const problems = [];
    const listed = new Set();
    for (const entry of entries) {
        const spec = entry && entry.spec;
        if (typeof spec !== 'string') {
            problems.push(`entry without a "spec" path: ${JSON.stringify(entry)}`);
            continue;
        }
        if (listed.has(spec)) {
            problems.push(`${spec} is listed more than once`);
        }
        listed.add(spec);
        if (!TARGETS.has(entry.target)) {
            problems.push(`${spec} has target ${JSON.stringify(entry.target)}; expected one of ${[...TARGETS].join(', ')}`);
        }
        if (entry.iosTarget !== undefined && !TARGETS.has(entry.iosTarget)) {
            problems.push(`${spec} has iosTarget ${JSON.stringify(entry.iosTarget)}; expected one of ${[...TARGETS].join(', ')}`);
        }
        if (!(spec in specs)) {
            problems.push(`${spec} does not exist`);
        } else if (!MARKER.test(specs[spec])) {
            problems.push(`${spec} is listed but never calls requireMutationServer()`);
        }
    }

    for (const [spec, source] of Object.entries(specs)) {
        if (!listed.has(spec) && MARKER.test(source)) {
            problems.push(`${spec} calls requireMutationServer() but is not listed in ${MANIFEST}`);
        }
    }
    return problems;
}

function main() {
    const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, MANIFEST), 'utf8'));
    const specs = Object.fromEntries(listSpecs(path.join(REPO_ROOT, SPEC_ROOT)).map((file) => [
        path.relative(REPO_ROOT, file).split(path.sep).join('/'),
        fs.readFileSync(file, 'utf8'),
    ]));
    const problems = checkManifest(manifest, specs);
    if (problems.length) {
        process.stderr.write(`${MANIFEST} is out of date:\n${problems.map((p) => `  - ${p}`).join('\n')}\n`);
        process.exit(1);
    }
    process.stdout.write(`${MANIFEST}: ${manifest.mutation.length} mutation specs OK\n`);
}

if (require.main === module) {
    main();
}

module.exports = {checkManifest};
