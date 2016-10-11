// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import TestHelper from './test_helper.js';

describe('Client', () => {
    it('doFetch', (done) => {
        const client = TestHelper.createClient();

        let onRequestCalled = false;

        client.doFetch(
            `${client.getGeneralRoute()}/ping`,
            {},
            () => {
                onRequestCalled = true;
            },
            () => {
                assert.ok(onRequestCalled, 'onSuccess called before onRequest');

                done();
            },
            (err) => {
                done(new Error(err));
            }
        );
    });
});
