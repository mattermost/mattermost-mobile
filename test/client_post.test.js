// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import TestHelper from './test_helper.js';

describe('Client.Post', () => {
    it('createPost', (done) => {
        TestHelper.initBasic(({client, channel}) => {
            const post = TestHelper.fakePost(channel.id);

            client.createPost(
                post,
                null,
                (data) => {
                    assert.ok(data.id, 'id is empty');

                    done();
                },
                (err) => {
                    done(new Error(err));
                }
            );
        });
    });
});
