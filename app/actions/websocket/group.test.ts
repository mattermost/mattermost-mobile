// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchGroupsForChannel, fetchGroupsForMember, fetchGroupsForTeam} from '@actions/remote/groups';
import DatabaseManager from '@database/manager';
import {deleteGroupChannelById, deleteGroupMembershipById, deleteGroupTeamById} from '@queries/servers/group';
import {generateGroupAssociationId} from '@utils/groups';

import {
    handleGroupReceivedEvent,
    handleGroupMemberAddEvent,
    handleGroupMemberDeleteEvent,
    handleGroupTeamAssociatedEvent,
    handleGroupTeamDissociateEvent,
    handleGroupChannelAssociatedEvent,
    handleGroupChannelDissociateEvent,
} from './group';

jest.mock('@actions/remote/groups');
jest.mock('@database/manager');
jest.mock('@queries/servers/group');
jest.mock('@utils/groups');
jest.mock('@utils/log');

describe('WebSocket Group Actions', () => {
    const serverUrl = 'baseHandler.test.com';
    const groupId = 'group-id';
    const userId = 'user-id';
    const teamId = 'team-id';
    const channelId = 'channel-id';

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        DatabaseManager.serverDatabases[serverUrl] = {
            operator: {
                handleGroups: jest.fn(),
                handleGroupMembershipsForMember: jest.fn(),
                handleGroupTeamsForTeam: jest.fn(),
                handleGroupChannelsForChannel: jest.fn(),
            },
        } as any;
        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({
            database: {},
            operator: {
                handleGroups: jest.fn(),
                handleGroupMembershipsForMember: jest.fn(),
                handleGroupTeamsForTeam: jest.fn(),
                handleGroupChannelsForChannel: jest.fn(),
            },
        });
    });

    describe('handleGroupReceivedEvent', () => {
        it('should handle group received successfully', async () => {
            const msg = {
                data: {
                    group: JSON.stringify({id: groupId}),
                },
            } as WebSocketMessage;

            await handleGroupReceivedEvent(serverUrl, msg);

            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            expect(operator.handleGroups).toHaveBeenCalledWith({
                groups: [{id: groupId}],
                prepareRecordsOnly: false,
            });
        });
    });

    describe('handleGroupMemberAddEvent', () => {
        it('should handle group member add successfully', async () => {
            const msg = {
                data: {
                    group_member: JSON.stringify({
                        group_id: groupId,
                        user_id: userId,
                    }),
                },
            } as WebSocketMessage;

            await handleGroupMemberAddEvent(serverUrl, msg);

            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            expect(operator.handleGroupMembershipsForMember).toHaveBeenCalledWith({
                userId,
                groups: [{id: groupId}],
                prepareRecordsOnly: false,
            });
        });
    });

    describe('handleGroupMemberDeleteEvent', () => {
        it('should handle group member delete successfully', async () => {
            const msg = {
                data: {
                    group_member: JSON.stringify({
                        group_id: groupId,
                        user_id: userId,
                    }),
                },
            } as WebSocketMessage;

            jest.mocked(generateGroupAssociationId).mockReturnValue('association-id');

            await handleGroupMemberDeleteEvent(serverUrl, msg);

            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            expect(deleteGroupMembershipById).toHaveBeenCalledWith(database, 'association-id');
        });
    });

    describe('handleGroupTeamAssociatedEvent', () => {
        it('should handle group team association successfully', async () => {
            const msg = {
                data: {
                    group_team: JSON.stringify({
                        group_id: groupId,
                        team_id: teamId,
                    }),
                },
            } as WebSocketMessage;

            await handleGroupTeamAssociatedEvent(serverUrl, msg);

            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            expect(operator.handleGroupTeamsForTeam).toHaveBeenCalledWith({
                teamId,
                groups: [{id: groupId}],
                prepareRecordsOnly: false,
            });
        });
    });

    describe('handleGroupTeamDissociateEvent', () => {
        it('should handle group team dissociation successfully', async () => {
            const msg = {
                data: {
                    group_team: JSON.stringify({
                        group_id: groupId,
                        team_id: teamId,
                    }),
                },
            } as WebSocketMessage;

            jest.mocked(generateGroupAssociationId).mockReturnValue('association-id');

            await handleGroupTeamDissociateEvent(serverUrl, msg);

            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            expect(deleteGroupTeamById).toHaveBeenCalledWith(database, 'association-id');
        });
    });

    describe('handleGroupChannelAssociatedEvent', () => {
        it('should handle group channel association successfully', async () => {
            const msg = {
                data: {
                    group_channel: JSON.stringify({
                        group_id: groupId,
                        channel_id: channelId,
                    }),
                },
            } as WebSocketMessage;

            await handleGroupChannelAssociatedEvent(serverUrl, msg);

            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            expect(operator.handleGroupChannelsForChannel).toHaveBeenCalledWith({
                channelId,
                groups: [{id: groupId}],
                prepareRecordsOnly: false,
            });
        });
    });

    describe('handleGroupChannelDissociateEvent', () => {
        it('should handle group channel dissociation successfully', async () => {
            const msg = {
                data: {
                    group_channel: JSON.stringify({
                        group_id: groupId,
                        channel_id: channelId,
                    }),
                },
            } as WebSocketMessage;

            jest.mocked(generateGroupAssociationId).mockReturnValue('association-id');

            await handleGroupChannelDissociateEvent(serverUrl, msg);

            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            expect(deleteGroupChannelById).toHaveBeenCalledWith(database, 'association-id');
        });
    });

    describe('error handling', () => {
        it('should handle errors and fetch groups on failure', async () => {
            const msg = {
                broadcast: {
                    team_id: teamId,
                    channel_id: channelId,
                    user_id: userId,
                },
                data: {
                    group: 'invalid json',
                },
            } as WebSocketMessage;

            await handleGroupReceivedEvent(serverUrl, msg);

            expect(fetchGroupsForTeam).toHaveBeenCalledWith(serverUrl, teamId);
            expect(fetchGroupsForChannel).toHaveBeenCalledWith(serverUrl, channelId);
            expect(fetchGroupsForMember).toHaveBeenCalledWith(serverUrl, userId);
        });

        it('should handle invalid json on all events', async () => {
            const msg = {
                broadcast: {
                    team_id: teamId,
                },
                data: {
                    group: 'invalid json',
                    group_member: 'invalid json',
                    group_team: 'invalid json',
                    group_channel: 'invalid json',
                },
            } as WebSocketMessage;

            await handleGroupReceivedEvent(serverUrl, msg);
            await handleGroupMemberAddEvent(serverUrl, msg);
            await handleGroupMemberDeleteEvent(serverUrl, msg);
            await handleGroupTeamAssociatedEvent(serverUrl, msg);
            await handleGroupTeamDissociateEvent(serverUrl, msg);
            await handleGroupChannelAssociatedEvent(serverUrl, msg);
            await handleGroupChannelDissociateEvent(serverUrl, msg);

            expect(fetchGroupsForTeam).toHaveBeenCalledWith(serverUrl, teamId);
            expect(fetchGroupsForTeam).toHaveBeenCalledTimes(7);
        });

        it('should handle missing data', async () => {
            const msg = {
                broadcast: {
                    team_id: teamId,
                },
                data: {},
            } as WebSocketMessage;

            await handleGroupReceivedEvent(serverUrl, msg);
            await handleGroupMemberAddEvent(serverUrl, msg);
            await handleGroupMemberDeleteEvent(serverUrl, msg);
            await handleGroupTeamAssociatedEvent(serverUrl, msg);
            await handleGroupTeamDissociateEvent(serverUrl, msg);
            await handleGroupChannelAssociatedEvent(serverUrl, msg);
            await handleGroupChannelDissociateEvent(serverUrl, msg);

            expect(DatabaseManager.getServerDatabaseAndOperator).not.toHaveBeenCalled();
        });
    });
});
