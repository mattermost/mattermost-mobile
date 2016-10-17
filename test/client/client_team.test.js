// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import TestHelper from 'test_helper.js';

describe('Client.Team', () => {
    it('createTeam', async () => {
        const client = TestHelper.createClient();
        const team = TestHelper.fakeTeam();

        const rteam = await client.createTeam(team);

        assert.equal(rteam.id.length > 0, true);
        assert.equal(rteam.name, team.name);
    });
});
