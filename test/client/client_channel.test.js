// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import TestHelper from 'test_helper.js';

describe('Client.Channel', () => {
    it('createChannel', async () => {
        const {client, team} = await TestHelper.initBasic();
        const channel = TestHelper.fakeChannel(team.id);

        const rchannel = await client.createChannel(channel);

        assert.ok(rchannel.id, 'id is empty');
        assert.equal(rchannel.name, channel.name, 'name doesn\'t match');
        assert.equal(rchannel.team_id, channel.team_id, 'team id doesn\'t match');
    });
});
