// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getActiveServerUrl} from '@queries/app/servers';
import ChannelsSyncStore from '@store/channels_sync_store';

import {fetchScheduledPosts} from './scheduled_post';
import {
    addCurrentUserToTeam,
    addUserToTeam,
    addUsersToTeam,
    sendEmailInvitesToTeam,
    sendGuestEmailInvitesToTeam,
    fetchMyTeams,
    fetchMyTeam,
    fetchTeamById,
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
    fetchTeamLoad,
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
    sendGuestEmailInvitesToTeamGracefully: jest.fn(() => Promise.resolve<TeamInviteWithError[]>([{email: 'guest1@example.com', error: {message: '', status_code: 0}}])),
    getRolesByNames: jest.fn((roles: string[]) => roles.map((r) => ({id: r, name: r} as Role))),
    getMyTeams: jest.fn(() => ([{id: teamId, name: 'team1'}])),
    getMyTeamMembers: jest.fn(() => ([{id: 'userid1-' + teamId, user_id: 'userid1', team_id: teamId, roles: ''}])),
    getTeams: jest.fn(() => ([{id: teamId, name: 'team1'}])),
    getMyChannels: jest.fn((id: string) => ([{id: channelId, name: 'channel1', creatorId: user.id, team_id: id, total_msg_count: 1}])),
    getMyChannelMembers: jest.fn(() => ([{id: user.id + '-' + channelId, user_id: user.id, channel_id: channelId, roles: '', msg_count: 0}])),
    getCategories: jest.fn((userId: string, id: string) => ({categories: [{id: 'categoryid', channel_ids: [channelId], team_id: id}], order: ['categoryid']})),
    getTeamByName: jest.fn((name: string) => ({id: teamId, name})),
    getTeamLoad: jest.fn(() => ({
        channels: [],
        channel_members: {members: [], removed_channel_ids: []},
        sidebar_categories: undefined,
        sidebar_version: 0,
        roles: [],
        timestamp: 1706000000001,
    } as TeamLoadResponse)),
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

describe('remote team actions', () => {
    beforeAll(() => {
        NetworkManager.getClient = () => mockClient as unknown as ReturnType<typeof NetworkManager.getClient>;
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

        it('addUserToTeam - isTablet branch fetches posts when default channel exists', async () => {
            mockIsTablet.mockReturnValueOnce(true);
            await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
            await operator.handleChannel({
                channels: [{id: channelId, name: 'channel1', team_id: teamId, type: 'O', total_msg_count: 0, create_at: 0, update_at: 0, delete_at: 0, creator_id: '', display_name: '', header: '', last_post_at: 0, purpose: '', scheme_id: '', group_constrained: false, shared: false, last_root_post_at: 0, total_msg_count_root: 0} as unknown as Channel],
                prepareRecordsOnly: false,
            });
            await operator.handleMyChannel({
                channels: [{id: channelId, name: 'channel1', team_id: teamId, type: 'O', total_msg_count: 0, create_at: 0, update_at: 0, delete_at: 0, creator_id: '', display_name: '', header: '', last_post_at: 0, purpose: '', scheme_id: '', group_constrained: false, shared: false, last_root_post_at: 0, total_msg_count_root: 0} as unknown as Channel],
                myChannels: [{id: channelId, channel_id: channelId, user_id: user.id, roles: '', last_viewed_at: 0, msg_count: 0, mention_count: 0} as ChannelMembership],
                prepareRecordsOnly: false,
            });

            const result = await addUserToTeam(serverUrl, teamId, 'userid1') as {member: TeamMembership};
            expect(result.member).toBeDefined();
        });

        it('addUserToTeam - error path', async () => {
            (mockClient.addToTeam as jest.Mock).mockRejectedValueOnce(new Error('network error'));

            const result = await addUserToTeam(serverUrl, teamId, 'userid1') as {error: unknown};
            expect(result.error).toBeDefined();
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

        it('addUsersToTeam - error path finishes adding to team', async () => {
            (mockClient.addUsersToTeamGracefully as jest.Mock).mockRejectedValueOnce(new Error('network error'));

            const result = await addUsersToTeam(serverUrl, teamId, ['userid1']) as {error: unknown};
            expect(result.error).toBeDefined();
        });

        it('sendEmailInvitesToTeam - base case', async () => {
            await operator.handleTeam({teams: [team], prepareRecordsOnly: false});

            const result = await sendEmailInvitesToTeam(serverUrl, teamId, ['user1@mattermost.com']) as {members: TeamInviteWithError[]};
            expect(result).toBeDefined();
            expect(result.members).toBeDefined();
        });

        it('sendEmailInvitesToTeam - error path', async () => {
            (mockClient.sendEmailInvitesToTeamGracefully as jest.Mock).mockRejectedValueOnce(new Error('network error'));

            const result = await sendEmailInvitesToTeam(serverUrl, teamId, ['user1@mattermost.com']) as {error: unknown};
            expect(result.error).toBeDefined();
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

        it('removeUserFromTeam - error path', async () => {
            (mockClient.removeFromTeam as jest.Mock).mockRejectedValueOnce(new Error('network error'));

            const result = await removeUserFromTeam(serverUrl, 'userid1', teamId) as {error: unknown};
            expect(result.error).toBeDefined();
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

    describe('sendGuestEmailInvitesToTeam', () => {
        const emails = ['guest1@example.com', 'guest2@example.com'];
        const channels = ['channel-id-1', 'channel-id-2'];
        const message = 'Welcome to the team!';

        const throwFunc = () => {
            throw Error('error');
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should send guest email invites successfully with all parameters', async () => {
            const mockMembers: TeamInviteWithError[] = [
                {email: 'guest1@example.com', error: {message: '', status_code: 0}},
                {email: 'guest2@example.com', error: {message: '', status_code: 0}},
            ];
            mockClient.sendGuestEmailInvitesToTeamGracefully.mockResolvedValueOnce(mockMembers);

            const result = await sendGuestEmailInvitesToTeam(serverUrl, teamId, emails, channels, message);

            expect(result).toBeDefined();
            expect(result.error).toBeUndefined();
            expect(result.members).toEqual(mockMembers);
            expect(mockClient.sendGuestEmailInvitesToTeamGracefully).toHaveBeenCalledWith(teamId, emails, channels, message, false);
            expect(mockClient.sendGuestEmailInvitesToTeamGracefully).toHaveBeenCalledTimes(1);
        });

        it('should send guest email invites successfully without message parameter', async () => {
            const mockMembers: TeamInviteWithError[] = [
                {email: 'guest1@example.com', error: {message: '', status_code: 0}},
            ];
            mockClient.sendGuestEmailInvitesToTeamGracefully.mockResolvedValueOnce(mockMembers);

            const result = await sendGuestEmailInvitesToTeam(serverUrl, teamId, ['guest1@example.com'], channels);

            expect(result).toBeDefined();
            expect(result.error).toBeUndefined();
            expect(result.members).toEqual(mockMembers);
            expect(mockClient.sendGuestEmailInvitesToTeamGracefully).toHaveBeenCalledWith(teamId, ['guest1@example.com'], channels, '', false);
            expect(mockClient.sendGuestEmailInvitesToTeamGracefully).toHaveBeenCalledTimes(1);
        });

        it('should handle client error', async () => {
            const clientError = new Error('Client error');
            mockClient.sendGuestEmailInvitesToTeamGracefully.mockRejectedValueOnce(clientError);

            const result = await sendGuestEmailInvitesToTeam(serverUrl, teamId, emails, channels, message);

            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
            expect(result.members).toEqual([]);
            expect(mockClient.sendGuestEmailInvitesToTeamGracefully).toHaveBeenCalledWith(teamId, emails, channels, message, false);
        });

        it('should handle network manager error', async () => {
            jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

            const result = await sendGuestEmailInvitesToTeam(serverUrl, teamId, emails, channels, message);

            expect(result).toBeDefined();
            expect(result.error).toBeDefined();
            expect(result.members).toEqual([]);
        });

        it('should send guest email invites with guest magic link', async () => {
            const mockMembers: TeamInviteWithError[] = [
                {email: 'guest1@example.com', error: {message: '', status_code: 0}},
            ];
            mockClient.sendGuestEmailInvitesToTeamGracefully.mockResolvedValueOnce(mockMembers);

            const result = await sendGuestEmailInvitesToTeam(serverUrl, teamId, emails, channels, message, true);

            expect(result).toBeDefined();
            expect(result.error).toBeUndefined();
            expect(result.members).toEqual(mockMembers);
            expect(mockClient.sendGuestEmailInvitesToTeamGracefully).toHaveBeenCalledWith(teamId, emails, channels, message, true);
            expect(mockClient.sendGuestEmailInvitesToTeamGracefully).toHaveBeenCalledTimes(1);
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

        it('fetchMyTeams - removes deleted team memberships', async () => {
            const deletedTeamId = 'deletedteamid';
            const deletedTeam: Team = {id: deletedTeamId, name: 'deleted-team', delete_at: 0} as Team;
            await operator.handleTeam({teams: [team, deletedTeam], prepareRecordsOnly: false});

            mockClient.getMyTeams.mockReturnValueOnce([team, {id: deletedTeamId, name: 'deleted-team'}]);
            mockClient.getMyTeamMembers.mockReturnValueOnce(([
                {id: 'userid1-' + teamId, user_id: 'userid1', team_id: teamId, roles: '', delete_at: 0},
                {id: 'userid1-' + deletedTeamId, user_id: 'userid1', team_id: deletedTeamId, roles: '', delete_at: 1706000000000},
            ] as unknown) as ReturnType<typeof mockClient.getMyTeamMembers>);

            const result = await fetchMyTeams(serverUrl);
            expect(result.error).toBeUndefined();
            expect(result.teams).toBeDefined();
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

        it('fetchTeamById - base case', async () => {
            const result = await fetchTeamById(serverUrl, teamId);
            expect(result).toBeDefined();
            expect(result.team).toBeDefined();
            expect(result.team?.id).toBe(teamId);
            expect(mockClient.getTeam).toHaveBeenCalledWith(teamId);
        });

        it('fetchTeamById - error path', async () => {
            (mockClient.getTeam as jest.Mock).mockRejectedValueOnce(new Error('not found'));

            const result = await fetchTeamById(serverUrl, teamId) as {error: unknown};
            expect(result.error).toBeDefined();
        });

        it('fetchAllTeams - base case', async () => {
            const result = await fetchAllTeams(serverUrl);
            expect(result).toBeDefined();
            expect(result.teams).toBeDefined();
        });

        it('fetchAllTeams - error path', async () => {
            (mockClient.getTeams as jest.Mock).mockRejectedValueOnce(new Error('network error'));

            const result = await fetchAllTeams(serverUrl) as {error: unknown};
            expect(result.error).toBeDefined();
        });

        it('fetchTeamsForComponent - base case', async () => {
            await operator.handleTeam({teams: [team], prepareRecordsOnly: false});

            const result = await fetchTeamsForComponent(serverUrl, 0);
            expect(result).toBeDefined();
            expect(result.teams).toBeDefined();
            expect(result.hasMore).toBeFalsy();
        });

        it('fetchTeamsForComponent - returns empty when fetchAllTeams errors', async () => {
            (mockClient.getTeams as jest.Mock).mockRejectedValueOnce(new Error('network error'));

            const result = await fetchTeamsForComponent(serverUrl, 0);
            expect(result.teams).toEqual([]);
            expect(result.hasMore).toBe(false);
        });

        it('fetchTeamsForComponent - recurses when alreadyLoaded exceeds threshold', async () => {
            // First page returns PER_PAGE_DEFAULT teams to set hasMore=true with >10 loaded
            const manyTeams = Array.from({length: 60}, (_, i) => ({id: `team${i}`, name: `team${i}`, delete_at: 0} as Team));
            (mockClient.getTeams as jest.Mock).mockReturnValueOnce(manyTeams).mockReturnValueOnce([]);

            const result = await fetchTeamsForComponent(serverUrl, 0);
            expect(result.teams.length).toBeGreaterThan(0);
        });

        it('updateCanJoinTeams - returns error when no network client exists for the server', async () => {
            // The suite-wide beforeAll stubs NetworkManager.getClient to always
            // return mockClient. Restore the real implementation here so the
            // missing-client path actually throws.
            jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce((url: string) => {
                throw new Error(`${url} client not found`);
            });

            const result = await updateCanJoinTeams('foo') as {error: unknown};
            expect(result?.error).toBeDefined();
        });

        it('updateCanJoinTeams - base case', async () => {
            const result = await updateCanJoinTeams(serverUrl);
            expect(result).toBeDefined();
        });

        it('updateCanJoinTeams - finds a joinable team', async () => {
            // Return a team that is not in myTeams and not deleted → canJoin=true
            (mockClient.getTeams as jest.Mock).mockReturnValueOnce([{id: 'joinableteam', name: 'joinable', delete_at: 0}]);

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

        it('fetchTeamByName - fetchOnly skips batch', async () => {
            const result = await fetchTeamByName(serverUrl, 'team_name', true);
            expect(result.team).toBeDefined();
        });

        it('handleTeamChange - handle not found database', async () => {
            const result = await handleTeamChange('foo', '') as {error: unknown};
            expect(result?.error).toBeDefined();
        });

        it('handleTeamChange - same team returns early', async () => {
            await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

            const result = await handleTeamChange(serverUrl, teamId);
            expect(result).toEqual({});
            expect(fetchScheduledPosts).not.toHaveBeenCalled();
        });

        it('handleTeamChange - base case', async () => {
            const result = await handleTeamChange(serverUrl, teamId);
            expect(result).toBeDefined();
            expect(result?.error).toBeUndefined();
            expect(fetchScheduledPosts).toHaveBeenCalledWith(serverUrl, teamId, false);
        });

        it('handleTeamChange - isTablet returns early after channel switch', async () => {
            mockIsTablet.mockReturnValueOnce(true);
            (mockClient.getMyChannels as jest.Mock).mockReturnValueOnce([{id: channelId, name: 'channel1', team_id: teamId, type: 'O', total_msg_count: 0}]);

            const result = await handleTeamChange(serverUrl, teamId);
            expect(result).toEqual({});
        });

        it('handleKickFromTeam - no-op when not current team', async () => {
            await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'otherteam'}], prepareRecordsOnly: false});

            const result = await handleKickFromTeam(serverUrl, teamId);
            expect(result).toEqual({});
        });

        it('handleKickFromTeam - base case', async () => {
            await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
            (getActiveServerUrl as jest.Mock).mockResolvedValueOnce(serverUrl);

            const result = await handleKickFromTeam(serverUrl, teamId);
            expect(result).toBeDefined();
            expect(result?.error).toBeUndefined();
        });

        it('handleKickFromTeam - jumps to another team when available', async () => {
            const otherTeamId = 'otherteamid';
            await operator.handleTeam({teams: [{...team, id: otherTeamId, name: 'otherteam'}], prepareRecordsOnly: false});
            await operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId},
                    {id: SYSTEM_IDENTIFIERS.TEAM_HISTORY, value: JSON.stringify([otherTeamId, teamId])},
                ],
                prepareRecordsOnly: false,
            });
            (getActiveServerUrl as jest.Mock).mockResolvedValueOnce(null);

            const result = await handleKickFromTeam(serverUrl, teamId);
            expect(result).toBeDefined();
            expect(result?.error).toBeUndefined();
        });

        it('buildTeamIconUrl - base case', async () => {
            const url = await buildTeamIconUrl(serverUrl, teamId);
            expect(url).toBeDefined();
        });
    });

    describe('fetchTeamLoad', () => {
        it('should return error when database not found', async () => {
            const result = await fetchTeamLoad('foo', teamId, false) as {error: unknown};
            expect(result?.error).toBeDefined();
        });

        it('should batch channels, members, and cursor into the database', async () => {
            const result = await fetchTeamLoad(serverUrl, teamId, false);
            expect(result.error).toBeUndefined();
            expect(mockClient.getTeamLoad).toHaveBeenCalledWith(teamId, undefined);
        });

        it('should pass the stored since cursor on subsequent calls', async () => {
            const since = 1706000000000;
            await operator.handleSystem({
                systems: [{id: `${SYSTEM_IDENTIFIERS.LAST_TEAM_LOAD}_${teamId}`, value: since}],
                prepareRecordsOnly: false,
            });

            await fetchTeamLoad(serverUrl, teamId, false);
            expect(mockClient.getTeamLoad).toHaveBeenCalledWith(teamId, since);
        });

        it('should map channels and members from response', async () => {
            mockClient.getTeamLoad.mockReturnValueOnce({
                channels: [{
                    id: channelId,
                    name: 'channel1',
                    display_name: 'Channel 1',
                    type: 'O',
                    team_id: teamId,
                    total_msg_count: 0,
                    last_post_at: 0,
                }] as ChannelLoadItem[],
                channel_members: {
                    members: [{
                        channel_id: channelId,
                        user_id: user.id,
                        roles: '',
                        last_viewed_at: 0,
                        msg_count: 0,
                        mention_count: 0,
                    }] as ChannelMemberLoadItem[],
                    removed_channel_ids: [] as string[],
                },
                sidebar_categories: undefined,
                sidebar_version: 0,
                roles: [] as RoleLoadItem[],
                timestamp: 1706000000002,
            } as TeamLoadResponse);

            const result = await fetchTeamLoad(serverUrl, teamId, false);
            expect(result.error).toBeUndefined();
        });

        it('should filter removed channels before model prep', async () => {
            mockClient.getTeamLoad.mockReturnValueOnce({
                channels: [{id: channelId, name: 'channel1', type: 'O', team_id: teamId, total_msg_count: 0, last_post_at: 0}] as ChannelLoadItem[],
                channel_members: {
                    members: [] as ChannelMemberLoadItem[],
                    removed_channel_ids: [channelId],
                },
                sidebar_categories: undefined,
                sidebar_version: 0,
                roles: [] as RoleLoadItem[],
                timestamp: 1706000000003,
            } as TeamLoadResponse);

            const result = await fetchTeamLoad(serverUrl, teamId, false);
            expect(result.error).toBeUndefined();
        });

        it('should handle roles in response', async () => {
            mockClient.getTeamLoad.mockReturnValueOnce({
                channels: [] as ChannelLoadItem[],
                channel_members: {members: [] as ChannelMemberLoadItem[], removed_channel_ids: [] as string[]},
                sidebar_categories: undefined,
                sidebar_version: 0,
                roles: [{id: 'role1', name: 'channel_user', permissions: [], create_at: 0, update_at: 0, delete_at: 0}] as RoleLoadItem[],
                timestamp: 1706000000004,
            } as TeamLoadResponse);

            const result = await fetchTeamLoad(serverUrl, teamId, false);
            expect(result.error).toBeUndefined();
        });

        it('should set member_count override for GM channels', async () => {
            const gmChannelId = 'gmchannel1';
            mockClient.getTeamLoad.mockReturnValueOnce({
                channels: [{
                    id: gmChannelId,
                    name: 'gm-channel',
                    display_name: 'GM Channel',
                    type: 'G',
                    team_id: teamId,
                    total_msg_count: 0,
                    last_post_at: 0,
                    member_count: 3,
                }] as ChannelLoadItem[],
                channel_members: {members: [] as ChannelMemberLoadItem[], removed_channel_ids: [] as string[]},
                sidebar_categories: undefined,
                sidebar_version: 0,
                roles: [] as RoleLoadItem[],
                timestamp: 1706000000005,
            } as TeamLoadResponse);

            const result = await fetchTeamLoad(serverUrl, teamId, false);
            expect(result.error).toBeUndefined();
        });

        it('should delete tombstoned channels from the database', async () => {
            const removedId = 'removedchan1';

            // Pre-seed the channel in DB so the tombstone query finds it.
            await operator.handleChannel({
                channels: [{id: removedId, name: 'removed', team_id: teamId, type: 'O', total_msg_count: 0, create_at: 0, update_at: 0, delete_at: 0, creator_id: '', display_name: '', header: '', last_post_at: 0, purpose: '', scheme_id: '', group_constrained: false, shared: false, last_root_post_at: 0, total_msg_count_root: 0} as unknown as Channel],
                prepareRecordsOnly: false,
            });

            mockClient.getTeamLoad.mockReturnValueOnce({
                channels: [] as ChannelLoadItem[],
                channel_members: {
                    members: [] as ChannelMemberLoadItem[],
                    removed_channel_ids: [removedId],
                },
                sidebar_categories: undefined,
                sidebar_version: 0,
                roles: [] as RoleLoadItem[],
                timestamp: 1706000000006,
            } as TeamLoadResponse);

            const result = await fetchTeamLoad(serverUrl, teamId, false);
            expect(result.error).toBeUndefined();
        });

        it('should mark the team as channels-fetched after the batch succeeds', async () => {
            ChannelsSyncStore.clearServer(serverUrl);
            expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamId)).toBe(false);

            const result = await fetchTeamLoad(serverUrl, teamId, false);

            expect(result.error).toBeUndefined();
            expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamId)).toBe(true);
        });

        it('should NOT mark the team as channels-fetched when the fetch fails', async () => {
            ChannelsSyncStore.clearServer(serverUrl);
            mockClient.getTeamLoad.mockImplementationOnce(() => {
                throw new Error('network');
            });

            const result = await fetchTeamLoad(serverUrl, teamId, false);

            expect(result.error).toBeDefined();
            expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamId)).toBe(false);
        });
    });
});
