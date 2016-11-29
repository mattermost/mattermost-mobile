// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'actions/users';
import Client from 'client';
import configureStore from 'store/configureStore';
import {RequestStatus} from 'constants';
import TestHelper from 'test_helper';

describe('Actions.Users', () => {
    it('login', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            store.subscribe(() => {
                const loginRequest = store.getState().requests.users.login;
                const currentUserId = store.getState().entities.users.currentId;
                const profiles = store.getState().entities.users.profiles;
                const preferences = store.getState().entities.users.myPreferences;

                // TODO: uncomment when PLT-4167 is merged
                // const teamMembers = store.getState().entities.teams.myMembers;

                if (loginRequest.status === RequestStatus.SUCCESS || loginRequest.status === RequestStatus.FAILURE) {
                    if (loginRequest.error) {
                        done(new Error(loginRequest.error));
                    } else {
                        assert.ok(currentUserId);
                        assert.ok(profiles);
                        assert.ok(profiles[currentUserId]);
                        assert.ok(preferences);

                        // TODO: uncomment when PLT-4167 is merged
                        // Object.keys(teamMembers).forEach((id) => {
                        //     assert.ok(teamMembers[id].team_id);
                        //     assert.equal(teamMembers[id].user_id, currentUserId);
                        // });

                        done();
                    }
                }
            });

            const user = TestHelper.basicUser;
            await TestHelper.basicClient.logout();
            Actions.login(user.email, 'password1')(store.dispatch, store.getState);
        });
    }).timeout(5000);

    it('logout', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            store.subscribe(() => {
                const logoutRequest = store.getState().requests.users.logout;
                const general = store.getState().entities.general;
                const users = store.getState().entities.users;
                const loginView = store.getState().views.login;
                const teams = store.getState().entities.teams;
                const channels = store.getState().entities.channels;
                const posts = store.getState().entities.posts;

                if (logoutRequest.status === RequestStatus.SUCCESS || logoutRequest.status === RequestStatus.FAILURE) {
                    if (logoutRequest.error) {
                        done(new Error(logoutRequest.error));
                    } else {
                        assert.deepStrictEqual(general.config, {}, 'config not empty');
                        assert.deepStrictEqual(general.license, {}, 'license not empty');
                        assert.strictEqual(users.currentId, '', 'current user id not empty');
                        assert.deepStrictEqual(users.myPreferences, {}, 'user preferences not empty');
                        assert.deepStrictEqual(users.mySessions, [], 'user sessions not empty');
                        assert.deepStrictEqual(users.myAudits, [], 'user audits not empty');
                        assert.deepStrictEqual(users.profiles, {}, 'user profiles not empty');
                        assert.deepStrictEqual(users.profilesInTeam, {}, 'users profiles in team not empty');
                        assert.deepStrictEqual(users.profilesInChannel, {}, 'users profiles in channel not empty');
                        assert.deepStrictEqual(users.profilesNotInChannel, {}, 'users profiles NOT in channel not empty');
                        assert.deepStrictEqual(users.statuses, {}, 'users statuses not empty');
                        assert.strictEqual(loginView.loginId, '', 'login id not empty');
                        assert.strictEqual(loginView.password, '', 'password not empty');
                        assert.strictEqual(teams.currentId, '', 'current team id is not empty');
                        assert.deepStrictEqual(teams.teams, {}, 'teams is not empty');
                        assert.deepStrictEqual(teams.myMembers, {}, 'team members is not empty');
                        assert.deepStrictEqual(teams.membersInTeam, {}, 'members in team is not empty');
                        assert.deepStrictEqual(teams.membersNotInTeam, {}, 'members NOT in team is not empty');
                        assert.deepStrictEqual(teams.stats, {}, 'team stats is not empty');
                        assert.deepStrictEqual(teams.openTeamIds, new Set(), 'team open ids is not empty');
                        assert.strictEqual(channels.currentId, '', 'current channel id is not empty');
                        assert.deepStrictEqual(channels.channels, {}, 'channels is not empty');
                        assert.deepStrictEqual(channels.myMembers, {}, 'channel members is not empty');
                        assert.deepStrictEqual(channels.moreChannels, {}, 'more channels is not empty');
                        assert.deepStrictEqual(channels.stats, {}, 'channel stats is not empty');
                        assert.strictEqual(posts.selectedPostId, '', 'selected post id is not empty');
                        assert.strictEqual(posts.currentFocusedPostId, '', 'current focused post id is not empty');
                        assert.deepStrictEqual(posts.postsInfo, {}, 'posts info is not empty');
                        assert.deepStrictEqual(posts.latestPageTime, {}, 'posts latest page time is not empty');

                        done();
                    }
                }
            });

            Actions.logout()(store.dispatch, store.getState);
        });
    }).timeout(5000);
});
