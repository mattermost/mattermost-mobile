// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';
import nock from 'nock';
import fs from 'fs';

import * as Actions from '@mm-redux/actions/teams';
import {login} from '@mm-redux/actions/users';
import {Client4} from '@mm-redux/client';
import {General, RequestStatus} from '../constants';
import {GeneralTypes} from '@mm-redux/action_types';
import TestHelper from 'test/test_helper';
import configureStore from 'test/test_store';

const OK_RESPONSE = {status: 'OK'};

describe('Actions.Teams', () => {
    let store;
    beforeAll(async () => {
        await TestHelper.initBasic(Client4);
    });

    beforeEach(async () => {
        store = await configureStore();
    });

    afterAll(async () => {
        await TestHelper.tearDown();
    });

    it('selectTeam', async () => {
        await Actions.selectTeam(TestHelper.basicTeam)(store.dispatch, store.getState);
        await TestHelper.wait(100);
        const {currentTeamId} = store.getState().entities.teams;

        assert.ok(currentTeamId);
        assert.equal(currentTeamId, TestHelper.basicTeam.id);
    });

    it('getMyTeams', async () => {
        TestHelper.mockLogin();
        await login(TestHelper.basicUser.email, 'password1')(store.dispatch, store.getState);

        nock(Client4.getBaseRoute()).
            get('/users/me/teams').
            reply(200, [TestHelper.basicTeam]);
        await Actions.getMyTeams()(store.dispatch, store.getState);

        const teamsRequest = store.getState().requests.teams.getMyTeams;
        const {teams} = store.getState().entities.teams;

        if (teamsRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(teamsRequest.error));
        }

        assert.ok(teams);
        assert.ok(teams[TestHelper.basicTeam.id]);
    });

    it('getTeamsForUser', async () => {
        nock(Client4.getBaseRoute()).
            get(`/users/${TestHelper.basicUser.id}/teams`).
            reply(200, [TestHelper.basicTeam]);

        await Actions.getTeamsForUser(TestHelper.basicUser.id)(store.dispatch, store.getState);

        const teamsRequest = store.getState().requests.teams.getTeams;
        const {teams} = store.getState().entities.teams;

        if (teamsRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(teamsRequest.error));
        }

        assert.ok(teams);
        assert.ok(teams[TestHelper.basicTeam.id]);
    });

    it('getTeams', async () => {
        let team = {...TestHelper.fakeTeam(), allow_open_invite: true};

        nock(Client4.getBaseRoute()).
            post('/teams').
            reply(201, {...team, id: TestHelper.generateId()});
        team = await Client4.createTeam(team);

        nock(Client4.getBaseRoute()).
            get('/teams').
            query(true).
            reply(200, [team]);
        await Actions.getTeams()(store.dispatch, store.getState);

        const teamsRequest = store.getState().requests.teams.getTeams;
        const {teams} = store.getState().entities.teams;

        if (teamsRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(teamsRequest.error));
        }

        assert.ok(Object.keys(teams).length > 0);
    });

    it('getTeams with total count', async () => {
        let team = {...TestHelper.fakeTeam(), allow_open_invite: true};

        nock(Client4.getBaseRoute()).
            post('/teams').
            reply(201, {...team, id: TestHelper.generateId()});
        team = await Client4.createTeam(team);

        nock(Client4.getBaseRoute()).
            get('/teams').
            query(true).
            reply(200, {teams: [team], total_count: 43});
        await Actions.getTeams(0, 1, true)(store.dispatch, store.getState);

        const teamsRequest = store.getState().requests.teams.getTeams;
        const {teams, totalCount} = store.getState().entities.teams;

        if (teamsRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(teamsRequest.error));
        }

        assert.ok(Object.keys(teams).length > 0);
        assert.equal(totalCount, 43);
    });

    it('getTeam', async () => {
        nock(Client4.getBaseRoute()).
            post('/teams').
            reply(201, TestHelper.fakeTeamWithId());
        const team = await Client4.createTeam(TestHelper.fakeTeam());

        nock(Client4.getBaseRoute()).
            get(`/teams/${team.id}`).
            reply(200, team);
        await Actions.getTeam(team.id)(store.dispatch, store.getState);

        const state = store.getState();
        const {teams} = state.entities.teams;

        assert.ok(teams);
        assert.ok(teams[team.id]);
    });

    it('getTeamByName', async () => {
        nock(Client4.getBaseRoute()).
            post('/teams').
            reply(201, TestHelper.fakeTeamWithId());
        const team = await Client4.createTeam(TestHelper.fakeTeam());

        nock(Client4.getBaseRoute()).
            get(`/teams/name/${team.name}`).
            reply(200, team);
        await Actions.getTeamByName(team.name)(store.dispatch, store.getState);

        const state = store.getState();
        const {teams} = state.entities.teams;

        assert.ok(teams);
        assert.ok(teams[team.id]);
    });

    it('createTeam', async () => {
        nock(Client4.getBaseRoute()).
            post('/teams').
            reply(201, TestHelper.fakeTeamWithId());
        await Actions.createTeam(
            TestHelper.fakeTeam(),
        )(store.dispatch, store.getState);

        const {teams, myMembers, currentTeamId} = store.getState().entities.teams;

        const teamId = Object.keys(teams)[0];
        assert.strictEqual(Object.keys(teams).length, 1);
        assert.strictEqual(currentTeamId, teamId);
        assert.ok(myMembers[teamId]);
    });

    it('deleteTeam', async () => {
        const secondClient = TestHelper.createClient();

        nock(Client4.getBaseRoute()).
            post('/users').
            query(true).
            reply(201, TestHelper.fakeUserWithId());

        const user = await TestHelper.basicClient4.createUser(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id,
        );

        nock(Client4.getBaseRoute()).
            post('/users/login').
            reply(200, user);
        await secondClient.login(user.email, 'password1');

        nock(Client4.getBaseRoute()).
            post('/teams').
            reply(201, TestHelper.fakeTeamWithId());
        const secondTeam = await secondClient.createTeam(
            TestHelper.fakeTeam());

        nock(Client4.getBaseRoute()).
            delete(`/teams/${secondTeam.id}`).
            reply(200, OK_RESPONSE);

        await Actions.deleteTeam(
            secondTeam.id,
        )(store.dispatch, store.getState);

        const {teams, myMembers} = store.getState().entities.teams;
        assert.ifError(teams[secondTeam.id]);
        assert.ifError(myMembers[secondTeam.id]);
    });

    it('updateTeam', async () => {
        const displayName = 'The Updated Team';
        const description = 'This is a team created by unit tests';
        const team = {
            ...TestHelper.basicTeam,
            display_name: displayName,
            description,
        };

        nock(Client4.getBaseRoute()).
            put(`/teams/${team.id}`).
            reply(200, team);
        await Actions.updateTeam(team)(store.dispatch, store.getState);

        const {teams} = store.getState().entities.teams;
        const updated = teams[TestHelper.basicTeam.id];

        assert.ok(updated);
        assert.strictEqual(updated.display_name, displayName);
        assert.strictEqual(updated.description, description);
    });

    it('patchTeam', async () => {
        const displayName = 'The Patched Team';
        const description = 'This is a team created by unit tests';
        const team = {
            ...TestHelper.basicTeam,
            display_name: displayName,
            description,
        };

        nock(Client4.getBaseRoute()).
            put(`/teams/${team.id}/patch`).
            reply(200, team);
        await Actions.patchTeam(team)(store.dispatch, store.getState);
        const {teams} = store.getState().entities.teams;

        const patched = teams[TestHelper.basicTeam.id];

        assert.ok(patched);
        assert.strictEqual(patched.display_name, displayName);
        assert.strictEqual(patched.description, description);
    });

    it('Join Open Team', async () => {
        const client = TestHelper.createClient();

        nock(Client4.getBaseRoute()).
            post('/users').
            query(true).
            reply(201, TestHelper.fakeUserWithId());
        const user = await client.createUser(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id,
        );

        nock(Client4.getBaseRoute()).
            post('/users/login').
            reply(200, user);
        await client.login(user.email, 'password1');

        nock(Client4.getBaseRoute()).
            post('/teams').
            reply(201, {...TestHelper.fakeTeamWithId(), allow_open_invite: true});
        const team = await client.createTeam({...TestHelper.fakeTeam(), allow_open_invite: true});

        store.dispatch({type: GeneralTypes.RECEIVED_SERVER_VERSION, data: '4.0.0'});

        nock(Client4.getBaseRoute()).
            post('/teams/members/invite').
            query(true).
            reply(201, {user_id: TestHelper.basicUser.id, team_id: team.id});

        nock(Client4.getBaseRoute()).
            get(`/teams/${team.id}`).
            reply(200, team);

        nock(Client4.getUserRoute('me')).
            get('/teams/members').
            reply(200, [{user_id: TestHelper.basicUser.id, roles: 'team_user', team_id: team.id}]);

        nock(Client4.getUserRoute('me')).
            get('/teams/unread').
            reply(200, [{team_id: team.id, msg_count: 0, mention_count: 0}]);

        await Actions.joinTeam(team.invite_id, team.id)(store.dispatch, store.getState);

        const state = store.getState();

        const request = state.requests.teams.joinTeam;

        if (request.status !== RequestStatus.SUCCESS) {
            throw new Error(JSON.stringify(request.error));
        }

        const {teams, myMembers} = state.entities.teams;
        assert.ok(teams[team.id]);
        assert.ok(myMembers[team.id]);
    });

    it('getMyTeamMembers and getMyTeamUnreads', async () => {
        nock(Client4.getUserRoute('me')).
            get('/teams/members').
            reply(200, [{user_id: TestHelper.basicUser.id, roles: 'team_user', team_id: TestHelper.basicTeam.id}]);
        await Actions.getMyTeamMembers()(store.dispatch, store.getState);

        nock(Client4.getUserRoute('me')).
            get('/teams/unread').
            reply(200, [{team_id: TestHelper.basicTeam.id, msg_count: 0, mention_count: 0}]);
        await Actions.getMyTeamUnreads()(store.dispatch, store.getState);

        const members = store.getState().entities.teams.myMembers;
        const member = members[TestHelper.basicTeam.id];

        assert.ok(member);
        assert.ok(Object.prototype.hasOwnProperty.call(member, 'mention_count'));
    });

    it('getTeamMembersForUser', async () => {
        nock(Client4.getUserRoute(TestHelper.basicUser.id)).
            get('/teams/members').
            reply(200, [{user_id: TestHelper.basicUser.id, team_id: TestHelper.basicTeam.id}]);
        await Actions.getTeamMembersForUser(TestHelper.basicUser.id)(store.dispatch, store.getState);

        const membersInTeam = store.getState().entities.teams.membersInTeam;

        assert.ok(membersInTeam);
        assert.ok(membersInTeam[TestHelper.basicTeam.id]);
        assert.ok(membersInTeam[TestHelper.basicTeam.id][TestHelper.basicUser.id]);
    });

    it('getTeamMember', async () => {
        nock(Client4.getBaseRoute()).
            post('/users').
            query(true).
            reply(201, TestHelper.fakeUserWithId());
        const user = await TestHelper.basicClient4.createUser(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id,
        );

        nock(Client4.getBaseRoute()).
            get(`/teams/${TestHelper.basicTeam.id}/members/${user.id}`).
            reply(200, {user_id: user.id, team_id: TestHelper.basicTeam.id});
        await Actions.getTeamMember(TestHelper.basicTeam.id, user.id)(store.dispatch, store.getState);

        const members = store.getState().entities.teams.membersInTeam;

        assert.ok(members[TestHelper.basicTeam.id]);
        assert.ok(members[TestHelper.basicTeam.id][user.id]);
    });

    it('getTeamMembers', async () => {
        nock(Client4.getBaseRoute()).
            post('/users').
            reply(201, TestHelper.fakeUserWithId());
        const user1 = await TestHelper.basicClient4.createUser(TestHelper.fakeUser());

        nock(Client4.getBaseRoute()).
            post('/users').
            reply(201, TestHelper.fakeUserWithId());
        const user2 = await TestHelper.basicClient4.createUser(TestHelper.fakeUser());

        nock(Client4.getTeamRoute(TestHelper.basicTeam.id)).
            post('/members').
            reply(201, {user_id: user1.id, team_id: TestHelper.basicTeam.id});
        const {data: member1} = await store.dispatch(Actions.addUserToTeam(TestHelper.basicTeam.id, user1.id));

        nock(Client4.getTeamRoute(TestHelper.basicTeam.id)).
            post('/members').
            reply(201, {user_id: user2.id, team_id: TestHelper.basicTeam.id});
        const {data: member2} = await store.dispatch(Actions.addUserToTeam(TestHelper.basicTeam.id, user2.id));

        nock(Client4.getBaseRoute()).
            get(`/teams/${TestHelper.basicTeam.id}/members`).
            query(true).
            reply(200, [member1, member2, TestHelper.basicTeamMember]);
        await store.dispatch(Actions.getTeamMembers(TestHelper.basicTeam.id));
        const membersInTeam = store.getState().entities.teams.membersInTeam;

        assert.ok(membersInTeam[TestHelper.basicTeam.id]);
        assert.ok(membersInTeam[TestHelper.basicTeam.id][TestHelper.basicUser.id]);
        assert.ok(membersInTeam[TestHelper.basicTeam.id][user1.id]);
        assert.ok(membersInTeam[TestHelper.basicTeam.id][user2.id]);
    });

    it('getTeamMembersByIds', async () => {
        nock(Client4.getBaseRoute()).
            post('/users').
            query(true).
            reply(201, TestHelper.fakeUserWithId());
        const user1 = await TestHelper.basicClient4.createUser(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id,
        );

        nock(Client4.getBaseRoute()).
            post('/users').
            query(true).
            reply(201, TestHelper.fakeUserWithId());
        const user2 = await TestHelper.basicClient4.createUser(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id,
        );

        nock(Client4.getBaseRoute()).
            post(`/teams/${TestHelper.basicTeam.id}/members/ids`).
            reply(200, [{user_id: user1.id, team_id: TestHelper.basicTeam.id}, {user_id: user2.id, team_id: TestHelper.basicTeam.id}]);
        await Actions.getTeamMembersByIds(
            TestHelper.basicTeam.id,
            [user1.id, user2.id],
        )(store.dispatch, store.getState);

        const members = store.getState().entities.teams.membersInTeam;

        assert.ok(members[TestHelper.basicTeam.id]);
        assert.ok(members[TestHelper.basicTeam.id][user1.id]);
        assert.ok(members[TestHelper.basicTeam.id][user2.id]);
    });

    it('getTeamStats', async () => {
        nock(Client4.getTeamRoute(TestHelper.basicTeam.id)).
            get('/stats').
            reply(200, {team_id: TestHelper.basicTeam.id, total_member_count: 2605, active_member_count: 2571});
        await Actions.getTeamStats(TestHelper.basicTeam.id)(store.dispatch, store.getState);

        const {stats} = store.getState().entities.teams;

        const stat = stats[TestHelper.basicTeam.id];
        assert.ok(stat);

        assert.ok(stat.total_member_count > 1);
        assert.ok(stat.active_member_count > 1);
    });

    it('addUserToTeam', async () => {
        nock(Client4.getBaseRoute()).
            post('/users').
            reply(201, TestHelper.fakeUserWithId());
        const user = await TestHelper.basicClient4.createUser(TestHelper.fakeUser());

        nock(Client4.getTeamRoute(TestHelper.basicTeam.id)).
            post('/members').
            reply(201, {user_id: user.id, team_id: TestHelper.basicTeam.id});
        await Actions.addUserToTeam(TestHelper.basicTeam.id, user.id)(store.dispatch, store.getState);
        const members = store.getState().entities.teams.membersInTeam;

        assert.ok(members[TestHelper.basicTeam.id]);
        assert.ok(members[TestHelper.basicTeam.id][user.id]);
    });

    it('addUsersToTeam', async () => {
        nock(Client4.getBaseRoute()).
            post('/users').
            reply(201, TestHelper.fakeUserWithId());
        const user = await TestHelper.basicClient4.createUser(TestHelper.fakeUser());

        nock(Client4.getBaseRoute()).
            post('/users').
            reply(201, TestHelper.fakeUserWithId());
        const user2 = await TestHelper.basicClient4.createUser(TestHelper.fakeUser());

        nock(Client4.getTeamRoute(TestHelper.basicTeam.id)).
            post('/members/batch').
            reply(201, [{user_id: user.id, team_id: TestHelper.basicTeam.id}, {user_id: user2.id, team_id: TestHelper.basicTeam.id}]);
        await Actions.addUsersToTeam(TestHelper.basicTeam.id, [user.id, user2.id])(store.dispatch, store.getState);

        const members = store.getState().entities.teams.membersInTeam;
        const profilesInTeam = store.getState().entities.users.profilesInTeam;

        assert.ok(members[TestHelper.basicTeam.id]);
        assert.ok(members[TestHelper.basicTeam.id][user.id]);
        assert.ok(members[TestHelper.basicTeam.id][user2.id]);
        assert.ok(profilesInTeam[TestHelper.basicTeam.id]);
        assert.ok(profilesInTeam[TestHelper.basicTeam.id].has(user.id));
        assert.ok(profilesInTeam[TestHelper.basicTeam.id].has(user2.id));
    });

    describe('removeUserFromTeam', () => {
        const team = {id: 'team'};
        const user = {id: 'user'};

        test('should remove the user from the team', async () => {
            store = await configureStore({
                entities: {
                    teams: {
                        membersInTeam: {
                            [team.id]: {
                                [user.id]: {},
                            },
                        },
                    },
                    users: {
                        currentUserId: '',
                        profilesInTeam: {
                            [team.id]: [user.id],
                        },
                        profilesNotInTeam: {
                            [team.id]: [],
                        },
                    },
                },
            });

            nock(Client4.getBaseRoute()).
                delete(`/teams/${team.id}/members/${user.id}`).
                reply(200, OK_RESPONSE);
            await store.dispatch(Actions.removeUserFromTeam(team.id, user.id));

            const state = store.getState();
            expect(state.entities.teams.membersInTeam[team.id]).toEqual({});
            expect(state.entities.users.profilesInTeam[team.id]).toEqual(new Set());
            expect(state.entities.users.profilesNotInTeam[team.id]).toEqual(new Set([user.id]));
        });

        test('should leave all channels when leaving a team', async () => {
            const channel1 = {id: 'channel1', team_id: team.id};
            const channel2 = {id: 'channel2', team_id: 'team2'};

            store = await configureStore({
                entities: {
                    channels: {
                        channels: {
                            [channel1.id]: channel1,
                            [channel2.id]: channel2,
                        },
                        myMembers: {
                            [channel1.id]: {user_id: user.id, channel_id: channel1.id},
                            [channel2.id]: {user_id: user.id, channel_id: channel2.id},
                        },
                    },
                    users: {
                        currentUserId: user.id,
                    },
                },
            });

            nock(Client4.getBaseRoute()).
                delete(`/teams/${team.id}/members/${user.id}`).
                reply(200, OK_RESPONSE);
            await store.dispatch(Actions.removeUserFromTeam(team.id, user.id));

            const state = store.getState();
            expect(state.entities.channels.myMembers[channel1.id]).toBeFalsy();
            expect(state.entities.channels.myMembers[channel2.id]).toBeTruthy();
        });

        test('should clear the current channel when leaving a team', async () => {
            const channel = {id: 'channel'};

            store = await configureStore({
                entities: {
                    channels: {
                        channels: {
                            [channel.id]: channel,
                        },
                        myMembers: {},
                    },
                    users: {
                        currentUserId: user.id,
                    },
                },
            });

            nock(Client4.getBaseRoute()).
                delete(`/teams/${team.id}/members/${user.id}`).
                reply(200, OK_RESPONSE);
            await store.dispatch(Actions.removeUserFromTeam(team.id, user.id));

            const state = store.getState();
            expect(state.entities.channels.currentChannelId).toBe('');
        });
    });

    it('updateTeamMemberRoles', async () => {
        nock(Client4.getBaseRoute()).
            post('/users').
            reply(201, TestHelper.fakeUserWithId());
        const user = await TestHelper.basicClient4.createUser(TestHelper.fakeUser());

        nock(Client4.getTeamRoute(TestHelper.basicTeam.id)).
            post('/members').
            reply(201, {user_id: user.id, team_id: TestHelper.basicTeam.id});
        await Actions.addUserToTeam(TestHelper.basicTeam.id, user.id)(store.dispatch, store.getState);

        const roles = General.TEAM_USER_ROLE + ' ' + General.TEAM_ADMIN_ROLE;

        nock(Client4.getBaseRoute()).
            put(`/teams/${TestHelper.basicTeam.id}/members/${user.id}/roles`).
            reply(200, {user_id: user.id, team_id: TestHelper.basicTeam.id, roles});
        await Actions.updateTeamMemberRoles(TestHelper.basicTeam.id, user.id, roles)(store.dispatch, store.getState);

        const members = store.getState().entities.teams.membersInTeam;

        assert.ok(members[TestHelper.basicTeam.id]);
        assert.ok(members[TestHelper.basicTeam.id][user.id]);
        assert.ok(members[TestHelper.basicTeam.id][user.id].roles === roles);
    });

    it('sendEmailInvitesToTeam', async () => {
        nock(Client4.getTeamRoute(TestHelper.basicTeam.id)).
            post('/invite/email').
            reply(200, OK_RESPONSE);
        const {data} = await Actions.sendEmailInvitesToTeam(TestHelper.basicTeam.id, ['fakeemail1@example.com', 'fakeemail2@example.com'])(store.dispatch, store.getState);
        assert.deepEqual(data, OK_RESPONSE);
    });

    it('checkIfTeamExists', async () => {
        nock(Client4.getBaseRoute()).
            get(`/teams/name/${TestHelper.basicTeam.name}/exists`).
            reply(200, {exists: true});

        let {data: exists} = await Actions.checkIfTeamExists(TestHelper.basicTeam.name)(store.dispatch, store.getState);

        assert.ok(exists === true);

        nock(Client4.getBaseRoute()).
            get('/teams/name/junk/exists').
            reply(200, {exists: false});
        const {data} = await Actions.checkIfTeamExists('junk')(store.dispatch, store.getState);
        exists = data;

        assert.ok(exists === false);
    });

    it('setTeamIcon', async () => {
        TestHelper.mockLogin();
        await login(TestHelper.basicUser.email, 'password1')(store.dispatch, store.getState);

        const team = TestHelper.basicTeam;
        const imageData = fs.createReadStream('test/assets/images/test.png');

        nock(Client4.getTeamRoute(team.id)).
            post('/image').
            reply(200, OK_RESPONSE);

        const {data} = await Actions.setTeamIcon(team.id, imageData)(store.dispatch, store.getState);
        assert.deepEqual(data, OK_RESPONSE);
    });

    it('removeTeamIcon', async () => {
        TestHelper.mockLogin();
        await login(TestHelper.basicUser.email, 'password1')(store.dispatch, store.getState);

        const team = TestHelper.basicTeam;

        nock(Client4.getTeamRoute(team.id)).
            delete('/image').
            reply(200, OK_RESPONSE);

        const {data} = await Actions.removeTeamIcon(team.id)(store.dispatch, store.getState);
        assert.deepEqual(data, OK_RESPONSE);
    });

    it('updateTeamScheme', async () => {
        TestHelper.mockLogin();
        await login(TestHelper.basicUser.email, 'password1')(store.dispatch, store.getState);

        const schemeId = 'xxxxxxxxxxxxxxxxxxxxxxxxxx';
        const {id} = TestHelper.basicTeam;

        nock(Client4.getBaseRoute()).
            put('/teams/' + id + '/scheme').
            reply(200, OK_RESPONSE);

        await Actions.updateTeamScheme(id, schemeId)(store.dispatch, store.getState);

        const state = store.getState();
        const {teams} = state.entities.teams;

        const updated = teams[id];
        assert.ok(updated);
        assert.equal(updated.scheme_id, schemeId);
    });

    it('membersMinusGroupMembers', async () => {
        const teamID = 'tid10000000000000000000000';
        const groupIDs = ['gid10000000000000000000000', 'gid20000000000000000000000'];
        const page = 4;
        const perPage = 63;

        nock(Client4.getBaseRoute()).get(
            `/teams/${teamID}/members_minus_group_members?group_ids=${groupIDs.join(',')}&page=${page}&per_page=${perPage}`).
            reply(200, {users: [], total_count: 0});

        const {error} = await Actions.membersMinusGroupMembers(teamID, groupIDs, page, perPage)(store.dispatch, store.getState);

        assert.equal(error, null);
    });

    it('searchTeams', async () => {
        const userClient = TestHelper.createClient();

        nock(Client4.getBaseRoute()).
            post('/users').
            query(true).
            reply(201, TestHelper.fakeUserWithId());

        const user = await TestHelper.basicClient4.createUser(
            TestHelper.fakeUser(),
            null,
            null,
            TestHelper.basicTeam.invite_id,
        );

        nock(Client4.getBaseRoute()).
            post('/users/login').
            reply(200, user);

        await userClient.login(user.email, 'password1');

        nock(Client4.getBaseRoute()).
            post('/teams').
            reply(201, TestHelper.fakeTeamWithId());

        const userTeam = await userClient.createTeam(
            TestHelper.fakeTeam(),
        );

        nock(Client4.getBaseRoute()).
            post('/teams/search').
            reply(200, [TestHelper.basicTeam, userTeam]);

        await store.dispatch(Actions.searchTeams('test', 0));

        const moreRequest = store.getState().requests.teams.getTeams;
        if (moreRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(moreRequest.error));
        }

        nock(Client4.getBaseRoute()).
            post('/teams/search').
            reply(200, {teams: [TestHelper.basicTeam, userTeam], total_count: 2});

        const response = await store.dispatch(Actions.searchTeams('test', '', false, true));

        const paginatedRequest = store.getState().requests.teams.getTeams;
        if (paginatedRequest.status === RequestStatus.FAILURE) {
            throw new Error(JSON.stringify(paginatedRequest.error));
        }

        assert.ok(response.data.teams.length === 2);
    });
});
