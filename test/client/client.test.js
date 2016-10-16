// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import TestHelper from 'test_helper.js';

describe('Client', () => {
    it('doFetch', (done) => {
        const client = TestHelper.createClient();

        client.doFetch(
            `${client.getGeneralRoute()}/ping`,
            {},
            () => {
                done();
            },
            (err) => {
                done(new Error(err));
            }
        );
    });
});
