// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import fetchMock from 'fetch_mock';
import TestHelper from 'test_helper.js';

const fakeNotFoundResp = {
    status: 404,
    body: {
        id: 'api.context.404.app_error',
        message: 'Sorry, we could not find the page.',
        detailed_error: [
            "There doesn't appear to be an api call for the url='/api/v3/fake/url/general/ping'.",
            'Typo? are you missing a team_id or user_id as part of the url?'
        ].join('  '),
        status_code: 404
    }
};

fetchMock.get(/\/ping/, (url) => {
    if (url.match(/\/fake\/url/)) {
        return fakeNotFoundResp;
    }
    return {
        server_time: `${Date.now()}`,
        version: '3.4.0'
    };
});

fetchMock.post(/\/log_client/, {
    status: 200,
    headers: {'Content-Type': 'application/json'},
    body: {status: 'OK'}
});

describe('Client', () => {
    it('doFetch', async () => {
        const client = TestHelper.createClient();

        return client.doFetch(`${client.getGeneralRoute()}/ping`, {});
    });
});
