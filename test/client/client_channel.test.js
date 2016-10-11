// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import TestHelper from 'test_helper.js';

describe('Client.Channel', () => {
    it('createChannel', (done) => {
        TestHelper.initBasic(({client, team}) => {
            const channel = TestHelper.fakeChannel(team.id);

            client.createChannel(
                channel,
                null,
                (data) => {
                    assert.ok(data.id, 'id is empty');
                    assert.equal(data.name, channel.name, 'name doesn\'t match');
                    assert.equal(data.team_id, channel.team_id, 'team id doesn\'t match');

                    done();
                },
                (err) => {
                    done(new Error(err));
                }
            );
        });
    });
});
