// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const yaml = require('js-yaml');

const workflow = yaml.load(fs.readFileSync(path.join(__dirname, 'build-pr.yml'), 'utf8'));

async function authorize({permission = 'write', push, state = 'open', sha = 'reviewed-sha', labels = ['Build App for iOS'], sender = 'reviewer', permissionError} = {}) {
    const script = workflow.jobs['authorize-build'].steps[0].with.script;
    const failures = [];
    const permissionQueries = [];
    const pullQueries = [];
    const context = {
        eventName: 'pull_request_target',
        repo: {owner: 'mattermost', repo: 'mattermost-mobile'},
        payload: {
            action: 'labeled',
            sender: sender ? {login: sender} : undefined,
            label: {name: 'Build App for iOS'},
            pull_request: {number: 123, head: {sha: 'reviewed-sha'}},
        },
    };
    const github = {
        rest: {
            repos: {
                getCollaboratorPermissionLevel: async (params) => {
                    permissionQueries.push(params);
                    if (permissionError) {
                        throw permissionError;
                    }
                    return {data: {permission, user: {permissions: {push}}}};
                },
            },
            pulls: {
                get: async (params) => {
                    pullQueries.push(params);
                    return {data: {state, head: {sha}, labels: labels.map((name) => ({name}))}};
                },
            },
        },
    };
    await vm.runInNewContext(`(async () => {${script}\n})()`, {
        context,
        github,
        core: {setFailed: (message) => failures.push(message), info: () => {}},
    });
    return {failures, permissionQueries, pullQueries};
}

test('permits reviewers with code write access and resolves the labeling sender', async () => {
    for (const permission of ['write', 'maintain', 'admin', 'push']) {
        const result = await authorize({permission});
        assert.deepEqual(result.failures, []);
        assert.equal(result.permissionQueries[0].username, 'reviewer');
        assert.equal(result.pullQueries[0].pull_number, 123);
    }
    assert.deepEqual((await authorize({permission: 'custom-build-reviewer', push: true})).failures, []);
});

test('rejects triage and read access before loading the PR', async () => {
    for (const permission of ['triage', 'read', 'none']) {
        const result = await authorize({permission});
        assert.equal(result.failures.length, 1);
        assert.equal(result.pullQueries.length, 0);
    }
});

test('rejects missing sender and fails closed when permission lookup fails', async () => {
    assert.equal((await authorize({sender: ''})).failures.length, 1);
    await assert.rejects(authorize({permissionError: new Error('API unavailable')}), /API unavailable/);
});

test('rejects a newer head even when the original build label remains', async () => {
    assert.match((await authorize({sha: 'unreviewed-sha'})).failures[0], /head.*changed/i);
});

test('rejects closed PRs and removed build labels', async () => {
    assert.equal((await authorize({state: 'closed'})).failures.length, 1);
    assert.equal((await authorize({labels: ['Build App for Android']})).failures.length, 1);
});

test('all code execution depends on authorization and uses the reviewed event SHA', () => {
    assert.deepEqual(workflow.on.pull_request_target.types, ['labeled']);
    const guard = workflow.jobs['authorize-build'];
    assert.equal(guard.steps.some((step) => step.uses?.startsWith('actions/checkout@')), false);
    assert.deepEqual(guard.permissions, {'pull-requests': 'read'});
    for (const jobName of ['test', 'build-ios-pr', 'build-android-pr']) {
        const job = workflow.jobs[jobName];
        assert.ok(job.needs.includes('authorize-build'), `${jobName} requires authorization`);
        const checkout = job.steps.find((step) => step.uses?.startsWith('actions/checkout@'));
        assert.equal(checkout.with.ref, '${{ github.event.pull_request.head.sha }}');
        assert.equal(checkout.with['persist-credentials'], false);
    }
});
