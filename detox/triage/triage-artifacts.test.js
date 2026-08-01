// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Integration-shaped triage tests: these build real artifact trees on disk and
// run the collector over them. Split from triage.test.js, which covers the pure
// classification logic.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {test} = require('node:test');

const {buildRerunPlan, classify} = require('./classify');
const {collect} = require('./collect');
const {mergeRerun, specOutcome, OUTCOME} = require('./rerun');

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

// ---------- artifact-name parsing across producers ----------

test('a Maestro run id is not mistaken for a shard index', () => {
    const dir = tmpdir();
    for (const platform of ['ios', 'android']) {
        // Maestro uploads maestro-<platform>-results-<github.run_id>. A greedy
        // trailing-number match would read that 10-digit run id as a shard and
        // give both platforms the same shard label, collapsing two machines into
        // one — which is the exact distinction the suite-shape rules turn on.
        const d = path.join(dir, `maestro-${platform}-results-1234567890`);
        fs.mkdirSync(d, {recursive: true});
        fs.writeFileSync(path.join(d, 'maestro-report.xml'),
            '<testsuites><testsuite><testcase name="MM-T1 a" time="1"><failure message="boom"/></testcase></testsuite></testsuites>');
    }

    const {summary} = collect(dir);
    const shards = summary.shards.map((s) => s.shard);

    assert.equal(new Set(shards).size, 2, `iOS and Android must stay distinct shards, got ${shards}`);

    fs.rmSync(dir, {recursive: true, force: true});
});

test('a Detox shard index is still read from the artifact suffix', () => {
    const dir = tmpdir();
    const d = path.join(dir, 'ios-results-abc123-7');
    fs.mkdirSync(d, {recursive: true});
    fs.writeFileSync(path.join(d, 'jest-results.json'), JSON.stringify({
        testResults: [{name: '/repo/a.e2e.ts', assertionResults: [{fullName: 'MM-T1 a', status: 'passed', duration: 1}]}],
    }));

    const {summary} = collect(dir);

    assert.equal(summary.shards[0].shard, '7');

    fs.rmSync(dir, {recursive: true, force: true});
});

test('artifact lookup does not rescan the tree once per failure', () => {
    const dir = tmpdir();
    const shardDir = path.join(dir, 'ios-results-abc-1');
    fs.mkdirSync(shardDir, {recursive: true});

    // A tree big enough that a per-failure rescan is measurable.
    for (let i = 0; i < 300; i++) {
        const d = path.join(shardDir, `MM-T${i} some test name`);
        fs.mkdirSync(d, {recursive: true});
        fs.writeFileSync(path.join(d, 'testFnFailure.png'), 'x');
    }
    fs.writeFileSync(path.join(shardDir, 'jest-results.json'), JSON.stringify({
        testResults: [{
            name: '/repo/a.e2e.ts',
            assertionResults: Array.from({length: 60}, (__, i) => ({
                fullName: `MM-T${i} some test name`,
                status: 'failed',
                duration: 1,
                failureMessages: [`unique failure ${i}`],
            })),
        }],
    }));

    const started = Date.now();
    const {failures} = collect(dir);
    const elapsed = Date.now() - started;

    assert.equal(failures.length, 60);
    assert.ok(failures.some((f) => f.screenshot), 'screenshots should still be resolved');
    assert.ok(elapsed < 5000, `collect took ${elapsed}ms — the per-failure rescan is back`);

    fs.rmSync(dir, {recursive: true, force: true});
});

// ---------- rerun merge: measurement overruling inference ----------

function writeRep(root, failedSpecs) {
    const d = path.join(root, 'ios-results-abc-1');
    fs.mkdirSync(d, {recursive: true});
    const assertions = [
        {fullName: 'MM-T1_0 filler', status: 'passed', duration: 1},
        ...failedSpecs.map((spec, i) => ({
            fullName: `MM-T9${i} ${spec}`,
            status: 'failed',
            duration: 1,
            failureMessages: ['boom'],
        })),
    ];
    fs.writeFileSync(path.join(d, 'jest-results.json'), JSON.stringify({
        testResults: failedSpecs.length === 0 ?[{name: '/repo/kept.e2e.ts', assertionResults: [assertions[0]]}] :failedSpecs.map((spec, i) => ({
            name: spec,
            assertionResults: [assertions[i + 1]],
        })).concat([{name: '/repo/kept.e2e.ts', assertionResults: [assertions[0]]}]),
    }));
}

function evidenceWithPlan(spec) {
    return {
        clusters: [{signature_hash: 'sig1', member_count: 1, needs_ai: true}],
        rerun_plan: {enabled: true, specs: [{platform: 'ios', spec, signature_hash: 'sig1'}], reps: 2},
    };
}

test('a failure reproducing in every repetition is deterministic', () => {
    const a = tmpdir();
    const b = tmpdir();
    const spec = path.relative(process.cwd(), '/repo/flaky.e2e.ts');
    writeRep(a, [spec]);
    writeRep(b, [spec]);

    const merged = mergeRerun(evidenceWithPlan(spec), [a, b]);

    assert.equal(merged.clusters[0].rerun.outcome, OUTCOME.DETERMINISTIC);
    assert.equal(merged.clusters[0].reproduced_on_rerun, true);

    fs.rmSync(a, {recursive: true, force: true});
    fs.rmSync(b, {recursive: true, force: true});
});

test('a failure that stops reproducing is confirmed non-deterministic', () => {
    const a = tmpdir();
    const b = tmpdir();
    const spec = path.relative(process.cwd(), '/repo/flaky.e2e.ts');
    writeRep(a, [spec]);
    writeRep(b, []);

    const merged = mergeRerun(evidenceWithPlan(spec), [a, b]);

    assert.equal(merged.clusters[0].rerun.outcome, OUTCOME.FLAKY);
    assert.equal(merged.clusters[0].reproduced_on_rerun, false);
    assert.equal(merged.clusters[0].cleared_on_rerun, true);

    fs.rmSync(a, {recursive: true, force: true});
    fs.rmSync(b, {recursive: true, force: true});
});

test('an empty rerun is inconclusive, never a pass', () => {
    // A repetition that produced no report must not be read as "it passed" —
    // that would let a rerun which never ran manufacture a flaky verdict.
    const empty = tmpdir();

    const merged = mergeRerun(evidenceWithPlan('detox/e2e/test/x.e2e.ts'), [empty]);

    assert.equal(merged.clusters[0].rerun.outcome, OUTCOME.INCONCLUSIVE);
    assert.equal(merged.clusters[0].reproduced_on_rerun, undefined);
    assert.equal(merged.rerun_meta.usable_repetitions, 0);

    fs.rmSync(empty, {recursive: true, force: true});
});

test('specOutcome ignores unusable repetitions rather than counting them as passes', () => {
    const reps = [
        {usable: true, failedSpecs: new Set(['a.ts']), failedTestIds: new Set()},
        {usable: false, failedSpecs: new Set(), failedTestIds: new Set()},
    ];

    const out = specOutcome('a.ts', null, reps);

    assert.equal(out.reps, 1);
    assert.equal(out.failed_reps, 1);
    assert.equal(out.outcome, OUTCOME.DETERMINISTIC);
});

// ---------- rerun plan must only contain things that can actually be rerun ----------

test('spec paths survive the runner boundary they are collected across', () => {
    // The Detox job runs on macOS, triage on ubuntu. A path relativized against
    // the triage job's cwd becomes ../../../Users/runner/... and then fails
    // spec_list validation, taking the whole rerun with it.
    const {toRepoRelativeSpec} = require('./collect');

    assert.equal(
        toRepoRelativeSpec('/Users/runner/work/mattermost-mobile/mattermost-mobile/detox/e2e/test/a.e2e.ts'),
        'detox/e2e/test/a.e2e.ts',
    );
    assert.equal(
        toRepoRelativeSpec('/home/runner/work/mattermost-mobile/mattermost-mobile/detox/e2e/test/b.e2e.ts'),
        'detox/e2e/test/b.e2e.ts',
    );
    assert.equal(toRepoRelativeSpec('detox/e2e/test/c.e2e.ts'), 'detox/e2e/test/c.e2e.ts');

    // Not a spec: a Maestro report path must not masquerade as one.
    assert.equal(toRepoRelativeSpec('/tmp/run/maestro-ios-results-1/maestro-report.xml'), null);
});

test('Maestro failures never enter the Detox rerun plan', () => {
    const plan = buildRerunPlan([{
        signature_hash: 'sig',
        confidence: 0,
        members: [makeFailure({
            framework: 'maestro',
            platform: 'ios',
            spec: 'build/maestro-report.xml',
            test_id: 'MM-T67856_4',
        })],
    }], 1);

    assert.equal(plan.enabled, false, 'Maestro runs named flows, not a spec list');
    assert.equal(plan.specs.length, 0);
    assert.equal(plan.skipped_non_detox, 1);
    assert.match(plan.reason, /not rerunnable by spec list/);
});

test('a mixed cluster reruns only its Detox members', () => {
    const plan = buildRerunPlan([{
        signature_hash: 'sig',
        confidence: 0,
        members: [
            makeFailure({framework: 'maestro', spec: 'build/maestro-report.xml'}),
            makeFailure({framework: 'detox', spec: 'detox/e2e/test/real.e2e.ts'}),
        ],
    }], 1);

    assert.equal(plan.enabled, true);
    assert.deepEqual(plan.specs.map((s) => s.spec), ['detox/e2e/test/real.e2e.ts']);
    assert.equal(plan.skipped_non_detox, 1);
});

test('an end-to-end Maestro-only run produces no spec list at all', () => {
    const dir = tmpdir();
    const d = path.join(dir, 'maestro-ios-results-1234567890');
    fs.mkdirSync(d, {recursive: true});
    fs.writeFileSync(path.join(d, 'maestro-report.xml'), [
        '<testsuites><testsuite name="flows">',
        '<testcase name="MM-T67856_4 login" time="1"><failure message="Element not found"/></testcase>',
        ...Array.from({length: 9}, (__, i) => `<testcase name="MM-T6785${i} ok" time="1"/>`),
        '</testsuite></testsuites>',
    ].join('\n'));

    const result = classify(collect(dir));

    assert.equal(result.rerun_plan.enabled, false);
    assert.equal(result.rerun_plan.specs.length, 0);

    fs.rmSync(dir, {recursive: true, force: true});
});

// ---------- server diagnostics turn FLAKY_SERVER from a guess into a measurement ----------

function writeDiagnostics(shardDir, {code, site = 'https://server.example'}) {
    const d = path.join(shardDir, 'server-diagnostics');
    fs.mkdirSync(d, {recursive: true});
    fs.writeFileSync(path.join(d, 'summary.txt'), [
        `ping_http_code=${code}`,
        `site_url=${site}`,
        'captured_at=2026-08-02T00:00:00Z',
        ...(code === '200' ? [] : ['verdict_hint=server-unreachable']),
        '',
    ].join('\n'));
}

function writeFailingShard(root, name) {
    const d = path.join(root, name);
    fs.mkdirSync(d, {recursive: true});
    fs.writeFileSync(path.join(d, 'jest-results.json'), JSON.stringify({
        testResults: [{
            name: '/repo/detox/e2e/test/a.e2e.ts',
            assertionResults: [
                {fullName: 'MM-T1_1 a', status: 'failed', duration: 1, failureMessages: ['element never appeared']},
                {fullName: 'MM-T1_2 b', status: 'passed', duration: 1},
                {fullName: 'MM-T1_3 c', status: 'passed', duration: 1},
                {fullName: 'MM-T1_4 d', status: 'passed', duration: 1},
                {fullName: 'MM-T1_5 e', status: 'passed', duration: 1},
                {fullName: 'MM-T1_6 f', status: 'passed', duration: 1},
                {fullName: 'MM-T1_7 g', status: 'passed', duration: 1},
                {fullName: 'MM-T1_8 h', status: 'passed', duration: 1},
                {fullName: 'MM-T1_9 i', status: 'passed', duration: 1},
                {fullName: 'MM-T1_10 j', status: 'passed', duration: 1},
            ],
        }],
    }));
    return d;
}

test('an unreachable server is read from the diagnostics, not inferred from error text', () => {
    const dir = tmpdir();
    writeDiagnostics(writeFailingShard(dir, 'ios-results-abc-1'), {code: '502'});

    const result = classify(collect(dir));

    assert.equal(result.suite_verdict.verdict, 'FLAKY_SERVER');
    assert.match(result.suite_verdict.reason, /HTTP 502/);
    assert.equal(result.needs_ai, false, 'a measured server outage needs no adjudication');

    fs.rmSync(dir, {recursive: true, force: true});
});

test('a healthy server produces no server verdict, leaving the failure to be triaged normally', () => {
    const dir = tmpdir();
    writeDiagnostics(writeFailingShard(dir, 'ios-results-abc-1'), {code: '200'});

    const result = classify(collect(dir));

    assert.equal(result.suite_verdict, null, 'the same failure text must not become a server verdict');
    assert.equal(collect(dir).summary.serverProbes[0].reachable, true);

    fs.rmSync(dir, {recursive: true, force: true});
});

test('a passing run with an unreachable probe is not called a server failure', () => {
    // Nothing failed, so there is nothing to attribute — firing here would red a
    // green run on the strength of a late-captured probe.
    const dir = tmpdir();
    const d = path.join(dir, 'ios-results-abc-1');
    fs.mkdirSync(d, {recursive: true});
    fs.writeFileSync(path.join(d, 'jest-results.json'), JSON.stringify({
        testResults: [{name: '/repo/a.e2e.ts', assertionResults: [{fullName: 'MM-T1 ok', status: 'passed', duration: 1}]}],
    }));
    writeDiagnostics(d, {code: '000'});

    const result = classify(collect(dir));

    assert.equal(result.suite_verdict, null);

    fs.rmSync(dir, {recursive: true, force: true});
});

test('missing diagnostics are simply absent, never treated as a failure signal', () => {
    const dir = tmpdir();
    writeFailingShard(dir, 'ios-results-abc-1');

    const {summary} = collect(dir);

    assert.deepEqual(summary.serverProbes, []);
    assert.equal(classify(collect(dir)).suite_verdict, null);

    fs.rmSync(dir, {recursive: true, force: true});
});
