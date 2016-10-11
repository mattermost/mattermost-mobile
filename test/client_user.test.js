// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import TestHelper from './test_helper.js';

describe('Client.User', () => {
    it('createUser', (done) => {
        const client = TestHelper.createClient();
        const user = TestHelper.fakeUser();

        client.createUser(
            null,
            (data) => {
                assert.ok(data.id, 'id is empty');
                assert.equal(data.email, user.email, 'email addresses aren\'t equal');

                done();
            },
            (err) => {
                done(new Error(err));
            },
            user
        );
    });

    it('login', (done) => {
        const client = TestHelper.createClient();
        const user = TestHelper.fakeUser();

        client.createUser(
            null,
            () => {
                client.login(
                    null,
                    (data) => {
                        assert.ok(data.id, 'id is empty');
                        assert.equal(data.email, user.email, 'email addresses aren\'t equal');
                        assert.ok(client.token, 'token is empty');

                        done();
                    },
                    (err) => {
                        done(new Error(err));
                    },
                    user.email,
                    user.password
                );
            },
            (err) => {
                done(new Error(err));
            },
            user
        );
    });

    it('getInitialLoad', (done) => {
        TestHelper.initBasic(({client, user}) => {
            client.getInitialLoad(
                null,
                (data) => {
                    assert.ok(data.user.id.length, 'id is empty');
                    assert.equal(data.user.id, user.id, 'user ids don\'t match');

                    done();
                },
                (err) => {
                    done(new Error(err));
                }
            );
        });
    });
});
