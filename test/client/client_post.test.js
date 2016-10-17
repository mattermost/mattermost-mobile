// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import TestHelper from 'test_helper.js';

describe('Client.Post', () => {
    it('createPost', async () => {
        const {client, channel} = await TestHelper.initBasic();
        const post = TestHelper.fakePost(channel.id);

        const rpost = await client.createPost(post);

        assert.ok(rpost.id, 'id is empty');
    });
});
