// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {removeUserFromTeam} from '@actions/local/team';
import {fetchMyChannelsForTeam} from '@actions/remote/channel';
import {fetchRoles} from '@actions/remote/role';
import {fetchMyTeam, fetchTeamLoad, updateCanJoinTeams} from '@actions/remote/team';
import {updateUsersNoLongerVisible} from '@actions/remote/user';
import {handleTeamArchived, handleTeamRestored, handleLeaveTeamEvent, handleUpdateTeamEvent, handleUserAddedToTeamEvent} from '@actions/websocket/teams';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {removeTeamFromBlob} from '@queries/servers/system';
import {getCurrentTeam, queryMyTeamsByIds} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import ChannelsSyncStore from '@store/channels_sync_store';
import EphemeralStore from '@store/ephemeral_store';
import {setTeamLoading} from '@store/team_load_store';
import TestHelper from '@test/test_helper';
import {logDebug} from '@utils/log';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@actions/local/team', () => ({
    removeUserFromTeam: jest.fn(),
}));

jest.mock('@actions/remote/channel', () => ({
    fetchMyChannelsForTeam: jest.fn(),
}));

jest.mock('@actions/remote/role', () => ({
    fetchRoles: jest.fn(),
}));

jest.mock('@actions/remote/team', () => ({
    fetchMyTeam: jest.fn(),
    fetchTeamLoad: jest.fn(),
    handleKickFromTeam: jest.fn(),
    updateCanJoinTeams: jest.fn(),
}));

jest.mock('@actions/remote/user', () => ({
    updateUsersNoLongerVisible: jest.fn(),
}));

jest.mock('@managers/network_manager', () => ({
    getClient: jest.fn(),
}));

jest.mock('@queries/servers/system', () => ({
    removeTeamFromBlob: jest.fn(),
}));

jest.mock('@queries/servers/team', () => ({
    ...jest.requireActual('@queries/servers/team'),
    getCurrentTeam: jest.fn(),
    queryMyTeamsByIds: jest.fn(),
}));

jest.mock('@queries/servers/thread', () => ({
    getIsCRTEnabled: jest.fn(),
}));

jest.mock('@store/channels_sync_store', () => ({
    markChannelsFetched: jest.fn(),
}));

jest.mock('@queries/servers/user', () => ({
    getCurrentUser: jest.fn(),
}));

jest.mock('@store/ephemeral_store', () => ({
    isAddingToTeam: jest.fn(),
    startAddingToTeam: jest.fn(),
    finishAddingToTeam: jest.fn(),
    getExperienceAPIEnabled: jest.fn(),
}));

jest.mock('@store/team_load_store', () => ({
    setTeamLoading: jest.fn(),
}));

jest.mock('@utils/errors', () => ({
    getFullErrorMessage: jest.fn(),
}));

jest.mock('@utils/log', () => ({
    ...jest.requireActual('@utils/log'),
    logDebug: jest.fn(),
}));

describe('WebSocket Team Actions', () => {
    const serverUrl = 'https://example.com';
    let operator: ServerDataOperator;

    const mockedLogDebug = jest.mocked(logDebug);

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        DatabaseManager.getActiveServerUrl = jest.fn().mockResolvedValue(serverUrl);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.restoreAllMocks();
    });

    describe('handleTeamArchived', () => {
        const msg = {data: {team: JSON.stringify({id: 'team1'})}} as WebSocketMessage;

        it('should handle team archived event', async () => {
            const mockedQueryMyTeamsByIds = jest.mocked(queryMyTeamsByIds);
            const mockedGetCurrentTeam = jest.mocked(getCurrentTeam);
            const mockedRemoveUserFromTeam = jest.mocked(removeUserFromTeam);
            const mockedGetCurrentUser = jest.mocked(getCurrentUser);
            const mockedUpdateUsersNoLongerVisible = jest.mocked(updateUsersNoLongerVisible);
            const mockedUpdateCanJoinTeams = jest.mocked(updateCanJoinTeams);

            mockedQueryMyTeamsByIds.mockReturnValue(TestHelper.fakeQuery([TestHelper.fakeMyTeamModel({id: 'team1'})]));
            mockedGetCurrentTeam.mockResolvedValue(TestHelper.fakeTeamModel({id: 'team1'}));
            mockedRemoveUserFromTeam.mockResolvedValue({error: undefined});
            mockedGetCurrentUser.mockResolvedValue(TestHelper.fakeUserModel({id: 'user1', isGuest: true}));
            mockedUpdateUsersNoLongerVisible.mockResolvedValue({error: undefined});
            mockedUpdateCanJoinTeams.mockResolvedValue({error: undefined});

            await handleTeamArchived(serverUrl, msg);

            expect(mockedRemoveUserFromTeam).toHaveBeenCalledWith(serverUrl, 'team1');
            expect(mockedUpdateUsersNoLongerVisible).toHaveBeenCalledWith(serverUrl);
            expect(mockedUpdateCanJoinTeams).toHaveBeenCalledWith(serverUrl);
        });

        it('should handle team archived event - no membership', async () => {
            const mockedQueryMyTeamsByIds = jest.mocked(queryMyTeamsByIds);
            const mockedUpdateCanJoinTeams = jest.mocked(updateCanJoinTeams);
            const mockedRemoveUserFromTeam = jest.mocked(removeUserFromTeam);

            mockedQueryMyTeamsByIds.mockReturnValue(TestHelper.fakeQuery([]));
            mockedUpdateCanJoinTeams.mockResolvedValue({error: undefined});

            await handleTeamArchived(serverUrl, msg);

            expect(mockedRemoveUserFromTeam).not.toHaveBeenCalled();
            expect(mockedUpdateCanJoinTeams).toHaveBeenCalledWith(serverUrl);
        });

        it('should handle team archived event - not guest, not current team', async () => {
            const mockedQueryMyTeamsByIds = jest.mocked(queryMyTeamsByIds);
            const mockedGetCurrentTeam = jest.mocked(getCurrentTeam);
            const mockedRemoveUserFromTeam = jest.mocked(removeUserFromTeam);
            const mockedGetCurrentUser = jest.mocked(getCurrentUser);
            const mockedUpdateUsersNoLongerVisible = jest.mocked(updateUsersNoLongerVisible);
            const mockedUpdateCanJoinTeams = jest.mocked(updateCanJoinTeams);

            mockedQueryMyTeamsByIds.mockReturnValue(TestHelper.fakeQuery([TestHelper.fakeMyTeamModel({id: 'team1'})]));
            mockedGetCurrentTeam.mockResolvedValue(TestHelper.fakeTeamModel({id: 'team2'}));
            mockedRemoveUserFromTeam.mockResolvedValue({error: undefined});
            mockedGetCurrentUser.mockResolvedValue(TestHelper.fakeUserModel({id: 'user1', isGuest: false}));
            mockedUpdateCanJoinTeams.mockResolvedValue({error: undefined});

            await handleTeamArchived(serverUrl, msg);

            expect(mockedRemoveUserFromTeam).toHaveBeenCalledWith(serverUrl, 'team1');
            expect(mockedUpdateUsersNoLongerVisible).not.toHaveBeenCalled();
            expect(mockedUpdateCanJoinTeams).toHaveBeenCalledWith(serverUrl);
        });

        it('should remove team from blob when experience API is enabled', async () => {
            jest.mocked(queryMyTeamsByIds).mockReturnValue(TestHelper.fakeQuery([TestHelper.fakeMyTeamModel({id: 'team1'})]));
            jest.mocked(getCurrentTeam).mockResolvedValue(TestHelper.fakeTeamModel({id: 'team2'}));
            jest.mocked(removeUserFromTeam).mockResolvedValue({error: undefined});
            jest.mocked(getCurrentUser).mockResolvedValue(TestHelper.fakeUserModel({id: 'user1', isGuest: false}));
            jest.mocked(updateCanJoinTeams).mockResolvedValue({error: undefined});
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);

            await handleTeamArchived(serverUrl, msg);

            expect(removeTeamFromBlob).toHaveBeenCalledWith(operator, 'team1');
        });

        it('should not remove team from blob when experience API is disabled', async () => {
            jest.mocked(queryMyTeamsByIds).mockReturnValue(TestHelper.fakeQuery([TestHelper.fakeMyTeamModel({id: 'team1'})]));
            jest.mocked(getCurrentTeam).mockResolvedValue(TestHelper.fakeTeamModel({id: 'team2'}));
            jest.mocked(removeUserFromTeam).mockResolvedValue({error: undefined});
            jest.mocked(getCurrentUser).mockResolvedValue(TestHelper.fakeUserModel({id: 'user1', isGuest: false}));
            jest.mocked(updateCanJoinTeams).mockResolvedValue({error: undefined});
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);

            await handleTeamArchived(serverUrl, msg);

            expect(removeTeamFromBlob).not.toHaveBeenCalled();
        });

        it('should log error if an exception occurs', async () => {
            const mockedGetServerDatabaseAndOperator = jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator');

            mockedGetServerDatabaseAndOperator.mockImplementation(() => {
                throw new Error('Test error');
            });

            await handleTeamArchived(serverUrl, msg);

            expect(mockedLogDebug).toHaveBeenCalledWith('cannot handle archive team websocket event', expect.any(Error));
        });
    });

    describe('handleTeamRestored', () => {
        const msg = {data: {team: JSON.stringify({id: 'team1'})}} as WebSocketMessage;

        it('should use legacy path when experience API is disabled', async () => {
            const client = {getTeamMember: jest.fn().mockResolvedValue({delete_at: 0})};
            jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);
            jest.mocked(EphemeralStore.isAddingToTeam).mockReturnValue(false);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);
            jest.mocked(fetchMyChannelsForTeam).mockResolvedValue({channels: [], memberships: [], categories: []});
            jest.mocked(fetchRoles).mockResolvedValue({roles: [{id: 'role1', name: 'role1', permissions: []}]});
            jest.spyOn(operator, 'batchRecords').mockResolvedValueOnce();
            jest.spyOn(operator, 'handleRole').mockResolvedValueOnce([]);

            await handleTeamRestored(serverUrl, msg);

            expect(setTeamLoading).toHaveBeenCalledWith(serverUrl, true);
            expect(setTeamLoading).toHaveBeenCalledWith(serverUrl, false);
            expect(EphemeralStore.finishAddingToTeam).toHaveBeenCalledWith('team1');
            expect(updateCanJoinTeams).toHaveBeenCalledWith(serverUrl);
            expect(operator.batchRecords).toHaveBeenCalled();
            expect(fetchTeamLoad).not.toHaveBeenCalled();
        });

        it('should use fetchTeamLoad when experience API is enabled', async () => {
            const client = {getTeamMember: jest.fn().mockResolvedValue({delete_at: 0})};
            jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);
            jest.mocked(EphemeralStore.isAddingToTeam).mockReturnValue(false);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
            jest.mocked(getIsCRTEnabled).mockResolvedValue(false);
            jest.mocked(fetchTeamLoad).mockResolvedValue({});

            await handleTeamRestored(serverUrl, msg);

            expect(fetchTeamLoad).toHaveBeenCalledWith(serverUrl, 'team1', false);
            expect(setTeamLoading).toHaveBeenCalledWith(serverUrl, true);
            expect(setTeamLoading).toHaveBeenCalledWith(serverUrl, false);
            expect(EphemeralStore.finishAddingToTeam).toHaveBeenCalledWith('team1');
            expect(updateCanJoinTeams).toHaveBeenCalledWith(serverUrl);
            expect(fetchMyChannelsForTeam).not.toHaveBeenCalled();
        });

        it('should do nothing if already adding to team', async () => {
            const client = {getTeamMember: jest.fn().mockResolvedValue({delete_at: 0})};
            jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);
            jest.mocked(EphemeralStore.isAddingToTeam).mockReturnValue(true);

            await handleTeamRestored(serverUrl, msg);

            expect(setTeamLoading).not.toHaveBeenCalled();
            expect(fetchTeamLoad).not.toHaveBeenCalled();
        });

        it('should log error if an exception occurs', async () => {
            jest.mocked(NetworkManager.getClient).mockImplementationOnce(() => {
                throw new Error('Test error');
            });

            await handleTeamRestored(serverUrl, msg);

            expect(mockedLogDebug).toHaveBeenCalledWith('cannot handle restore team websocket event', undefined);
        });
    });

    describe('handleLeaveTeamEvent', () => {
        const msg = {data: {user_id: 'user1', team_id: 'team1'}} as WebSocketMessage;

        it('should handle leave team event', async () => {
            const mockedGetCurrentUser = jest.mocked(getCurrentUser);
            const mockedGetCurrentTeam = jest.mocked(getCurrentTeam);
            const mockedRemoveUserFromTeam = jest.mocked(removeUserFromTeam);

            mockedGetCurrentUser.mockResolvedValue(TestHelper.fakeUserModel({id: 'user1', isGuest: true}));
            mockedGetCurrentTeam.mockResolvedValue(TestHelper.fakeTeamModel({id: 'team1'}));

            await handleLeaveTeamEvent(serverUrl, msg);

            expect(mockedRemoveUserFromTeam).toHaveBeenCalledWith(serverUrl, 'team1');
        });

        it('should handle leave team event - not current user', async () => {
            const mockedGetCurrentUser = jest.mocked(getCurrentUser);
            const mockedRemoveUserFromTeam = jest.mocked(removeUserFromTeam);

            mockedGetCurrentUser.mockResolvedValue(TestHelper.fakeUserModel({id: 'user2', isGuest: true}));

            await handleLeaveTeamEvent(serverUrl, msg);

            expect(mockedRemoveUserFromTeam).not.toHaveBeenCalled();
        });

        it('should handle leave team event - not user', async () => {
            const mockedGetCurrentUser = jest.mocked(getCurrentUser);
            const mockedRemoveUserFromTeam = jest.mocked(removeUserFromTeam);

            mockedGetCurrentUser.mockResolvedValue(undefined);

            await handleLeaveTeamEvent(serverUrl, msg);

            expect(mockedRemoveUserFromTeam).not.toHaveBeenCalled();
        });

        it('should handle leave team event - not guest, not current team', async () => {
            const mockedGetCurrentUser = jest.mocked(getCurrentUser);
            const mockedGetCurrentTeam = jest.mocked(getCurrentTeam);
            const mockedRemoveUserFromTeam = jest.mocked(removeUserFromTeam);

            mockedGetCurrentUser.mockResolvedValue(TestHelper.fakeUserModel({id: 'user1', isGuest: false}));
            mockedGetCurrentTeam.mockResolvedValue(TestHelper.fakeTeamModel({id: 'team2'}));

            await handleLeaveTeamEvent(serverUrl, msg);

            expect(mockedRemoveUserFromTeam).toHaveBeenCalledWith(serverUrl, 'team1');
        });

        it('should remove team from blob when experience API is enabled', async () => {
            jest.mocked(getCurrentUser).mockResolvedValue(TestHelper.fakeUserModel({id: 'user1', isGuest: false}));
            jest.mocked(getCurrentTeam).mockResolvedValue(TestHelper.fakeTeamModel({id: 'team2'}));
            jest.mocked(removeUserFromTeam).mockResolvedValue({error: undefined});
            jest.mocked(updateCanJoinTeams).mockResolvedValue({error: undefined});
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);

            await handleLeaveTeamEvent(serverUrl, msg);

            expect(removeTeamFromBlob).toHaveBeenCalledWith(operator, 'team1');
        });

        it('should not remove team from blob when experience API is disabled', async () => {
            jest.mocked(getCurrentUser).mockResolvedValue(TestHelper.fakeUserModel({id: 'user1', isGuest: false}));
            jest.mocked(getCurrentTeam).mockResolvedValue(TestHelper.fakeTeamModel({id: 'team2'}));
            jest.mocked(removeUserFromTeam).mockResolvedValue({error: undefined});
            jest.mocked(updateCanJoinTeams).mockResolvedValue({error: undefined});
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);

            await handleLeaveTeamEvent(serverUrl, msg);

            expect(removeTeamFromBlob).not.toHaveBeenCalled();
        });

        it('should log error if an exception occurs', async () => {
            const mockedGetServerDatabaseAndOperator = jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator');

            mockedGetServerDatabaseAndOperator.mockImplementation(() => {
                throw new Error('Test error');
            });

            await handleLeaveTeamEvent(serverUrl, msg);

            expect(mockedLogDebug).toHaveBeenCalledWith('cannot handle leave team websocket event', expect.any(Error));
        });
    });

    describe('handleUpdateTeamEvent', () => {
        const msg = {data: {team: JSON.stringify({id: 'team1'})}} as WebSocketMessage;

        it('should handle update team event', async () => {
            const mockedHandleTeam = jest.spyOn(operator, 'handleTeam');

            await handleUpdateTeamEvent(serverUrl, msg);

            expect(mockedHandleTeam).toHaveBeenCalledWith({
                teams: [{id: 'team1'}],
                prepareRecordsOnly: false,
            });
        });

        it('should do nothing if an exception occurs', async () => {
            const mockedGetServerDatabaseAndOperator = jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator');
            const mockedHandleTeam = jest.spyOn(operator, 'handleTeam');

            mockedGetServerDatabaseAndOperator.mockImplementation(() => {
                throw new Error('Test error');
            });

            await handleUpdateTeamEvent(serverUrl, msg);

            expect(mockedHandleTeam).not.toHaveBeenCalled();
        });
    });

    describe('handleUserAddedToTeamEvent', () => {
        const msg = {data: {team_id: 'team1'}} as WebSocketMessage;

        it('should use legacy path when experience API is disabled', async () => {
            jest.mocked(EphemeralStore.isAddingToTeam).mockReturnValue(false);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);
            jest.mocked(fetchMyTeam).mockResolvedValue({teams: [], memberships: []});

            await handleUserAddedToTeamEvent(serverUrl, msg);

            expect(setTeamLoading).toHaveBeenCalledWith(serverUrl, true);
            expect(setTeamLoading).toHaveBeenCalledWith(serverUrl, false);
            expect(EphemeralStore.finishAddingToTeam).toHaveBeenCalledWith('team1');
            expect(fetchMyTeam).toHaveBeenCalledWith(serverUrl, 'team1', true);
            expect(fetchTeamLoad).not.toHaveBeenCalled();
        });

        it('should mark channels fetched via legacy path when teams and memberships are loaded', async () => {
            jest.mocked(EphemeralStore.isAddingToTeam).mockReturnValue(false);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);
            jest.mocked(fetchMyTeam).mockResolvedValue({
                teams: [TestHelper.fakeTeam({id: 'team1'})],
                memberships: [TestHelper.fakeTeamMember('user1', 'teamId')],
            });
            jest.mocked(fetchMyChannelsForTeam).mockResolvedValue({channels: [], memberships: [], categories: []});
            jest.mocked(fetchRoles).mockResolvedValue({roles: []});
            jest.spyOn(operator, 'batchRecords').mockResolvedValueOnce();

            await handleUserAddedToTeamEvent(serverUrl, msg);

            expect(ChannelsSyncStore.markChannelsFetched).toHaveBeenCalledWith(serverUrl, 'team1');
        });

        it('should use fetchTeamLoad when experience API is enabled', async () => {
            jest.mocked(EphemeralStore.isAddingToTeam).mockReturnValue(false);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
            jest.mocked(getIsCRTEnabled).mockResolvedValue(true);
            jest.mocked(fetchTeamLoad).mockResolvedValue({});

            await handleUserAddedToTeamEvent(serverUrl, msg);

            expect(fetchTeamLoad).toHaveBeenCalledWith(serverUrl, 'team1', true);
            expect(setTeamLoading).toHaveBeenCalledWith(serverUrl, true);
            expect(setTeamLoading).toHaveBeenCalledWith(serverUrl, false);
            expect(EphemeralStore.finishAddingToTeam).toHaveBeenCalledWith('team1');
            expect(fetchMyTeam).not.toHaveBeenCalled();
        });

        it('should handle user added to team event - already adding', async () => {
            jest.mocked(EphemeralStore.isAddingToTeam).mockReturnValue(true);

            await handleUserAddedToTeamEvent(serverUrl, msg);

            expect(EphemeralStore.finishAddingToTeam).not.toHaveBeenCalled();
            expect(fetchTeamLoad).not.toHaveBeenCalled();
            expect(fetchMyTeam).not.toHaveBeenCalled();
        });

        it('should log error if an exception occurs', async () => {
            jest.mocked(EphemeralStore.isAddingToTeam).mockReturnValue(false);
            jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockImplementation(() => {
                throw new Error('Test error');
            });

            await handleUserAddedToTeamEvent(serverUrl, msg);

            expect(mockedLogDebug).toHaveBeenCalledWith('could not handle user added to team websocket event');
        });
    });
});
