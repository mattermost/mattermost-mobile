// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {test} = require('node:test');

const {buildRerunPlan, classify, classifyCluster, cluster, pickTier} = require('./classify');
const {collect, normalizeForSignature, parseJestResults, parseMaestroReport, signatureHash} = require('./collect');
const {combineConfidence, matchSignatures, matchSuiteRules} = require('./signatures');

function tmpdir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'triage-test-'));
}

function makeFailure(overrides = {}) {
    return {
        test_id: 'MM-T1000',
        spec: 'detox/e2e/test/products/channels/messaging/post.e2e.ts',
        title: 'MM-T1000 posts a message',
        platform: 'ios',
        shard: '1',
        framework: 'detox',
        suite_level: false,
        error_type: 'Error',
        error_message: 'boom',
        duration_ms: 100,
        screenshot: null,
        device_log: null,
        device_log_excerpt: '',
        signature_hash: 'aaaaaaaaaaaa',
        signature_label: 'boom',
        ...overrides,
    };
}

function makeSummary(overrides = {}) {
    return {
        totalTests: 600,
        passed: 590,
        failed: 10,
        skipped: 0,
        shards: [
            {shard: '1', platform: 'ios', total: 300, passed: 295, failed: 5, skipped: 0},
            {shard: '2', platform: 'ios', total: 300, passed: 295, failed: 5, skipped: 0},
        ],
        platforms: ['ios'],
        reportsFound: 2,
        parseErrors: [],
        ...overrides,
    };
}

// ---------- signature normalization + clustering ----------

test('normalizeForSignature strips the run-specific noise that would defeat clustering', () => {
    const a = 'Element with id "channel_item.a1b2c3d4e5f6" not found after 10000ms at /Users/ci/work/foo.ts:12:5';
    const b = 'Element with id "channel_item.99887766aabb" not found after 20000ms at /Users/other/bar.ts:44:9';

    assert.equal(normalizeForSignature(a), normalizeForSignature(b));
});

test('different failure kinds keep different signatures', () => {
    const timeout = signatureHash('Timeout - Async callback was not invoked', 'Timeout');
    const notFound = signatureHash('No elements found for MATCHER(id == "foo")', 'Error');

    assert.notEqual(timeout, notFound);
});

test('cluster groups by signature and flags cross-shard and cross-platform spread', () => {
    const clusters = cluster([
        makeFailure({signature_hash: 'same', shard: '1', platform: 'ios'}),
        makeFailure({signature_hash: 'same', shard: '2', platform: 'android'}),
        makeFailure({signature_hash: 'other', shard: '1', platform: 'ios'}),
    ]);

    assert.equal(clusters.length, 2);

    // Sorted by member count, so the two-member cluster leads.
    assert.equal(clusters[0].member_count, 2);
    assert.equal(clusters[0].spans_shards, true);
    assert.equal(clusters[0].spans_platforms, true);
    assert.equal(clusters[1].spans_shards, false);
});

// ---------- signature catalogue ----------

test('matchSignatures identifies an emulator losing adb', () => {
    const matches = matchSignatures('com.android.ddmlib: emulator-5554 offline', {framework: 'detox'});

    assert.ok(matches.some((m) => m.id === 'device.adb-offline'));
    assert.equal(matches[0].verdict, 'FLAKY_INFRA');
});

test('matchSignatures routes a bundler error to a code verdict, not an infra one', () => {
    const matches = matchSignatures('error: bundling failed: Unable to resolve module @foo/bar', {framework: 'detox'});

    assert.equal(matches[0].verdict, 'BUILD_OR_ENV_ERROR');
});

test('matchSignatures respects framework scoping', () => {
    const text = 'Metro has stopped';

    assert.ok(matchSignatures(text, {framework: 'detox'}).some((m) => m.id === 'infra.metro-died'));
    assert.equal(matchSignatures(text, {framework: 'maestro'}).some((m) => m.id === 'infra.metro-died'), false);
});

test('combineConfidence has diminishing returns rather than summing to certainty', () => {
    const two = combineConfidence([{weight: 0.5}, {weight: 0.5}]);

    assert.equal(two, 0.75);
    assert.ok(two < 1, 'two independent signals must not reach certainty');
});

// ---------- suite-shape rules ----------

test('a run that produced no tests is infra, not a pile of test failures', () => {
    const hit = matchSuiteRules(makeSummary({
        totalTests: 0,
        passed: 0,
        failed: 0,
        shards: [{shard: '1', platform: 'ios', total: 0, passed: 0, failed: 0, skipped: 0}],
    }));

    assert.equal(hit.verdict, 'FLAKY_INFRA');
    assert.equal(hit.id, 'suite.no-results');
});

test('one dead shard beside healthy shards is an environment fact about that machine', () => {
    const hit = matchSuiteRules(makeSummary({
        totalTests: 400,
        passed: 195,
        failed: 205,
        shards: [
            {shard: '1', platform: 'ios', total: 200, passed: 195, failed: 5, skipped: 0},
            {shard: '2', platform: 'ios', total: 200, passed: 0, failed: 200, skipped: 0},
        ],
    }));

    assert.equal(hit.id, 'suite.single-shard-wiped');
    assert.equal(hit.verdict, 'FLAKY_INFRA');
});

test('a normal run with scattered failures triggers no suite rule', () => {
    assert.equal(matchSuiteRules(makeSummary()), null);
});

// ---------- volume tiers (the cost model) ----------

test('tier scales with cause count, so a catastrophic run is cheap not expensive', () => {
    const small = pickTier(makeSummary(), 5);
    const medium = pickTier(makeSummary(), 30);
    const systemic = pickTier(makeSummary(), 200);
    const broken = pickTier(makeSummary({totalTests: 600, failed: 400}), 400);

    assert.equal(small.tier, 1);
    assert.equal(medium.tier, 2);
    assert.equal(systemic.tier, 3);
    assert.equal(broken.tier, 4);
});

test('tier 3 also triggers on share, so 50 failures means different things in different suites', () => {
    // 20 of 60 is a third of the suite: systemic even though it is under the
    // absolute threshold.
    const small = pickTier(makeSummary({totalTests: 60, shards: [{shard: '1', platform: 'ios', total: 60, passed: 40, failed: 20, skipped: 0}]}), 20);

    assert.equal(small.tier, 3);
});

test('a run with no usable report is tier 4 regardless of counted failures', () => {
    const t = pickTier(makeSummary({totalTests: 0, reportsFound: 0}), 0);

    assert.equal(t.tier, 4);
});

// ---------- cluster classification ----------

test('a shard-scoped signature is not accepted from a single-test cluster', () => {
    const single = classifyCluster({
        signature_hash: 'h',
        signature_label: 'l',
        member_count: 1,
        members: [makeFailure({error_message: 'adb: device emulator-5554 offline'})],
        shards: ['1'],
        platforms: ['android'],
        specs: ['spec.ts'],
        spans_shards: false,
        spans_platforms: false,
    });

    assert.equal(single.rule_verdict, null, 'one test timing out is not "the runner died"');
    assert.equal(single.needs_ai, true);
});

test('the same signature is accepted once the cluster actually spans the shard', () => {
    const many = classifyCluster({
        signature_hash: 'h',
        signature_label: 'l',
        member_count: 12,
        members: Array.from({length: 12}, () => makeFailure({error_message: 'adb: device emulator-5554 offline'})),
        shards: ['1'],
        platforms: ['android'],
        specs: ['spec.ts'],
        spans_shards: false,
        spans_platforms: false,
    });

    assert.equal(many.rule_verdict, 'FLAKY_INFRA');
    assert.ok(many.confidence >= 0.9);
});

test('disagreeing signatures do not stack into false confidence', () => {
    // Text that matches both a device signature and a test signature.
    const mixed = classifyCluster({
        signature_hash: 'h',
        signature_label: 'l',
        member_count: 4,
        members: Array.from({length: 4}, () => makeFailure({
            error_message: 'Test Failed: View not found; element is not visible',
        })),
        shards: ['1'],
        platforms: ['ios'],
        specs: ['spec.ts'],
        spans_shards: false,
        spans_platforms: false,
    });

    assert.ok(mixed.confidence < 0.9, 'ambiguous evidence must not resolve confidently');
    assert.equal(mixed.needs_ai, true);
});

// ---------- rerun plan bounds ----------

test('rerun is capped by cluster representatives, not by failure count', () => {
    const clusters = Array.from({length: 6}, (_, i) => ({
        signature_hash: `sig${i}`,
        confidence: 0,
        members: Array.from({length: 40}, (__, j) => makeFailure({
            spec: `detox/e2e/test/spec_${i}_${j}.e2e.ts`,
        })),
    }));

    const plan = buildRerunPlan(clusters, 2);

    assert.ok(plan.enabled);
    assert.ok(plan.specs.length <= 8, `expected <= 8 specs, got ${plan.specs.length}`);

    // Two per cluster is the per-cluster cap.
    const perCluster = plan.specs.filter((s) => s.signature_hash === 'sig0').length;
    assert.ok(perCluster <= 2);
});

test('systemic runs skip the rerun entirely — that is the whole cost argument', () => {
    const plan = buildRerunPlan([{signature_hash: 'x', confidence: 0, members: [makeFailure()]}], 3);

    assert.equal(plan.enabled, false);
    assert.match(plan.reason, /systemic/);
});

test('a confidently-classified cluster is not rerun to prove what rules already said', () => {
    const plan = buildRerunPlan([{signature_hash: 'x', confidence: 0.95, members: [makeFailure()]}], 1);

    assert.equal(plan.enabled, false);
    assert.equal(plan.resolved_by_rules, 1);
});

test('rerun prefers members carrying a stable test ID', () => {
    const plan = buildRerunPlan([{
        signature_hash: 'x',
        confidence: 0,
        members: [
            makeFailure({test_id: null, spec: 'detox/e2e/test/no_id.e2e.ts'}),
            makeFailure({test_id: 'MM-T4783_1', spec: 'detox/e2e/test/with_id.e2e.ts'}),
        ],
    }], 1, {maxSpecsPerCluster: 1});

    assert.equal(plan.specs.length, 1);
    assert.equal(plan.specs[0].test_id, 'MM-T4783_1');
});

// ---------- end-to-end classify ----------

test('too many distinct clusters is itself evidence of one systemic cause', () => {
    const failures = Array.from({length: 12}, (_, i) => makeFailure({
        signature_hash: `sig${i}`,
        error_message: `unique failure ${i}`,
    }));

    const result = classify({summary: makeSummary({failed: 12}), failures});

    assert.equal(result.tier, 3);
    assert.match(result.tier_reason, /systemic/);
});

test('classify surfaces a suite verdict that outranks per-cluster ones', () => {
    const result = classify({
        summary: makeSummary({
            totalTests: 0,
            passed: 0,
            failed: 0,
            shards: [{shard: '1', platform: 'ios', total: 0, passed: 0, failed: 0, skipped: 0}],
        }),
        failures: [],
    });

    assert.equal(result.suite_verdict.verdict, 'FLAKY_INFRA');
    assert.equal(result.needs_ai, false, 'a decided suite verdict needs no model call');
});

// ---------- report parsing ----------

test('parseJestResults extracts failures and per-shard totals', () => {
    const dir = tmpdir();
    const shardDir = path.join(dir, 'ios-results-abc123-3');
    fs.mkdirSync(shardDir, {recursive: true});
    fs.writeFileSync(path.join(shardDir, 'jest-results.json'), JSON.stringify({
        testResults: [{
            name: '/repo/detox/e2e/test/products/channels/messaging/post.e2e.ts',
            assertionResults: [
                {fullName: 'MM-T1000_1 posts a message', status: 'passed', duration: 10},
                {
                    fullName: 'MM-T1000_2 edits a message',
                    status: 'failed',
                    duration: 300000,
                    failureMessages: ['Timeout - Async callback was not invoked within 300000ms'],
                },
                {fullName: 'MM-T1000_3 deletes', status: 'pending'},
            ],
        }],
    }));

    const result = parseJestResults(path.join(shardDir, 'jest-results.json'), dir);

    assert.equal(result.shard.shard, '3', 'shard comes from the artifact name suffix');
    assert.equal(result.shard.platform, 'ios');
    assert.deepEqual(
        [result.shard.total, result.shard.passed, result.shard.failed, result.shard.skipped],
        [3, 1, 1, 1],
    );
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].test_id, 'MM-T1000_2');
    assert.equal(result.failures[0].error_type, 'Timeout');

    fs.rmSync(dir, {recursive: true, force: true});
});

test('a suite that died before any assertion is still recorded as a failure', () => {
    const dir = tmpdir();
    fs.mkdirSync(path.join(dir, 'android-results-x-1'), {recursive: true});
    const file = path.join(dir, 'android-results-x-1', 'jest-results.json');
    fs.writeFileSync(file, JSON.stringify({
        testResults: [{
            name: '/repo/detox/e2e/test/a.e2e.ts',
            assertionResults: [],
            message: 'DetoxRuntimeError: adb: device emulator-5554 offline',
        }],
    }));

    const result = parseJestResults(file, dir);

    assert.equal(result.failures.length, 1, 'dropping this is how a dead shard becomes invisible');
    assert.equal(result.failures[0].suite_level, true);

    fs.rmSync(dir, {recursive: true, force: true});
});

test('parseMaestroReport reads JUnit XML and decodes entities', () => {
    const dir = tmpdir();
    fs.mkdirSync(path.join(dir, 'maestro-ios-results-1'), {recursive: true});
    const file = path.join(dir, 'maestro-ios-results-1', 'maestro-report.xml');
    fs.writeFileSync(file, [
        '<?xml version="1.0"?>',
        '<testsuites><testsuite name="flows">',
        '<testcase name="MM-T67856_4 login" time="12.5">',
        '<failure message="Element not found: &quot;login&quot;">assertion &lt;failed&gt;</failure>',
        '</testcase>',
        '<testcase name="MM-T67856_5 logout" time="3.0"/>',
        '<testcase name="MM-T67856_6 skipped"><skipped/></testcase>',
        '</testsuite></testsuites>',
    ].join('\n'));

    const result = parseMaestroReport(file, dir);

    assert.equal(result.shard.total, 3);
    assert.equal(result.shard.failed, 1);
    assert.equal(result.shard.skipped, 1);
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].test_id, 'MM-T67856_4');
    assert.match(result.failures[0].error_message, /Element not found: "login"/);
    assert.match(result.failures[0].error_message, /assertion <failed>/);
    assert.equal(result.failures[0].duration_ms, 12500);

    fs.rmSync(dir, {recursive: true, force: true});
});

test('a malformed report yields no failures rather than throwing', () => {
    const dir = tmpdir();
    fs.mkdirSync(path.join(dir, 'ios-results-x-1'), {recursive: true});
    const file = path.join(dir, 'ios-results-x-1', 'jest-results.json');
    fs.writeFileSync(file, 'not json at all');

    const result = parseJestResults(file, dir);

    assert.equal(result.failures.length, 0);
    assert.match(result.error, /unreadable/);

    fs.rmSync(dir, {recursive: true, force: true});
});

test('collect walks a multi-shard artifact tree and aggregates the summary', () => {
    const dir = tmpdir();
    for (const shard of ['1', '2']) {
        const shardDir = path.join(dir, `ios-results-abc-${shard}`);
        fs.mkdirSync(shardDir, {recursive: true});
        fs.writeFileSync(path.join(shardDir, 'jest-results.json'), JSON.stringify({
            testResults: [{
                name: `/repo/detox/e2e/test/s${shard}.e2e.ts`,
                assertionResults: [
                    {fullName: `MM-T${shard}00_1 ok`, status: 'passed', duration: 5},
                    {
                        fullName: `MM-T${shard}00_2 bad`,
                        status: 'failed',
                        duration: 9,
                        failureMessages: ['adb: device emulator-5554 offline'],
                    },
                ],
            }],
        }));
    }

    const {summary, failures} = collect(dir);

    assert.equal(summary.reportsFound, 2);
    assert.equal(summary.totalTests, 4);
    assert.equal(summary.failed, 2);
    assert.equal(failures.length, 2);

    // Same underlying cause on both shards → one cluster.
    assert.equal(new Set(failures.map((f) => f.signature_hash)).size, 1);

    fs.rmSync(dir, {recursive: true, force: true});
});

test('collect on an empty tree reports nothing found rather than crashing', () => {
    const dir = tmpdir();

    const {summary, failures} = collect(dir);

    assert.equal(summary.reportsFound, 0);
    assert.equal(failures.length, 0);
    assert.equal(pickTier(summary, 0).tier, 4, 'no reports must fail closed to tier 4');

    fs.rmSync(dir, {recursive: true, force: true});
});

test('a spec that failed to compile is a build error, not a pile of flaky tests', () => {
    // Every test in an uncompilable file "fails" without one assertion running.
    // Left as test failures they pollute the flake statistics of tests that never
    // executed, and hide the single file that actually needs fixing.
    for (const text of [
        'error TS2551: Property does not exist on type',
        'Your test suite must contain at least one test.',
        "Cannot find module '@support/ui/screen' from 'channel.e2e.ts'",
    ]) {
        const ids = matchSignatures(text, {framework: 'detox'}).map((m) => m.id);
        assert.ok(ids.includes('build.spec-compile'), `${text} should match build.spec-compile`);
    }
});

test('a lost Maestro driver is recognised, and only for Maestro', () => {
    const ids = matchSignatures('Unable to launch app com.mattermost.rn', {framework: 'maestro'}).
        map((m) => m.id);
    assert.ok(ids.includes('device.maestro-driver-lost'));

    // Detox has its own connection signatures; the Maestro phrasing must not
    // widen them, or a real Detox app-launch crash gets excused as infra.
    const detoxIds = matchSignatures('Unable to launch app com.mattermost.rn', {framework: 'detox'}).
        map((m) => m.id);
    assert.ok(!detoxIds.includes('device.maestro-driver-lost'));
});
