// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const {test} = require('node:test');

const {filterRerunPlan} = require('./rerun-filter');

const plan = {
    enabled: true,
    reason: 'unresolved clusters',
    reps: 2,
    specs: [
        {platform: 'ios', spec: 'shared.e2e.ts', signature_hash: 'flake'},
        {platform: 'ios', spec: 'shared.e2e.ts', signature_hash: 'product'},
        {platform: 'android', spec: 'other.e2e.ts', signature_hash: 'unknown'},
    ],
};

test('AI unavailable preserves the complete deterministic rerun plan', () => {
    const selected = filterRerunPlan(plan, null, false);

    assert.equal(selected.source, 'fallback');
    assert.deepEqual(selected.plan, plan);
});

test('malformed candidate evidence safely falls back to the complete plan', () => {
    const selected = filterRerunPlan(plan, {schema_version: 2, available: true}, true);

    assert.equal(selected.source, 'fallback');
    assert.deepEqual(selected.plan, plan);
});

test('available candidates retain only AI-nominated flaky cluster targets', () => {
    const selected = filterRerunPlan(plan, {
        schema_version: 2,
        available: true,
        verdicts: [],
        candidates: [{cluster_signature: 'flake', verdict: 'FLAKY_TEST'}],
    }, true);

    assert.equal(selected.source, 'ai');
    assert.equal(selected.plan.enabled, true);
    assert.deepEqual(selected.plan.specs, [plan.specs[0]]);
});

test('product and unresolved predictions cannot enter the flaky rerun subset', () => {
    const selected = filterRerunPlan(plan, {
        schema_version: 2,
        available: true,
        verdicts: [
            {cluster_signature: 'product', verdict: 'PR_REGRESSION'},
            {cluster_signature: 'unknown', verdict: 'INCONCLUSIVE'},
        ],
        candidates: [],
    }, true);

    assert.equal(selected.plan.enabled, false);
    assert.deepEqual(selected.plan.specs, []);
});

test('filtering preserves every target when clusters share an execution spec', () => {
    const selected = filterRerunPlan(plan, {
        schema_version: 2,
        available: true,
        verdicts: [],
        candidates: [
            {cluster_signature: 'flake', verdict: 'FLAKY_TEST'},
            {cluster_signature: 'product', verdict: 'FLAKY_INFRA'},
        ],
    }, true);

    assert.equal(selected.plan.specs.length, 2);
    assert.equal(new Set(selected.plan.specs.map((entry) => entry.spec)).size, 1);
});
