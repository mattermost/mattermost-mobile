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

        // contentType is part of the response shape because a TSIO deployment
        // missing the triage routes answers 200 text/html from its SPA fallback,
        // not 404. A stub that only modelled status and json() could not express
        // that case, which is how it reached production unnoticed.
        const contentType = response.contentType || 'application/json';
        return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            statusText: response.status === 200 ? 'OK' : 'Unavailable',
            headers: {get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null)},
            json: async () => {
                if (!contentType.includes('json')) {
                    throw new SyntaxError('Unexpected token \'<\', "<!doctype "... is not valid JSON');
                }
                return response.data;
            },
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

// The failure that actually happened: mattermost-mobile#9996 waived two flakes
// green on 2026-08-08, then reported every flake as a regression from 2026-08-11
// once a staging redeploy replaced the TSIO build carrying these routes. The
// endpoints answered 200 text/html from the SPA fallback, so res.ok was true and
// the miss only surfaced as `Unexpected token '<'` several repositories away.
test('a TSIO deployment without the triage routes is unavailable, not valid', async (t) => {
    mockTsio(t, {
        '/api/v1/tests/history': {status: 200, contentType: 'text/html; charset=utf-8'},
        '/api/v1/tests/failing-elsewhere': {status: 200, data: {distinct_prs: 0}},
        '/api/v1/triage/amnesty': {status: 200, contentType: 'text/html; charset=utf-8'},
    });

    const result = await enrich(classified(['MM-T1000']), {
        repo: 'mattermost/mattermost-mobile',
    });
    const cluster = result.clusters[0];

    assert.equal(cluster.amnesty_unavailable, true);
    assert.equal(cluster.amnesty_exhausted, true, 'fail closed — an absent budget is not a spent one');
    assert.equal(result.history_meta.unavailable, 1);
    assert.match(
        cluster.history[0].history_error,
        /not served by this TSIO deployment/,
        'the message must name the deployment gap, not a JSON parse error',
    );
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
