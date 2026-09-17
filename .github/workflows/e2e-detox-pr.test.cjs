// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {it} = require('node:test');
const vm = require('node:vm');
const yaml = require('js-yaml');

const workflow = yaml.load(readFileSync(path.join(__dirname, 'e2e-detox-pr.yml'), 'utf8'));
const sha = 'a'.repeat(40);
const newerSha = 'b'.repeat(40);
const prIdentity = /^E2E PR #(\d+) @ ([a-f0-9]{40})$/;

// These workflow expressions use the common JS/Actions subset plus format().
function evaluate(expression, inputs, extra = {}) {
    const source = expression.replace(/^\$\{\{\s*|\s*\}\}$/g, '').replace(/\bneeds\.([a-z][a-z0-9-]*)/g, 'needs["$1"]');
    return vm.runInNewContext(source, {
        inputs: {run_type: 'PR', pr_number: '42', MOBILE_VERSION: sha, version_name: 'feature', ...inputs},
        github: {ref_name: 'main'},
        format: (template, ...args) => template.replace(/\{(\d+)\}/g, (_, index) => args[index]),
        ...extra,
    });
}

it('should pin every PR-tree consumer to the dispatched SHA and retain origin as repository', () => {
    assert.equal(workflow.env.E2E_CHECKOUT_REF, '${{ inputs.MOBILE_VERSION }}');
    const consumers = [];
    for (const [jobId, job] of Object.entries(workflow.jobs)) {
        for (const step of job.steps || []) {
            if (!step.uses?.startsWith('actions/checkout@')) {
                continue;
            }
            assert.equal(step.with['persist-credentials'], false, jobId);
            assert.equal(step.with.repository, undefined, jobId);
            if (jobId === 'post-e2e-override-status') {
                // This action comes from the dispatch workflow, never the tested PR tree.
                assert.equal(step.with.ref, undefined);
            } else {
                assert.equal(step.with.ref, '${{ env.E2E_CHECKOUT_REF }}', jobId);
                consumers.push(jobId);
            }
        }
    }
    assert.deepEqual(consumers.sort(), [
        'build-android-apk', 'build-android-apk-maestro', 'build-ios-simulator',
        'calculate-tsio-identity', 'compute-build-fingerprints', 'provision-servers',
        'tsio-channel-notify', 'update-initial-tsio-status', 'validate-maestro-flow-headers',
    ]);
    assert.doesNotMatch(JSON.stringify(workflow), /refs\/pull\//);
});

it('should pass the same SHA through every reusable workflow to its checkouts', () => {
    const visited = new Set();
    function inspect(file) {
        if (visited.has(file)) {
            return;
        }
        visited.add(file);
        const parsed = yaml.load(readFileSync(path.join(__dirname, file), 'utf8'));
        for (const [jobId, job] of Object.entries(parsed.jobs)) {
            if (job.uses?.startsWith('./.github/workflows/')) {
                assert.equal(job.with.MOBILE_VERSION, '${{ inputs.MOBILE_VERSION }}', `${file}: ${jobId}`);
                inspect(path.basename(job.uses));
            }
            if (file !== 'e2e-detox-pr.yml') {
                for (const step of job.steps || []) {
                    if (step.uses?.startsWith('actions/checkout@')) {
                        assert.equal(step.with.ref, '${{ inputs.MOBILE_VERSION }}', `${file}: ${jobId}`);
                    }
                }
            }
        }
    }
    inspect('e2e-detox-pr.yml');
    assert.deepEqual([...visited].sort(), [
        'e2e-android-template.yml', 'e2e-detox-pr.yml', 'e2e-detox.yml',
        'e2e-ios-template.yml', 'e2e-maestro-pr.yml', 'e2e-maestro-template.yml',
    ]);
});

it('should expose a precise PR/SHA identity independent of the dispatch branch', () => {
    assert.equal(evaluate(workflow['run-name'], {}), `E2E PR #42 @ ${sha}`);
    assert.equal(evaluate(workflow['run-name'], {run_type: ''}), `E2E PR #42 @ ${sha}`);
    assert.equal(evaluate(workflow['run-name'], {MOBILE_VERSION: newerSha}), `E2E PR #42 @ ${newerSha}`);
});

it('should distinguish MAIN, MASTER, RELEASE and missing-PR dispatches from PR runs', () => {
    for (const run_type of ['MAIN', 'MASTER', 'RELEASE']) {
        const title = evaluate(workflow['run-name'], {run_type});
        assert.equal(title, `E2E ${run_type} version=feature @ ${sha}`);
        assert.doesNotMatch(title, prIdentity);
    }
    assert.doesNotMatch(evaluate(workflow['run-name'], {pr_number: '', version_name: '#42'}), prIdentity);
    assert.equal(evaluate(workflow['run-name'], {run_type: 'MAIN', version_name: ''}), `E2E MAIN version=main @ ${sha}`);
});

const cleanup = workflow.jobs['e2e-remove-matterwick-label'];
const cleanupStep = cleanup.steps.find((step) => step.uses?.startsWith('actions/github-script@'));

async function removeLabels({runs = [], currentSha = sha, env = {}, removeError} = {}) {
    const calls = {removed: [], listings: [], pulls: [], warnings: []};
    const github = {
        rest: {
            actions: {listWorkflowRuns: Symbol('listWorkflowRuns')},
            pulls: {
                get: async (args) => {
                    calls.pulls.push(args);
                    return {data: {head: {sha: currentSha}}};
                },
            },
            issues: {
                removeLabel: async (args) => {
                    calls.removed.push(args);
                    if (removeError) {
                        throw removeError;
                    }
                },
            },
        },
        paginate: async (endpoint, args) => {
            assert.equal(endpoint, github.rest.actions.listWorkflowRuns);
            assert.equal(args.workflow_id, 'e2e-detox-pr.yml');
            assert.equal(args.per_page, 100);
            assert.equal(args.branch, undefined);
            calls.listings.push(args);
            return runs.filter((run) => run.status === args.status);
        },
    };
    const context = {repo: {owner: 'mattermost', repo: 'mattermost-mobile'}, runId: 123};
    const execute = vm.runInNewContext(`(async () => {${cleanupStep.with.script}\n})`, {
        github,
        context,
        process: {env: {PR_NUMBER: '42', MOBILE_VERSION: sha, ...env}},
        core: {info() {}, warning: (message) => calls.warnings.push(message)},
        console: {log() {}},
    });
    await execute();
    return calls;
}

it('should skip cleanup for non-PR runs even when their SHA belongs to a PR', () => {
    const needs = Object.fromEntries(cleanup.needs.map((key) => [key, {result: 'success', outputs: {e2e_override: 'false'}}]));
    const extra = {needs, cancelled: () => false, fromJSON: JSON.parse, contains: (items, value) => items.includes(value)};
    for (const run_type of ['MAIN', 'MASTER', 'RELEASE']) {
        assert.equal(evaluate(cleanup.if, {run_type}, extra), false);
    }
    assert.equal(evaluate(cleanup.if, {pr_number: ''}, extra), false);
    assert.equal(evaluate(cleanup.if, {}, extra), true);
});

it('should preserve labels for an identified PR run on any dispatch branch, including later pages', async () => {
    const unrelated = Array.from({length: 100}, (_, id) => ({id: id + 1000, status: 'in_progress', display_title: `E2E PR #99 @ ${sha}`}));
    const calls = await removeLabels({runs: [...unrelated, {
        id: 456, status: 'in_progress', display_title: `E2E PR #42 @ ${newerSha}`, head_branch: 'main', head_sha: 'c'.repeat(40), pull_requests: [],
    }]});
    assert.equal(calls.removed.length, 0);
    assert.equal(calls.pulls.length, 0);
});

it('should recognize every active Actions run status', async () => {
    for (const status of ['queued', 'in_progress', 'waiting', 'requested', 'pending']) {
        const calls = await removeLabels({runs: [{id: 456, status, display_title: `E2E PR #42 @ ${sha}`}]});
        assert.equal(calls.removed.length, 0, status);
    }
});

it('should ignore MAIN, legacy, unrelated and self runs when cleaning up the current PR', async () => {
    const calls = await removeLabels({runs: [
        {id: 456, status: 'in_progress', display_title: `E2E MAIN version=main @ ${sha}`, head_sha: sha, pull_requests: [{number: 42}]},
        {id: 457, status: 'in_progress', display_title: 'E2E', head_sha: sha, pull_requests: [{number: 42}]},
        {id: 458, status: 'in_progress', display_title: `E2E PR #99 @ ${sha}`, head_branch: 'main'},
        {id: 123, status: 'in_progress', display_title: `E2E PR #42 @ ${sha}`},
    ]});
    assert.equal(calls.pulls.length, 1);
    assert.equal(calls.pulls[0].pull_number, 42);
    assert.deepEqual(calls.removed.map(({name}) => name), ['E2E/Run', 'E2E/Run-iOS', 'E2E/Run-Android']);
    assert.ok(calls.removed.every(({issue_number}) => issue_number === 42));
});

it('should preserve labels if the PR advanced after this run was dispatched', async () => {
    const calls = await removeLabels({currentSha: newerSha});
    assert.equal(calls.pulls.length, 1);
    assert.equal(calls.removed.length, 0);
});

it('should reject malformed or missing PR identity without inferring another PR', async () => {
    for (const PR_NUMBER of ['', '42junk', '-42']) {
        const calls = await removeLabels({env: {PR_NUMBER}});
        assert.equal(calls.removed.length, 0);
        assert.equal(calls.listings.length, 0);
        assert.equal(calls.pulls.length, 0);
    }
});

it('should tolerate missing labels but surface real removal errors', async () => {
    const calls = await removeLabels({removeError: {status: 404}});
    assert.equal(calls.removed.length, 3);
    await assert.rejects(removeLabels({removeError: new Error('permission denied')}), /permission denied/);
});
