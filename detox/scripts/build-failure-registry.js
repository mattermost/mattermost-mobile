#!/usr/bin/env node
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console */

const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');

function decodeXml(text) {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

function extractFailures(junitPath) {
    const xml = fs.readFileSync(junitPath, 'utf8');
    const failures = [];
    const re = /<testcase[^>]*name="([^"]*)"[^>]*(?:classname="([^"]*)")?[^>]*>([\s\S]*?)<\/testcase>/g;
    let m;
    while ((m = re.exec(xml))) {
        const body = m[3];
        const failMatch = body.match(/<failure[^>]*>([\s\S]*?)<\/failure>/);
        if (!failMatch) {
            continue;
        }
        let failure = decodeXml(failMatch[1].trim());
        if (failure.startsWith('{')) {
            try {
                const parsed = JSON.parse(failure);
                failure = parsed.stack || parsed.message || failure;
            } catch {
                // keep raw
            }
        }
        const name = decodeXml(m[1]);
        const classname = decodeXml(m[2] || '');
        const mm = name.match(/MM-T[\d_]+|MM-\d+/)?.[0] || name.trim();
        failures.push({mm_t: mm, name, classname, failure, junit: junitPath});
    }
    return failures;
}

function findSpecFile(mmT) {
    if (!mmT.match(/^MM-/)) {
        return null;
    }
    try {
        const out = execSync(
            `rg -l "${mmT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" "${path.join(repoRoot, 'detox/e2e/test')}" --glob '*.e2e.ts'`,
            {encoding: 'utf8'},
        ).trim();
        const first = out.split('\n').filter(Boolean)[0];
        return first ? path.relative(repoRoot, first) : null;
    } catch {
        return null;
    }
}

function findScreenshot(shardDir, testName, mmT) {
    const imagesDir = path.join(shardDir, 'jest-stare', 'images');
    if (!fs.existsSync(imagesDir)) {
        return null;
    }
    const files = fs.readdirSync(imagesDir);
    const byMm = files.find((f) => f.includes(mmT));
    if (byMm) {
        return path.join(imagesDir, byMm);
    }
    const slug = testName.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 60);
    const bySlug = files.find((f) => f.includes(slug.slice(0, 30)));
    return bySlug ? path.join(imagesDir, bySlug) : null;
}

function stackLine(failure) {
    const match = failure.match(/at (?:async )?[^\n]*detox\/[^\n]+/);
    return match ? match[0] : null;
}

function inferFix(stack, failure) {
    if (!stack) {
        if (failure.includes('300000 ms for a hook')) {
            return {root_cause: 'Jest hook timeout (300s)', fix_file: 'detox/e2e/test (afterAll/beforeAll hang)'};
        }
        if (failure.includes('300000 ms for a test')) {
            return {root_cause: 'Jest test timeout (300s) — prior step hung', fix_file: null};
        }
        return {root_cause: null, fix_file: null};
    }
    const fileMatch = stack.match(/detox\/(e2e\/[^\s:)]+)/);
    const fixFile = fileMatch ? fileMatch[1] : null;
    return {root_cause: stack, fix_file: fixFile};
}

function main() {
    const dirs = process.argv.slice(2);
    if (dirs.length === 0) {
        console.error('Usage: node build-failure-registry.js <junit-root-dirs...>');
        process.exit(1);
    }

    const all = [];
    const seen = new Set();

    for (const base of dirs) {
        const resolved = path.resolve(base);
        if (!fs.existsSync(resolved)) {
            continue;
        }
        for (const shard of fs.readdirSync(resolved)) {
            const junit = path.join(resolved, shard, 'android-junit.xml');
            if (!fs.existsSync(junit)) {
                continue;
            }
            const shardDir = path.join(resolved, shard);
            for (const f of extractFailures(junit)) {
                const key = `${f.mm_t}::${f.name}`;
                if (seen.has(key)) {
                    continue;
                }
                seen.add(key);
                const {root_cause, fix_file} = inferFix(stackLine(f.failure), f.failure);
                all.push({
                    mm_t: f.mm_t,
                    spec_file: findSpecFile(f.mm_t),
                    error_snippet: f.failure.split('\n').slice(0, 6).join('\n'),
                    full_failure: f.failure,
                    stack_line: stackLine(f.failure),
                    screenshot: findScreenshot(shardDir, f.name, f.mm_t),
                    shard: path.basename(shardDir),
                    junit,
                    root_cause,
                    fix_file,
                });
            }
        }
    }

    const outPath = path.join(repoRoot, '.e2e-debug/28375328964-failure-registry.json');
    fs.mkdirSync(path.dirname(outPath), {recursive: true});
    fs.writeFileSync(outPath, `${JSON.stringify({source_run: '28375328964', total: all.length, failures: all}, null, 2)}\n`);
    console.log(`Wrote ${all.length} failures → ${outPath}`);

    const groups = {};
    for (const f of all) {
        const key = f.stack_line || f.error_snippet.slice(0, 80);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(f.mm_t);
    }
    console.log('\nGroups:');
    for (const [k, v] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
        console.log(`${v.length}\t${k.slice(0, 120)}`);
    }
}

main();
