// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import TestHelper from 'test_helper.js';

describe('Client', () => {
    it('doFetch', async () => {
        const client = TestHelper.createClient();

        return client.doFetch(`${client.getGeneralRoute()}/ping`, {});
    });
});
