// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {test} = require('node:test');

const {parseArgs, renderSummary, writeSpecLists} = require('./triage');

function tmpdir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'triage-cli-test-'));
}

function argv(...flags) {
    return ['node', 'triage.js', ...flags];
}

test('parseArgs reads flag values and treats a bare flag as true', () => {
    const args = parseArgs(argv('--artifacts=some/dir', '--skip-history'));
    assert.equal(args.artifacts, 'some/dir');
    assert.equal(args['skip-history'], 'true');
});

test('parseArgs keeps an empty value distinct from an absent flag', () => {
    const args = parseArgs(argv('--commit='));
    assert.equal(args.commit, '');
    assert.equal(args.repo, undefined);
});

test('parseArgs rejects an unknown flag instead of ignoring it', () => {
    // A silently-dropped `--no-history` leaves --artifacts at its default, which
    // is empty in CI. Triage then reports "no reports found" and the run resolves
    // red — the right answer to the wrong question, indistinguishable from a real
    // infrastructure failure, so the typo would survive.
    assert.throws(
        () => parseArgs(argv('--no-history')),
        /unknown flag\(s\): --no-history/,
    );
});

test('parseArgs names every unknown flag, not just the first', () => {
    assert.throws(
        () => parseArgs(argv('--nope', '--artifacts=x', '--alsonope')),
        (err) => err.message.includes('--nope') && err.message.includes('--alsonope'),
    );
});

test('parseArgs accepts every flag the CLI documents', () => {
    const args = parseArgs(argv(
        '--artifacts=a', '--output=b', '--repo=o/r', '--commit=deadbeef',
        '--branch=main', '--pr=123', '--tsio-url=https://x', '--skip-history=true',
        '--rerun-artifacts=r1,r2', '--evidence-in=e.json', '--prior-evidence=p.json',
        '--expected-reports=expected.json',
    ));
    assert.equal(args.pr, '123');
    assert.equal(args['rerun-artifacts'], 'r1,r2');
});

test('writeSpecLists writes one deduplicated file per platform', () => {
    const dir = tmpdir();
    const written = writeSpecLists(dir, {
        specs: [
            {platform: 'ios', spec: 'a.e2e.ts'},

            // Two failures in one spec must not run that spec twice in a shard.
            {platform: 'ios', spec: 'a.e2e.ts'},
            {platform: 'ios', spec: 'b.e2e.ts'},
            {platform: 'android', spec: 'c.e2e.ts'},
        ],
    });

    assert.equal(written.length, 2);
    assert.equal(fs.readFileSync(path.join(dir, 'spec-list-ios.txt'), 'utf8'), 'a.e2e.ts\nb.e2e.ts\n');
    assert.equal(fs.readFileSync(path.join(dir, 'spec-list-android.txt'), 'utf8'), 'c.e2e.ts\n');
});

test('writeSpecLists writes nothing when the rerun plan is empty', () => {
    const dir = tmpdir();
    assert.deepEqual(writeSpecLists(dir, {specs: []}), []);
    assert.deepEqual(fs.readdirSync(dir), []);
});

function evidence(overrides = {}) {
    return {
        tier: 1,
        tier_reason: '2 failures',
        summary: {total: 10, passed: 8, failed: 2, skipped: 0},
        suite_verdict: null,
        clusters: [],
        rerun_plan: {enabled: false, reason: 'nothing to rerun'},
        needs_ai: false,
        ...overrides,
    };
}

test('renderSummary labels the cluster count column as members, not as an index', () => {
    // The column holds member_count. Under a `#` header it reads as a row number,
    // so two single-member clusters both render as "1" and look like a numbering
    // bug in the report.
    const md = renderSummary(evidence({
        clusters: [{
            member_count: 3,
            signature_hash: 'abc123',
            signature_label: 'element not found',
            rule_verdict: 'FLAKY_TEST',
            confidence: 0.4,
            shards: ['9'],
            platforms: ['ios'],
            needs_ai: true,
        }],
    }));

    assert.match(md, /\| Members \| Signature \|/);
    assert.doesNotMatch(md, /\| # \| Signature \|/);
});

test('renderSummary escapes a pipe in a signature label so the table survives', () => {
    const md = renderSummary(evidence({
        clusters: [{
            member_count: 1,
            signature_hash: 'abc123',
            signature_label: 'expected a | b',
            rule_verdict: null,
            confidence: 0,
            shards: ['1'],
            platforms: ['ios'],
            needs_ai: true,
        }],
    }));

    assert.match(md, /expected a \\\| b/);
});

test('renderSummary reports a skipped rerun with its reason', () => {
    const md = renderSummary(evidence({
        rerun_plan: {enabled: false, reason: 'too many failures to rerun affordably'},
    }));

    assert.match(md, /Skipped — too many failures to rerun affordably/);
});

test('renderSummary lists the specs a rerun will execute', () => {
    const md = renderSummary(evidence({
        rerun_plan: {
            enabled: true,
            reason: '1 representative spec(s)',
            reps: 2,
            specs: [{platform: 'ios', spec: 'detox/e2e/test/a.e2e.ts', test_id: 'MM-T4731_2'}],
        },
    }));

    assert.match(md, /2 repetition\(s\)/);
    assert.match(md, /`ios` detox\/e2e\/test\/a\.e2e\.ts \(MM-T4731_2\)/);
});

test('a report that could not be parsed still shows up as a shard', () => {
    // A shard whose report is unreadable used to return shard: null and vanish
    // from summary.shards, so a dead shard was indistinguishable from one that
    // never existed — and the suite rules that key on "how many shards reported"
    // could not see it.
    const {parseJestResults} = require('./collect');
    const dir = tmpdir();
    const file = path.join(dir, 'ios-results-abc-3', 'jest-results.json');
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, '{ not json');

    const out = parseJestResults(file, dir);
    assert.ok(out.error, 'the parse failure is still reported');
    assert.ok(out.shard, 'the shard must remain visible');
    assert.equal(out.shard.total, 0);
    assert.equal(out.shard.shard, '3');
});
