// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'actions/teams';
import Client from 'client';
import configureStore from 'store/configureStore';
import {RequestStatus} from 'constants';
import TestHelper from 'test_helper';

describe('Actions.Teams', () => {
    it('fetchTeams', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const teamsRequest = store.getState().requests.teams.allTeams;
                const teams = store.getState().entities.teams.teams;

                if (teamsRequest.status === RequestStatus.SUCCESS || teamsRequest.status === RequestStatus.FAILURE) {
                    if (teamsRequest.error) {
                        done(new Error(JSON.stringify(teamsRequest.error)));
                    } else {
                        assert.ok(teams);
                        assert.ok(teams[TestHelper.basicTeam.id]);
                        done();
                    }
                }
            });

            Actions.fetchTeams()(store.dispatch, store.getState);
        });
    });

    it('selectTeam', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const currentTeamId = store.getState().entities.teams.currentId;
                assert.ok(currentTeamId);
                assert.equal(currentTeamId, TestHelper.basicTeam.id);
                done();
            });

            Actions.selectTeam(TestHelper.basicTeam)(store.dispatch, store.getState);
        });
    });
});
