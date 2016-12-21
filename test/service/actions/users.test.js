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
    let store;
    before(async () => {
        await TestHelper.initBasic(Client);
    });

    beforeEach(() => {
        store = configureStore();
    });

    after(async () => {
        await TestHelper.basicClient.logout();
    });

    it('login', async () => {
        const user = TestHelper.basicUser;
        await TestHelper.basicClient.logout();
        await Actions.login(user.email, 'password1')(store.dispatch, store.getState);

        const state = store.getState();
        const loginRequest = state.requests.users.login;
        const {currentId, profiles} = state.entities.users;
        const preferences = state.entities.preferences.myPreferences;
        const teamMembers = state.entities.teams.myMembers;

        if (loginRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(loginRequest.error));
        }

        assert.ok(currentId);
        assert.ok(profiles);
        assert.ok(profiles[currentId]);
        assert.ok(Object.keys(preferences).length);

        Object.keys(teamMembers).forEach((id) => {
            assert.ok(teamMembers[id].team_id);
            assert.equal(teamMembers[id].user_id, currentId);
        });
    });

    it('logout', async () => {
        await Actions.logout()(store.dispatch, store.getState);

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

        if (logoutRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(logoutRequest.error));
        }

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
        assert.deepStrictEqual(posts.posts, {}, 'posts is not empty');
        assert.deepStrictEqual(posts.postsByChannel, {}, 'posts by channel is not empty');
        assert.deepStrictEqual(preferences.myPreferences, {}, 'user preferences not empty');
        assert.strictEqual(navigation.index, 0, 'navigation not reset to first element of stack');
        assert.deepStrictEqual(navigation.routes, [Routes.Root], 'navigation not reset to root route');
    });

    it('getProfiles', async () => {
        await TestHelper.basicClient.login(TestHelper.basicUser.email, 'password1');
        await TestHelper.basicClient.createUser(TestHelper.fakeUser());
        await Actions.getProfiles(0)(store.dispatch, store.getState);

        const profilesRequest = store.getState().requests.users.getProfiles;
        const {profiles} = store.getState().entities.users;

        if (profilesRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(profilesRequest.error));
        }

        assert.ok(Object.keys(profiles).length);
    });

    it('getProfilesInTeam', async () => {
        await Actions.getProfilesInTeam(TestHelper.basicTeam.id, 0)(store.dispatch, store.getState);

        const profilesRequest = store.getState().requests.users.getProfilesInTeam;
        const {profilesInTeam, profiles} = store.getState().entities.users;

        if (profilesRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(profilesRequest.error));
        }

        const team = profilesInTeam[TestHelper.basicTeam.id];
        assert.ok(team);
        assert.ok(team.has(TestHelper.basicUser.id));
        assert.equal(Object.keys(profiles).length, team.size, 'profiles != profiles in team');
    });

    it('getProfilesInChannel', async () => {
        await Actions.getProfilesInChannel(
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id,
            0
        )(store.dispatch, store.getState);

        const profilesRequest = store.getState().requests.users.getProfilesInChannel;
        const {profiles, profilesInChannel} = store.getState().entities.users;

        if (profilesRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(profilesRequest.error));
        }

        const channel = profilesInChannel[TestHelper.basicChannel.id];
        assert.ok(channel.has(TestHelper.basicUser.id));
        assert.equal(Object.keys(profiles).length, channel.size, 'profiles != profiles in channel');
    });

    it('getProfilesNotInChannel', async () => {
        const user = await TestHelper.basicClient.createUserWithInvite(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id
        );

        await Actions.getProfilesNotInChannel(
            TestHelper.basicTeam.id,
            TestHelper.basicChannel.id,
            0
        )(store.dispatch, store.getState);

        const profilesRequest = store.getState().requests.users.getProfilesNotInChannel;
        const {profiles, profilesNotInChannel} = store.getState().entities.users;

        if (profilesRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(profilesRequest.error));
        }

        const channel = profilesNotInChannel[TestHelper.basicChannel.id];
        assert.ok(channel.has(user.id));
        assert.equal(Object.keys(profiles).length, channel.size, 'profiles != profiles in channel');
    });

    it('getStatusesByIds', async () => {
        const user = await TestHelper.basicClient.createUser(TestHelper.fakeUser());

        await Actions.getStatusesByIds(
            [TestHelper.basicUser.id, user.id]
        )(store.dispatch, store.getState);

        const statusesRequest = store.getState().requests.users.getStatusesByIds;
        const statuses = store.getState().entities.users.statuses;

        if (statusesRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(statusesRequest.error));
        }

        assert.ok(statuses[TestHelper.basicUser.id]);
        assert.ok(statuses[user.id]);
        assert.equal(Object.keys(statuses).length, 2);
    });

    it('getSessions', async () => {
        await Actions.getSessions(TestHelper.basicUser.id)(store.dispatch, store.getState);

        const sessionsRequest = store.getState().requests.users.getSessions;
        const sessions = store.getState().entities.users.mySessions;

        if (sessionsRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(sessionsRequest.error));
        }

        assert.ok(sessions.length);
        assert.equal(sessions[0].user_id, TestHelper.basicUser.id);
    });

    it('revokeSession', async () => {
        await Actions.getSessions(TestHelper.basicUser.id)(store.dispatch, store.getState);

        const sessionsRequest = store.getState().requests.users.getSessions;
        let sessions = store.getState().entities.users.mySessions;
        if (sessionsRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(sessionsRequest.error));
        }

        await Actions.revokeSession(sessions[0].id)(store.dispatch, store.getState);

        const revokeRequest = store.getState().requests.users.revokeSession;
        if (revokeRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(revokeRequest.error));
        }

        sessions = store.getState().entities.users.mySessions;
        assert.ok(sessions.length === 0);
    });

    it('revokeSession and logout', async () => {
        await TestHelper.basicClient.login(TestHelper.basicUser.email, 'password1');
        await Actions.getSessions(TestHelper.basicUser.id)(store.dispatch, store.getState);

        const sessionsRequest = store.getState().requests.users.getSessions;
        const sessions = store.getState().entities.users.mySessions;

        if (sessionsRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(sessionsRequest.error));
        }

        await Actions.revokeSession(sessions[0].id)(store.dispatch, store.getState);

        const revokeRequest = store.getState().requests.users.revokeSession;
        if (revokeRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(revokeRequest.error));
        }

        await Actions.getProfiles(0)(store.dispatch, store.getState);

        const logoutRequest = store.getState().requests.users.logout;
        if (logoutRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(logoutRequest.error));
        }
    });

    it('getAudits', async () => {
        await TestHelper.basicClient.login(TestHelper.basicUser.email, 'password1');
        await Actions.getAudits(TestHelper.basicUser.id)(store.dispatch, store.getState);

        const auditsRequest = store.getState().requests.users.getAudits;
        const audits = store.getState().entities.users.myAudits;

        if (auditsRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(auditsRequest.error));
        }

        assert.ok(audits.length);
        assert.equal(audits[0].user_id, TestHelper.basicUser.id);
    });
});
