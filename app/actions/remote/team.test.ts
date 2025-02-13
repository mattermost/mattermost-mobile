// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getActiveServerUrl} from '@queries/app/servers';

import {fetchScheduledPosts} from './scheduled_post';
import {
    addCurrentUserToTeam,
    addUserToTeam,
    addUsersToTeam,
    sendEmailInvitesToTeam,
    fetchMyTeams,
    fetchMyTeam,
    fetchAllTeams,
    fetchTeamsForComponent,
    updateCanJoinTeams,
    fetchTeamByName,
    removeCurrentUserFromTeam,
    removeUserFromTeam,
    handleTeamChange,
    handleKickFromTeam,
    getTeamMembersByIds,
    buildTeamIconUrl,
    fetchTeamsThreads,
} from './team';

jest.mock('./scheduled_post', () => ({
    fetchScheduledPosts: jest.fn(),
}));

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const user: UserProfile = {
    id: 'userid',
    username: 'username',
    roles: '',
} as UserProfile;

let mockIsTablet: jest.Mock;
jest.mock('@utils/helpers', () => {
    const original = jest.requireActual('@utils/helpers');
    mockIsTablet = jest.fn(() => false);
    return {
        ...original,
        isTablet: mockIsTablet,
    };
});

let mockGetActiveServer: jest.Mock;
jest.mock('@queries/app/servers', () => {
    const original = jest.requireActual('@queries/app/servers');
    mockGetActiveServer = jest.fn(() => false);
    return {
        ...original,
        getActiveServer: mockGetActiveServer,
    };
});

jest.mock('@queries/app/servers', () => ({
    getActiveServerUrl: jest.fn(),
}));

const channelId = 'channelid1';
const teamId = 'teamid1';

const team: Team = {
    id: teamId,
    name: 'team1',
} as Team;

const mockClient = {
    getTeam: jest.fn((id: string) => ({id, name: 'team1'})),
    getTeamMember: jest.fn((id: string, userId: string) => ({id: userId + '-' + id, user_id: userId === 'me' ? 'userid1' : userId, team_id: id, roles: ''})),
    addToTeam: jest.fn((id: string, userId: string) => ({id: userId + '-' + id, user_id: userId, team_id: id, roles: ''})),
    addUsersToTeamGracefully: jest.fn((id: string, userIds: string[]) => (userIds.map((userId) => ({member: {id: userId + '-' + id, user_id: userId, team_id: id, roles: ''}, error: undefined, user_id: userId})))),
    sendEmailInvitesToTeamGracefully: jest.fn((id: string, emails: string[]) => (emails.map((email) => ({email, error: undefined})))),
    getRolesByNames: jest.fn((roles: string[]) => roles.map((r) => ({id: r, name: r} as Role))),
    getMyTeams: jest.fn(() => ([{id: teamId, name: 'team1'}])),
    getMyTeamMembers: jest.fn(() => ([{id: 'userid1-' + teamId, user_id: 'userid1', team_id: teamId, roles: ''}])),
    getTeams: jest.fn(() => ([{id: teamId, name: 'team1'}])),
    getMyChannels: jest.fn((id: string) => ([{id: channelId, name: 'channel1', creatorId: user.id, team_id: id, total_msg_count: 1}])),
    getMyChannelMembers: jest.fn(() => ([{id: user.id + '-' + channelId, user_id: user.id, channel_id: channelId, roles: '', msg_count: 0}])),
    getCategories: jest.fn((userId: string, id: string) => ({categories: [{id: 'categoryid', channel_ids: [channelId], team_id: id}], order: ['categoryid']})),
    getTeamByName: jest.fn((name: string) => ({id: teamId, name})),
    removeFromTeam: jest.fn(),
    getTeamMembersByIds: jest.fn((id: string, userIds: string[]) => (userIds.map((userId) => ({id: userId + '-' + id, user_id: userId, team_id: id, roles: ''})))),
    getPosts: jest.fn(() => ({
        order: ['yocj9xgkh78exk1uhx9yny1zxy', 'ad6yoisgh385fy7rkph49zpfqa', 'o5qqa4ntdigp7rbnf75f8hgeaw'],
        posts: [{
            channel_id: channelId,
            create_at: 1726107604522,
            delete_at: 0,
            edit_at: 0,
            hashtags: '',
            id: 'yocj9xgkh78exk1uhx9yny1zxy',
            is_pinned: false,
            last_reply_at: 0,
            message: 'Message ead863',
            metadata: {},
            original_id: '',
            participants: null,
            pending_post_id: '',
            props: {},
            remote_id: '',
            reply_count: 0,
            root_id: '',
            type: '',
            update_at: 1726107604522,
            user_id: 'k479wsypafgjddz8cerqx4m1ha',
        }],
        previousPostId: '',
    })),
};

beforeAll(() => {
    // eslint-disable-next-line
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('teamMember', () => {
    it('addCurrentUserToTeam - handle not found database', async () => {
        const result = await addCurrentUserToTeam('foo', '') as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('addCurrentUserToTeam - no current user', async () => {
        const result = await addCurrentUserToTeam(serverUrl, teamId);
        expect(result?.error).toBeDefined();
        expect(result.error).toBe('no current user');
    });

    it('addCurrentUserToTeam - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});

        const result = await addCurrentUserToTeam(serverUrl, teamId) as {member: TeamMembership};
        expect(result).toBeDefined();
        expect(result.member).toBeDefined();
    });

    it('addUserToTeam - handle not found database', async () => {
        const result = await addUserToTeam('foo', '', '') as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('addUserToTeam - base case', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});

        const result = await addUserToTeam(serverUrl, teamId, 'userid1') as {member: TeamMembership};
        expect(result).toBeDefined();
        expect(result.member).toBeDefined();
    });

    it('addUsersToTeam - handle not found database', async () => {
        const result = await addUsersToTeam('foo', '', []) as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('addUsersToTeam - base case', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});

        const result = await addUsersToTeam(serverUrl, teamId, ['userid1']) as {members: TeamMemberWithError[]};
        expect(result).toBeDefined();
        expect(result.members).toBeDefined();
    });

    it('sendEmailInvitesToTeam - base case', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});

        const result = await sendEmailInvitesToTeam(serverUrl, teamId, ['user1@mattermost.com']) as {members: TeamInviteWithError[]};
        expect(result).toBeDefined();
        expect(result.members).toBeDefined();
    });

    it('handleKickFromTeam - handle not found database', async () => {
        const result = await handleKickFromTeam('foo', '') as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('removeCurrentUserFromTeam - handle not found database', async () => {
        const result = await removeCurrentUserFromTeam('foo', '') as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('removeCurrentUserFromTeam - base case', async () => {
        const result = await removeCurrentUserFromTeam(serverUrl, teamId);
        expect(result).toBeDefined();
    });

    it('removeUserFromTeam - base case', async () => {
        const result = await removeUserFromTeam(serverUrl, 'userid1', teamId);
        expect(result).toBeDefined();
    });

    it('getTeamMembersByIds - handle not found database', async () => {
        const result = await getTeamMembersByIds('foo', '', []) as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('getTeamMembersByIds - base case', async () => {
        const result = await getTeamMembersByIds(serverUrl, teamId, ['userid1']);
        expect(result).toBeDefined();
        expect(result?.members).toBeDefined();
    });
});

describe('teams', () => {
    it('fetchMyTeams - handle not found database', async () => {
        const result = await fetchMyTeams('foo') as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('fetchMyTeams - base case', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});

        const result = await fetchMyTeams(serverUrl);
        expect(result).toBeDefined();
        expect(result.teams).toBeDefined();
        expect(result.memberships).toBeDefined();
    });

    it('fetchMyTeam - handle not found database', async () => {
        const result = await fetchMyTeam('foo', '') as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('fetchMyTeam - base case', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});

        const result = await fetchMyTeam(serverUrl, teamId);
        expect(result).toBeDefined();
        expect(result.teams).toBeDefined();
        expect(result.memberships).toBeDefined();
    });

    it('fetchAllTeams - base case', async () => {
        const result = await fetchAllTeams(serverUrl);
        expect(result).toBeDefined();
        expect(result.teams).toBeDefined();
    });

    it('fetchTeamsForComponent - base case', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});

        const result = await fetchTeamsForComponent(serverUrl, 0);
        expect(result).toBeDefined();
        expect(result.teams).toBeDefined();
        expect(result.hasMore).toBeFalsy();
    });

    it('updateCanJoinTeams - handle not found database', async () => {
        const result = await updateCanJoinTeams('foo') as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('updateCanJoinTeams - base case', async () => {
        const result = await updateCanJoinTeams(serverUrl);
        expect(result).toBeDefined();
    });

    it('fetchTeamsThreads - handle not found database', async () => {
        const result = await fetchTeamsThreads('foo', 0, []) as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('fetchTeamsThreads - base case', async () => {
        const result = await fetchTeamsThreads(
            serverUrl, 0,
            [team], true, false);
        expect(result).toBeDefined();
    });

    it('fetchTeamsThreads - fetch only case', async () => {
        const result = await fetchTeamsThreads(
            serverUrl, 0,
            [team], true, true);
        expect(result.models).toBeDefined();
    });

    it('fetchTeamByName - handle not found database', async () => {
        const result = await fetchTeamByName('foo', '') as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('fetchTeamByName - base case', async () => {
        const result = await fetchTeamByName(serverUrl, teamId);
        expect(result).toBeDefined();
        expect(result.team).toBeDefined();
    });

    it('handleTeamChange - handle not found database', async () => {
        const result = await handleTeamChange('foo', '') as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('handleTeamChange - base case', async () => {
        const result = await handleTeamChange(serverUrl, teamId);
        expect(result).toBeDefined();
        expect(result?.error).toBeUndefined();
        expect(fetchScheduledPosts).toHaveBeenCalledWith(serverUrl, teamId, false);
    });

    it('handleKickFromTeam - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        (getActiveServerUrl as jest.Mock).mockResolvedValueOnce(serverUrl);

        const result = await handleKickFromTeam(serverUrl, teamId);
        expect(result).toBeDefined();
        expect(result?.error).toBeUndefined();
    });

    it('buildTeamIconUrl - base case', async () => {
        const url = await buildTeamIconUrl(serverUrl, teamId);
        expect(url).toBeDefined();
    });
});
