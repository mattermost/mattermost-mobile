// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Which Detox specs a Test System IO run may see.
//
// dispatch-begin walks a directory. It cannot take the mutation manifest, and
// this tree has no // Tags: lines, so the begin checkout deletes every other
// *.e2e.ts before the walk. Workers check out a clean tree and run the paths
// that walk recorded.

const fs = require('fs');
const path = require('path');

const {loadMutationManifest, resolveMutationTarget} = require('../actions/generate-specs/split-tests');

const DEFAULT_MANIFEST = 'detox/e2e/server_mutation_specs.json';

function toRepoRelative(repoRoot, full) {
    return path.relative(repoRoot, full).split(path.sep).join('/');
}

function toDetoxRelative(searchPath) {
    const prefix = 'detox/';
    if (!searchPath.startsWith(prefix)) {
        throw new Error(`search path must start with ${prefix}, got ${searchPath}`);
    }
    return searchPath.slice(prefix.length);
}

function resolveSearchDir(repoRoot, searchPath) {
    const rel = searchPath.split('/').join(path.sep);
    const root = path.resolve(repoRoot);
    const dir = path.resolve(root, rel);
    if (dir !== root && !dir.startsWith(root + path.sep)) {
        throw new Error(`search path escapes the repo: ${searchPath}`);
    }
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        throw new Error(`search path is not a directory: ${searchPath}`);
    }
    return dir;
}

// skipIpad matches generate-specs: a child directory named ipad is not part of
// the phone or Android suite. The iPad lane's search path is that directory,
// so its own files are still found.
function listE2eFiles(dir, {skipIpad}) {
    const out = [];
    const walk = (current) => {
        for (const name of fs.readdirSync(current)) {
            const full = path.join(current, name);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
                if (skipIpad && name === 'ipad') {
                    continue;
                }
                walk(full);
                continue;
            }
            if (name.endsWith('.e2e.ts')) {
                out.push(full);
            }
        }
    };
    walk(dir);
    return out;
}

function classify(repoRoot, {searchPath, platform, manifestPath}) {
    if (platform !== 'ios' && platform !== 'android') {
        throw new Error(`platform must be ios or android, got ${platform}`);
    }
    const manifest = manifestPath || path.join(repoRoot, DEFAULT_MANIFEST);
    if (!fs.existsSync(manifest)) {
        throw new Error(`mutation manifest not found: ${manifest}`);
    }
    const entries = loadMutationManifest(manifest);
    const dir = resolveSearchDir(repoRoot, searchPath);
    const candidates = listE2eFiles(dir, {skipIpad: true}).map((full) => toRepoRelative(repoRoot, full));
    const byNormalized = new Map(candidates.map((file) => [path.normalize(file), file]));
    const available = platform === 'ios' ? ['B', 'site3'] : ['B'];
    const mutationB = new Set();
    const mutationSite3 = new Set();

    for (const entry of entries) {
        const file = byNormalized.get(path.normalize(entry.spec));
        if (!file) {
            process.stderr.write(`tsio-detox-specs: mutation spec not in the search path, ignored: ${entry.spec}\n`);
            continue;
        }
        const wanted = platform === 'ios' && entry.iosTarget ? entry.iosTarget : entry.target;
        const target = resolveMutationTarget(wanted, available);
        if (target === 'site3') {
            mutationSite3.add(file);
        } else {
            mutationB.add(file);
        }
    }

    const pool = candidates.filter((file) => !mutationB.has(file) && !mutationSite3.has(file)).sort();
    return {
        pool,
        mutationB: [...mutationB].sort(),
        mutationSite3: [...mutationSite3].sort(),
        webhook: pool.some((file) => path.basename(file).includes('mm_blocks_')),
    };
}

function stackPlan({parallelism, mutationB}) {
    const workers = Number(parallelism);
    if (!Number.isInteger(workers) || workers < 1) {
        throw new Error(`parallelism must be a positive integer, got ${parallelism}`);
    }
    const own = workers + (mutationB ? 1 : 0);
    const count = own + 2;
    const groups = [];
    for (let index = 0; index < count; index++) {
        const bucket = index % 8;
        if (!groups[bucket]) {
            groups[bucket] = [];
        }
        groups[bucket].push(String(index));
    }
    return {
        poolWorkers: workers,
        mutationBShard: mutationB ? String(workers + 1) : '',
        stackCount: count,
        slices: groups.filter(Boolean).map((group) => group.join(',')),
    };
}

function buildPlan(repoRoot, opts) {
    const groups = classify(repoRoot, opts);
    if (groups.pool.length === 0) {
        throw new Error(`no pool specs under ${opts.searchPath}`);
    }
    const mutationB = groups.mutationB.length > 0;
    return {
        ...stackPlan({parallelism: opts.parallelism, mutationB}),
        mutationB,
        mutationSite3: groups.mutationSite3.length > 0,
        webhook: groups.webhook,
        detoxSearchPath: toDetoxRelative(opts.searchPath),
        poolSpecs: groups.pool.length,
        mutationBSpecs: groups.mutationB.length,
        mutationSite3Specs: groups.mutationSite3.length,
    };
}

function keepForRole(groups, role) {
    if (role === 'pool') {
        return groups.pool;
    }
    if (role === 'mutation-b') {
        return groups.mutationB;
    }
    if (role === 'mutation-site3') {
        return groups.mutationSite3;
    }
    throw new Error(`role must be pool, mutation-b, or mutation-site3, got ${role}`);
}

// Deletes every spec under the search path that this run must not discover,
// including the ipad directory the candidate walk skipped.
function prepareCheckout(repoRoot, opts) {
    const groups = classify(repoRoot, opts);
    const keep = new Set(keepForRole(groups, opts.role));
    const dir = resolveSearchDir(repoRoot, opts.searchPath);
    for (const full of listE2eFiles(dir, {skipIpad: false})) {
        const rel = toRepoRelative(repoRoot, full);
        if (!keep.has(rel)) {
            fs.unlinkSync(full);
        }
    }
    return {kept: keep.size};
}

function readArgs(argv) {
    const args = {_: []};
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (token.startsWith('--')) {
            const key = token.slice(2);
            const value = argv[i + 1];
            if (!value || value.startsWith('--')) {
                throw new Error(`missing value for --${key}`);
            }
            args[key] = value;
            i += 1;
        } else {
            args._.push(token);
        }
    }
    return args;
}

function main(argv) {
    const args = readArgs(argv);
    const command = args._[0];
    const opts = {
        searchPath: args['search-path'],
        platform: args.platform,
        parallelism: args.parallelism,
        role: args.role,
        manifestPath: args.manifest,
    };
    if (!opts.searchPath || !opts.platform) {
        throw new Error('usage: tsio-detox-specs.js <plan|prepare> --search-path <path> --platform <ios|android>');
    }
    const repoRoot = process.cwd();
    if (command === 'plan') {
        process.stdout.write(JSON.stringify(buildPlan(repoRoot, opts)));
        return;
    }
    if (command === 'prepare') {
        const {kept} = prepareCheckout(repoRoot, opts);
        process.stderr.write(`tsio-detox-specs: ${opts.role} keeps ${kept} spec(s)\n`);
        if (kept === 0) {
            process.exitCode = 2;
        }
        return;
    }
    throw new Error(`unknown command ${command}`);
}

if (require.main === module) {
    try {
        main(process.argv.slice(2));
    } catch (err) {
        process.stderr.write(`::error::${err.message}\n`);
        process.exit(1);
    }
}

module.exports = {
    buildPlan,
    classify,
    prepareCheckout,
    stackPlan,
    toDetoxRelative,
};
