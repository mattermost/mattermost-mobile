// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import TestHelper from './test_helper.js';

describe('Client.Team', () => {
    it('createTeam', (done) => {
        const client = TestHelper.createClient();
        const team = TestHelper.fakeTeam();

        client.createTeam(
            team,
            null,
            (data) => {
                assert.equal(data.id.length > 0, true);
                assert.equal(data.name, team.name);

                done();
            },
            (err) => {
                done(new Error(err));
            }
        );
    });
});
