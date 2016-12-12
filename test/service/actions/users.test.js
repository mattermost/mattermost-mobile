// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'service/actions/users';
import Client from 'service/client';
import configureStore from 'app/store';
import {RequestStatus} from 'service/constants';
import Routes from 'app/navigation/routes';
import TestHelper from 'test/test_helper';

describe('Actions.Users', () => {
    it('login', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            store.subscribe(() => {
                const state = store.getState();
                const loginRequest = state.requests.users.login;
                const currentUserId = state.entities.users.currentId;
                const profiles = state.entities.users.profiles;
                const preferences = state.entities.preferences.myPreferences;

                // TODO: uncomment when PLT-4167 is merged
                // const teamMembers = state.entities.teams.myMembers;

                if (loginRequest.status === RequestStatus.SUCCESS || loginRequest.status === RequestStatus.FAILURE) {
                    if (loginRequest.error) {
                        done(new Error(JSON.stringify(loginRequest.error)));
                    } else {
                        assert.ok(currentUserId);
                        assert.ok(profiles);
                        assert.ok(profiles[currentUserId]);
                        assert.ok(Object.keys(preferences).length);

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
    });

    it('logout', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            store.subscribe(() => {
                const state = store.getState();
                const logoutRequest = state.requests.users.logout;
                const general = state.entities.general;
                const users = state.entities.users;
                const loginView = state.views.login;
                const teams = state.entities.teams;
                const channels = state.entities.channels;
                const posts = state.entities.posts;
                const preferences = state.entities.preferences;
                const navigation = state.navigation;

                if (logoutRequest.status === RequestStatus.SUCCESS || logoutRequest.status === RequestStatus.FAILURE) {
                    if (logoutRequest.error) {
                        done(new Error(JSON.stringify(logoutRequest.error)));
                    } else {
                        assert.deepStrictEqual(general.config, {}, 'config not empty');
                        assert.deepStrictEqual(general.license, {}, 'license not empty');
                        assert.strictEqual(users.currentId, '', 'current user id not empty');
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
                        assert.deepStrictEqual(teams.stats, {}, 'team stats is not empty');
                        assert.deepStrictEqual(teams.openTeamIds, new Set(), 'team open ids is not empty');
                        assert.strictEqual(channels.currentId, '', 'current channel id is not empty');
                        assert.deepStrictEqual(channels.channels, {}, 'channels is not empty');
                        assert.deepStrictEqual(channels.myMembers, {}, 'channel members is not empty');
                        assert.deepStrictEqual(channels.stats, {}, 'channel stats is not empty');
                        assert.strictEqual(posts.selectedPostId, '', 'selected post id is not empty');
                        assert.strictEqual(posts.currentFocusedPostId, '', 'current focused post id is not empty');
                        assert.deepStrictEqual(posts.postsInfo, {}, 'posts info is not empty');
                        assert.deepStrictEqual(posts.latestPageTime, {}, 'posts latest page time is not empty');
                        assert.deepStrictEqual(preferences.myPreferences, {}, 'user preferences not empty');
                        assert.strictEqual(navigation.index, 0, 'navigation not reset to first element of stack');
                        assert.deepStrictEqual(navigation.routes, [Routes.Root], 'navigation not reset to root route');

                        done();
                    }
                }
            });

            Actions.logout()(store.dispatch, store.getState);
        });
    });

    it('getProfiles', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const user = await TestHelper.basicClient.createUser(TestHelper.fakeUser());

            store.subscribe(() => {
                const profilesRequest = store.getState().requests.users.getProfiles;
                const profiles = store.getState().entities.users.profiles;

                if (profilesRequest.status === RequestStatus.SUCCESS || profilesRequest.status === RequestStatus.FAILURE) {
                    if (profilesRequest.error) {
                        done(new Error(JSON.stringify(profilesRequest.error)));
                    } else {
                        assert.ok(profiles[user.id]);

                        done();
                    }
                }
            });

            Actions.getProfiles(0)(store.dispatch, store.getState);
        });
    });

    it('getProfilesInTeam', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            store.subscribe(() => {
                const profilesRequest = store.getState().requests.users.getProfilesInTeam;
                const profilesInTeam = store.getState().entities.users.profilesInTeam;
                const profiles = store.getState().entities.users.profiles;

                if (profilesRequest.status === RequestStatus.SUCCESS || profilesRequest.status === RequestStatus.FAILURE) {
                    if (profilesRequest.error) {
                        done(new Error(JSON.stringify(profilesRequest.error)));
                    } else {
                        const team = profilesInTeam[TestHelper.basicTeam.id];
                        assert.ok(team);
                        assert.ok(team.has(TestHelper.basicUser.id));
                        assert.equal(Object.keys(profiles).length, team.size, 'profiles != profiles in team');

                        done();
                    }
                }
            });

            Actions.getProfilesInTeam(TestHelper.basicTeam.id, 0)(store.dispatch, store.getState);
        });
    });

    it('getProfilesInChannel', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            store.subscribe(() => {
                const profilesRequest = store.getState().requests.users.getProfilesInChannel;
                const profilesInChannel = store.getState().entities.users.profilesInChannel;
                const profiles = store.getState().entities.users.profiles;

                if (profilesRequest.status === RequestStatus.SUCCESS || profilesRequest.status === RequestStatus.FAILURE) {
                    if (profilesRequest.error) {
                        done(new Error(JSON.stringify(profilesRequest.error)));
                    } else {
                        const channel = profilesInChannel[TestHelper.basicChannel.id];
                        assert.ok(channel.has(TestHelper.basicUser.id));
                        assert.equal(Object.keys(profiles).length, channel.size, 'profiles != profiles in channel');

                        done();
                    }
                }
            });

            Actions.getProfilesInChannel(TestHelper.basicTeam.id, TestHelper.basicChannel.id, 0)(store.dispatch, store.getState);
        });
    });

    it('getProfilesNotInChannel', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const user = await TestHelper.basicClient.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            store.subscribe(() => {
                const profilesRequest = store.getState().requests.users.getProfilesNotInChannel;
                const profilesNotInChannel = store.getState().entities.users.profilesNotInChannel;
                const profiles = store.getState().entities.users.profiles;

                if (profilesRequest.status === RequestStatus.SUCCESS || profilesRequest.status === RequestStatus.FAILURE) {
                    if (profilesRequest.error) {
                        done(new Error(JSON.stringify(profilesRequest.error)));
                    } else {
                        const channel = profilesNotInChannel[TestHelper.basicChannel.id];
                        assert.ok(channel.has(user.id));
                        assert.equal(Object.keys(profiles).length, channel.size, 'profiles != profiles in channel');

                        done();
                    }
                }
            });

            Actions.getProfilesNotInChannel(TestHelper.basicTeam.id, TestHelper.basicChannel.id, 0)(store.dispatch, store.getState);
        });
    });

    it('getStatusesByIds', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const user = await TestHelper.basicClient.createUser(TestHelper.fakeUser());

            store.subscribe(() => {
                const statusesRequest = store.getState().requests.users.getStatusesByIds;
                const statuses = store.getState().entities.users.statuses;

                if (statusesRequest.status === RequestStatus.SUCCESS || statusesRequest.status === RequestStatus.FAILURE) {
                    if (statusesRequest.error) {
                        done(new Error(JSON.stringify(statusesRequest.error)));
                    } else {
                        assert.ok(statuses[TestHelper.basicUser.id]);
                        assert.ok(statuses[user.id]);
                        assert.equal(Object.keys(statuses).length, 2);
                        done();
                    }
                }
            });

            Actions.getStatusesByIds([TestHelper.basicUser.id, user.id])(store.dispatch, store.getState);
        });
    });

    it('getSessions', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            store.subscribe(() => {
                const sessionsRequest = store.getState().requests.users.getSessions;
                const sessions = store.getState().entities.users.mySessions;

                if (sessionsRequest.status === RequestStatus.SUCCESS || sessionsRequest.status === RequestStatus.FAILURE) {
                    if (sessionsRequest.error) {
                        done(new Error(JSON.stringify(sessionsRequest.error)));
                    } else {
                        assert.ok(sessions.length);
                        assert.equal(sessions[0].user_id, TestHelper.basicUser.id);
                        done();
                    }
                }
            });

            Actions.getSessions(TestHelper.basicUser.id)(store.dispatch, store.getState);
        });
    });

    it('revokeSession', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            store.subscribe(() => {
                const sessionsRequest = store.getState().requests.users.getSessions;
                const revokeRequest = store.getState().requests.users.revokeSession;
                const sessions = store.getState().entities.users.mySessions;

                if (revokeRequest.status === RequestStatus.SUCCESS || revokeRequest.status === RequestStatus.FAILURE) {
                    if (revokeRequest.error) {
                        done(new Error(JSON.stringify(revokeRequest.error)));
                    } else {
                        assert.ok(sessions.length === 0);
                        done();
                    }
                }

                if (sessionsRequest.status === RequestStatus.SUCCESS || sessionsRequest.status === RequestStatus.FAILURE) {
                    if (sessionsRequest.error) {
                        done(new Error(JSON.stringify(sessionsRequest.error)));
                    } else if (revokeRequest.status === RequestStatus.NOT_STARTED) {
                        Actions.revokeSession(sessions[0].id)(store.dispatch, store.getState);
                    }
                }
            });

            Actions.getSessions(TestHelper.basicUser.id)(store.dispatch, store.getState);
        });
    });

    it('revokeSession and logout', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            store.subscribe(() => {
                const sessionsRequest = store.getState().requests.users.getSessions;
                const revokeRequest = store.getState().requests.users.revokeSession;
                const logoutRequest = store.getState().requests.users.logout;
                const profilesRequest = store.getState().requests.users.getProfiles;
                const sessions = store.getState().entities.users.mySessions;

                if (logoutRequest.status === RequestStatus.SUCCESS || logoutRequest.status === RequestStatus.FAILURE) {
                    if (logoutRequest.error) {
                        done(new Error(JSON.stringify(logoutRequest.error)));
                    } else {
                        done();
                    }
                }

                if (revokeRequest.status === RequestStatus.SUCCESS || revokeRequest.status === RequestStatus.FAILURE) {
                    if (revokeRequest.error) {
                        done(new Error(JSON.stringify(revokeRequest.error)));
                    } else if (logoutRequest.status === RequestStatus.NOT_STARTED && profilesRequest.status === RequestStatus.NOT_STARTED) {
                        Actions.getProfiles(0)(store.dispatch, store.getState);
                    }
                }

                if (sessionsRequest.status === RequestStatus.SUCCESS || sessionsRequest.status === RequestStatus.FAILURE) {
                    if (sessionsRequest.error) {
                        done(new Error(JSON.stringify(sessionsRequest.error)));
                    } else if (revokeRequest.status === RequestStatus.NOT_STARTED) {
                        Actions.revokeSession(sessions[0].id)(store.dispatch, store.getState);
                    }
                }
            });

            Actions.getSessions(TestHelper.basicUser.id)(store.dispatch, store.getState);
        });
    });

    it('getAudits', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            store.subscribe(() => {
                const auditsRequest = store.getState().requests.users.getAudits;
                const audits = store.getState().entities.users.myAudits;

                if (auditsRequest.status === RequestStatus.SUCCESS || auditsRequest.status === RequestStatus.FAILURE) {
                    if (auditsRequest.error) {
                        done(new Error(JSON.stringify(auditsRequest.error)));
                    } else {
                        assert.ok(audits.length);
                        assert.equal(audits[0].user_id, TestHelper.basicUser.id);
                        done();
                    }
                }
            });

            Actions.getAudits(TestHelper.basicUser.id)(store.dispatch, store.getState);
        });
    });
});
