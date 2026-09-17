// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {it} = require('node:test');
const vm = require('node:vm');
const yaml = require('js-yaml');

const workflow = yaml.load(fs.readFileSync(path.join(__dirname, 'e2e-label-manager.yml'), 'utf8'));
const currentSha = 'a'.repeat(40);
const oldSha = 'b'.repeat(40);
const workflowSha = 'c'.repeat(40);
const prNumber = 42;

function harness({fork = true, labels = [], current = currentSha, state = 'open', runs = []} = {}) {
    const calls = {removed: [], added: [], cancelled: [], statuses: [], output: {}, listed: []};
    const pr = {number: prNumber, state, head: {sha: current, repo: {full_name: fork ? 'contributor/mobile' : 'mattermost/mobile'}}, labels: labels.map((name) => ({name}))};
    const listLabelsOnIssue = Symbol('labels');
    const listWorkflowRuns = Symbol('runs');
    const github = {
        rest: {
            pulls: {get: async () => ({data: pr})},
            issues: {
                listLabelsOnIssue,
                removeLabel: async ({name}) => calls.removed.push(name),
                addLabels: async ({labels: names}) => calls.added.push(...names),
            },
            actions: {
                listWorkflowRuns,
                listRepoWorkflows: async () => ({data: {workflows: [{id: 7, path: '.github/workflows/e2e-detox-pr.yml'}]}}),
                cancelWorkflowRun: async ({run_id: id}) => calls.cancelled.push(id),
            },
            repos: {
                createCommitStatus: async (args) => calls.statuses.push(args),
                listPullRequestsAssociatedWithCommit: async () => {
                    assert.fail('A commit association cannot establish dispatch ownership');
                },
            },
        },
        paginate: async (method, args) => {
            if (method === listLabelsOnIssue) return pr.labels;
            assert.equal(method, listWorkflowRuns);
            assert.equal(args.branch, undefined);
            assert.equal(args.per_page, 100);
            calls.listed.push(args.status);
            return runs.filter((run) => run.status === args.status);
        },
        request: async (_route, args) => {
            assert.ok(calls.cancelled.includes(args.run_id));
        },
    };
    const context = {repo: {owner: 'mattermost', repo: 'mobile'}, payload: {pull_request: {...pr, head: {...pr.head, sha: currentSha}}}};
    const core = {info() {}, warning() {}, setOutput: (key, value) => { calls.output[key] = value; }};
    const execute = async (job, stepName) => {
        const steps = workflow.jobs[job].steps;
        const step = stepName ? steps.find((item) => item.name === stepName) : steps.find((item) => item.with?.script);
        await vm.runInNewContext(`(async () => {${step.with.script}\n})()`, {github, context, core});
        return calls;
    };
    return {execute, calls};
}

function run(id, number, sha, status = 'in_progress') {
    return {id, status, display_title: `E2E PR #${number} @ ${sha}`, head_sha: workflowSha, head_branch: 'main', pull_requests: []};
}

it('should revoke fork approval on push without dispatching the new SHA', async () => {
    const {execute} = harness({labels: ['E2E/Run-Android', 'kind/bug']});
    const calls = await execute('refresh-e2e-run-label');
    assert.deepEqual(calls.removed, ['E2E/Run-Android']);
    assert.deepEqual(calls.added, []);
});

it('should leave an unapproved fork without a run label', async () => {
    const calls = await harness().execute('refresh-e2e-run-label');
    assert.deepEqual(calls.removed, []);
    assert.deepEqual(calls.added, []);
});

it('should refresh same-repository E2E on synchronize', async () => {
    const calls = await harness({fork: false, labels: ['E2E/Run-iOS']}).execute('refresh-e2e-run-label');
    assert.deepEqual(calls.removed, ['E2E/Run', 'E2E/Run-iOS', 'E2E/Run-Android']);
    assert.deepEqual(calls.added, ['E2E/Run']);
});

it('should add same-repository E2E on open and avoid duplicate labels', async () => {
    const first = await harness({fork: false}).execute('add-e2e-run-label');
    assert.deepEqual(first.added, ['E2E/Run']);
    const duplicate = await harness({fork: false, labels: ['E2E/Run']}).execute('add-e2e-run-label');
    assert.deepEqual(duplicate.added, []);
    assert.match(workflow.jobs['add-e2e-run-label'].if, /head\.repo\.full_name == github\.repository/);
});

it('should preserve same-repository Override without dispatching', async () => {
    const calls = await harness({fork: false, labels: ['E2E/Override', 'E2E/Run']}).execute('refresh-e2e-run-label');
    assert.deepEqual(calls.removed, ['E2E/Run']);
    assert.deepEqual(calls.added, []);
    assert.equal(calls.output.e2e_override, 'true');
});

it('should not repost Override success onto a new unreviewed fork SHA', async () => {
    const calls = await harness({labels: ['E2E/Override', 'E2E/Run']}).execute('refresh-e2e-run-label');
    assert.deepEqual(calls.removed, ['E2E/Run']);
    assert.deepEqual(calls.added, []);
    assert.equal(calls.output.e2e_override, undefined);
});

it('should ignore superseded and closed PR refresh events', async () => {
    for (const options of [{current: oldSha}, {state: 'closed'}]) {
        const calls = await harness({...options, labels: ['E2E/Run']}).execute('refresh-e2e-run-label');
        assert.deepEqual(calls.removed, []);
        assert.deepEqual(calls.added, []);
    }
});

it('should cancel only stale exact-PR runs and update the tested SHA, not the workflow SHA', async () => {
    const runs = [
        run(1, prNumber, oldSha), run(2, prNumber, currentSha), run(3, 43, oldSha),
        {...run(4, prNumber, oldSha), display_title: 'E2E MAIN main @ ' + oldSha, pull_requests: [{number: prNumber}]},
        {...run(5, prNumber, oldSha), display_title: 'legacy unidentified run', head_sha: oldSha},
        run(6, prNumber, oldSha, 'pending'),
    ];
    const calls = await harness({runs}).execute('cancel-stale-e2e-on-push');
    assert.deepEqual(calls.cancelled, [1, 6]);
    assert.deepEqual(calls.listed, ['in_progress', 'queued', 'waiting', 'pending', 'requested']);
    assert.equal(calls.statuses.length, 5);
    assert.ok(calls.statuses.every((status) => status.sha === oldSha));
});

it('should cancel exact-PR runs on Override without cancelling MAIN or other forks sharing a ref', async () => {
    const runs = [run(1, prNumber, currentSha), run(2, 43, currentSha), {...run(3, prNumber, currentSha), display_title: 'E2E MAIN main @ ' + currentSha}];
    const calls = await harness({runs}).execute('e2e-label-manager', 'Cancel in-flight E2E runs');
    assert.deepEqual(calls.cancelled, [1]);
    assert.deepEqual(calls.statuses, []);
});

it('should not cancel a newer run from a superseded synchronize event', async () => {
    const calls = await harness({current: oldSha, runs: [run(1, prNumber, oldSha)]}).execute('cancel-stale-e2e-on-push');
    assert.deepEqual(calls.cancelled, []);
    assert.deepEqual(calls.statuses, []);
});

it('should isolate harmless label events but serialize Override/Verified with head updates', () => {
    const expression = [...workflow.concurrency.group.matchAll(/\$\{\{(.*?)\}\}/g)][1][1];
    const group = (name) => vm.runInNewContext(expression, {
        github: {event: {label: {name}}},
        contains: (values, value) => values.includes(value),
        fromJSON: JSON.parse,
    });
    for (const name of ['E2E/Run', 'E2E/Run-iOS', 'E2E/Run-Android', 'kind/bug']) {
        assert.equal(group(name), 'labels');
    }
    for (const name of ['', 'E2E/Override', 'E2E/Verified']) {
        assert.equal(group(name), 'head');
    }
});

it('should never mutate origin refs and should load local actions only from the default branch', () => {
    assert.equal(workflow.jobs['mirror-fork-head'], undefined);
    assert.equal(workflow.jobs['delete-fork-mirror'], undefined);
    for (const job of Object.values(workflow.jobs)) {
        assert.notEqual(job.permissions?.contents, 'write');
        for (const step of job.steps || []) {
            if (step.uses?.startsWith('actions/checkout@')) {
                assert.equal(step.with.ref, '${{ github.sha }}');
                assert.equal(step.with['persist-credentials'], false);
                assert.equal(job.permissions.contents, 'read');
            }
            assert.doesNotMatch(step.with?.script || '', /git\.(?:createRef|updateRef|deleteRef)/);
        }
    }
});

it('should revoke fork labels even for a documentation-only push', () => {
    const condition = workflow.jobs['refresh-e2e-run-label'].if;
    assert.match(condition, /app_impacting == 'true' \|\| github\.event\.pull_request\.head\.repo\.full_name != github\.repository/);
});

it('should keep automatic fork AI analysis blocked and pin the reviewed toolkit revision', () => {
    const analysis = yaml.load(fs.readFileSync(path.join(__dirname, 'pr-test-analysis.yml'), 'utf8'));
    assert.match(analysis.jobs.analyze.if, /head\.repo\.full_name == github\.repository/);
    assert.match(analysis.jobs.analyze.uses, /@[a-f0-9]{40}$/);
});
