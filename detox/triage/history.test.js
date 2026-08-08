// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const assert = require('node:assert/strict');
const {test} = require('node:test');

const {enrich} = require('./history');

function classified(memberTestIds) {
    return {
        clusters: [{
            signature_hash: 'cluster-1',
            member_test_ids: memberTestIds,
            member_count: memberTestIds.length,
        }],
    };
}

function mockTsio(t, responses = {}) {
    const originalFetch = global.fetch;
    t.after(() => {
        global.fetch = originalFetch;
    });
    global.fetch = async (url) => {
        const endpoint = new URL(url).pathname;
        const response = responses[endpoint] || {status: 200, data: {}};
        return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            statusText: response.status === 200 ? 'OK' : 'Unavailable',
            json: async () => response.data,
        };
    };
}

test('a cluster without stable test IDs is ineligible for amnesty', async (t) => {
    mockTsio(t);

    const result = await enrich(classified([]), {
        repo: 'mattermost/mattermost-mobile',
    });
    const cluster = result.clusters[0];

    assert.equal(cluster.has_stable_test_ids, false);
    assert.equal(cluster.amnesty_ineligible, true);
    assert.equal(cluster.amnesty_exhausted, true);
    assert.equal(result.history_meta.looked_up, 0);
});

test('available history and granted amnesty remain eligible', async (t) => {
    mockTsio(t, {
        '/api/v1/tests/history': {
            status: 200,
            data: {summary: {failing_since_commit: 'abc123'}},
        },
        '/api/v1/tests/failing-elsewhere': {status: 200, data: {distinct_prs: 1}},
        '/api/v1/triage/amnesty': {status: 200, data: {granted: true}},
    });

    const result = await enrich(classified(['MM-T1000']), {
        repo: 'mattermost/mattermost-mobile',
    });
    const cluster = result.clusters[0];

    assert.equal(cluster.amnesty_ineligible, false);
    assert.equal(cluster.amnesty_unavailable, false);
    assert.equal(cluster.amnesty_exhausted, false);
});

test('a mixed identified and unidentified cluster is ineligible for amnesty', async (t) => {
    mockTsio(t, {
        '/api/v1/tests/history': {
            status: 200,
            data: {summary: {failing_since_commit: 'abc123'}},
        },
        '/api/v1/tests/failing-elsewhere': {status: 200, data: {distinct_prs: 1}},
        '/api/v1/triage/amnesty': {status: 200, data: {granted: true}},
    });

    const input = classified(['MM-T1000']);
    input.clusters[0].member_count = 2;
    const result = await enrich(input, {repo: 'mattermost/mattermost-mobile'});
    const cluster = result.clusters[0];

    assert.equal(cluster.has_stable_test_ids, true);
    assert.equal(cluster.all_members_have_stable_test_ids, false);
    assert.equal(cluster.amnesty_ineligible, true);
    assert.equal(cluster.amnesty_exhausted, true);
});

test('unavailable history keeps amnesty exhausted even when amnesty grants it', async (t) => {
    mockTsio(t, {
        '/api/v1/tests/history': {status: 503},
        '/api/v1/tests/failing-elsewhere': {status: 200, data: {distinct_prs: 0}},
        '/api/v1/triage/amnesty': {status: 200, data: {granted: true}},
    });

    const result = await enrich(classified(['MM-T1000']), {
        repo: 'mattermost/mattermost-mobile',
    });
    const cluster = result.clusters[0];

    assert.equal(cluster.has_stable_test_ids, true);
    assert.equal(cluster.amnesty_unavailable, false);
    assert.equal(cluster.amnesty_exhausted, true);
    assert.equal(result.history_meta.unavailable, 1);
});

test('unavailable amnesty remains exhausted', async (t) => {
    mockTsio(t, {
        '/api/v1/tests/history': {
            status: 200,
            data: {summary: {failing_since_commit: 'abc123'}},
        },
        '/api/v1/tests/failing-elsewhere': {status: 200, data: {distinct_prs: 2}},
        '/api/v1/triage/amnesty': {status: 503},
    });

    const result = await enrich(classified(['MM-T1000']), {
        repo: 'mattermost/mattermost-mobile',
    });
    const cluster = result.clusters[0];

    assert.equal(cluster.amnesty_unavailable, true);
    assert.equal(cluster.amnesty_exhausted, true);
});
