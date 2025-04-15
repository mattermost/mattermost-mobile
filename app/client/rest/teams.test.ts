// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';
import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';
import type {ClientTeamsMix} from './teams';

describe('ClientTeams', () => {
    let client: ClientTeamsMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('createTeam', async () => {
        const team = {id: 'team1', name: 'testteam'} as Team;
        const expectedUrl = client.getTeamsRoute();
        const expectedOptions = {method: 'post', body: team};

        await client.createTeam(team);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('deleteTeam', async () => {
        const teamId = 'team1';
        const expectedUrl = client.getTeamRoute(teamId);
        const expectedOptions = {method: 'delete'};

        await client.deleteTeam(teamId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('updateTeam', async () => {
        const team = {id: 'team1', name: 'testteam'} as Team;
        const expectedUrl = client.getTeamRoute(team.id);
        const expectedOptions = {method: 'put', body: team};

        await client.updateTeam(team);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('patchTeam', async () => {
        const team = {id: 'team1', name: 'patchedteam'} as Partial<Team> & {id: string};
        const expectedUrl = `${client.getTeamRoute(team.id)}/patch`;
        const expectedOptions = {method: 'put', body: team};

        await client.patchTeam(team);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getTeams', async () => {
        const page = 1;
        const perPage = 10;
        const includeTotalCount = true;
        const expectedUrl = `${client.getTeamsRoute()}?page=${page}&per_page=${perPage}&include_total_count=${includeTotalCount}`;
        const expectedOptions = {method: 'get'};

        await client.getTeams(page, perPage, includeTotalCount);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        await client.getTeams();
        expect(client.doFetch).toHaveBeenCalledWith(`${client.getTeamsRoute()}?page=0&per_page=${PER_PAGE_DEFAULT}&include_total_count=false`, expectedOptions);
    });

    test('getTeam', async () => {
        const teamId = 'team1';
        const expectedUrl = client.getTeamRoute(teamId);
        const expectedOptions = {method: 'get'};

        await client.getTeam(teamId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getTeamByName', async () => {
        const teamName = 'team_name';
        const expectedUrl = client.getTeamNameRoute(teamName);
        const expectedOptions = {method: 'get'};

        await client.getTeamByName(teamName);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getMyTeams', async () => {
        const expectedUrl = `${client.getUserRoute('me')}/teams`;
        const expectedOptions = {method: 'get'};

        await client.getMyTeams();

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getTeamsForUser', async () => {
        const userId = 'user1';
        const expectedUrl = `${client.getUserRoute(userId)}/teams`;
        const expectedOptions = {method: 'get'};

        await client.getTeamsForUser(userId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getMyTeamMembers', async () => {
        const expectedUrl = `${client.getUserRoute('me')}/teams/members`;
        const expectedOptions = {method: 'get'};

        await client.getMyTeamMembers();

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getTeamMembers', async () => {
        const teamId = 'team1';
        const page = 1;
        const perPage = 10;
        const expectedUrl = `${client.getTeamMembersRoute(teamId)}?page=${page}&per_page=${perPage}`;
        const expectedOptions = {method: 'get'};

        await client.getTeamMembers(teamId, page, perPage);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        await client.getTeamMembers(teamId);
        expect(client.doFetch).toHaveBeenCalledWith(`${client.getTeamMembersRoute(teamId)}?page=0&per_page=${PER_PAGE_DEFAULT}`, expectedOptions);
    });

    test('getTeamMember', async () => {
        const teamId = 'team1';
        const userId = 'user1';
        const expectedUrl = client.getTeamMemberRoute(teamId, userId);
        const expectedOptions = {method: 'get'};

        await client.getTeamMember(teamId, userId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getTeamMembersByIds', async () => {
        const teamId = 'team1';
        const userIds = ['user1', 'user2'];
        const expectedUrl = `${client.getTeamMembersRoute(teamId)}/ids`;
        const expectedOptions = {method: 'post', body: userIds};

        await client.getTeamMembersByIds(teamId, userIds);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('addToTeam', async () => {
        const teamId = 'team1';
        const userId = 'user1';
        const member = {user_id: userId, team_id: teamId};
        const expectedUrl = `${client.getTeamMembersRoute(teamId)}`;
        const expectedOptions = {method: 'post', body: member};

        await client.addToTeam(teamId, userId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('addUsersToTeamGracefully', async () => {
        const teamId = 'team1';
        const userIds = ['user1', 'user2'];
        const members = userIds.map((id) => ({team_id: teamId, user_id: id}));
        const expectedUrl = `${client.getTeamMembersRoute(teamId)}/batch?graceful=true`;
        const expectedOptions = {method: 'post', body: members};

        await client.addUsersToTeamGracefully(teamId, userIds);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('sendEmailInvitesToTeamGracefully', async () => {
        const teamId = 'team1';
        const emails = ['test1@example.com', 'test2@example.com'];
        const expectedUrl = `${client.getTeamRoute(teamId)}/invite/email?graceful=true`;
        const expectedOptions = {method: 'post', body: emails};

        await client.sendEmailInvitesToTeamGracefully(teamId, emails);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('joinTeam', async () => {
        const inviteId = 'invite1';
        const query = buildQueryString({invite_id: inviteId});
        const expectedUrl = `${client.getTeamsRoute()}/members/invite${query}`;
        const expectedOptions = {method: 'post'};

        await client.joinTeam(inviteId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('removeFromTeam', async () => {
        const teamId = 'team1';
        const userId = 'user1';
        const expectedUrl = client.getTeamMemberRoute(teamId, userId);
        const expectedOptions = {method: 'delete'};

        await client.removeFromTeam(teamId, userId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getTeamStats', async () => {
        const teamId = 'team1';
        const expectedUrl = `${client.getTeamRoute(teamId)}/stats`;
        const expectedOptions = {method: 'get'};

        await client.getTeamStats(teamId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getTeamIconUrl', () => {
        const teamId = 'team1';
        const lastTeamIconUpdate = 123456;
        const expectedUrl = `${client.getTeamRoute(teamId)}/image?_=${lastTeamIconUpdate}`;

        const result = client.getTeamIconUrl(teamId, lastTeamIconUpdate);

        expect(result).toBe(expectedUrl);
    });
});
