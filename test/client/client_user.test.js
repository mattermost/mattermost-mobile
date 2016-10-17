// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import TestHelper from 'test_helper.js';

describe('Client.User', () => {
    it('createUser', async () => {
        const client = TestHelper.createClient();
        const user = TestHelper.fakeUser();

        const ruser = await client.createUser(user);

        assert.ok(ruser.id, 'id is empty');
        assert.equal(ruser.email, user.email, 'email addresses aren\'t equal');
    });

    it('login', async () => {
        const client = TestHelper.createClient();
        const user = TestHelper.fakeUser();

        user.password = 'password';
        await client.createUser(user);

        const ruser = await client.login(user.email, user.password);

        assert.ok(ruser.id, 'id is empty');
        assert.equal(ruser.email, user.email, 'email addresses aren\'t equal');
        assert.ok(!ruser.password, 'returned password should be empty');
        assert.ok(client.token, 'token is empty');
    });

    it('getInitialLoad', async () => {
        const {client, user} = await TestHelper.initBasic();

        const data = await client.getInitialLoad();

        assert.ok(data.user.id.length, 'id is empty');
        assert.equal(data.user.id, user.id, 'user ids don\'t match');
    });
});
