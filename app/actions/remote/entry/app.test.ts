// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import {fetchMyTeam} from '@actions/remote/team';
import {refetchCurrentUser} from '@actions/remote/user';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {getCurrentChannelId, getCurrentUserId, prepareCommonSystemValues} from '@queries/servers/system';
import {NavigationStore} from '@store/navigation_store';

import {appEntry} from './app';

jest.mock('@actions/local/systems');
jest.mock('@actions/remote/channel');
jest.mock('@actions/remote/team');
jest.mock('@actions/remote/user');
jest.mock('@agents/actions/remote/agents');

// The shared mock in test/setup.ts is a singleton, so reassigning its methods in
// beforeEach is order-sensitive; keep this file-local factory.
jest.mock('@database/manager', () => ({
    __esModule: true,
    default: {
        getServerDatabaseAndOperator: jest.fn(),
        serverDatabases: {},
    },
}));
jest.mock('@managers/websocket_manager');
jest.mock('@queries/servers/system');
jest.mock('./common');

describe('actions/remote/entry/app', () => {
    const serverUrl = 'https://server.example.com';

    const mockOperator = {
        batchRecords: jest.fn(),
    };
    const mockDatabase = {};

    beforeEach(() => {
        jest.clearAllMocks();

        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({
            database: mockDatabase,
            operator: mockOperator,
        } as unknown as ReturnType<typeof DatabaseManager.getServerDatabaseAndOperator>);

        jest.mocked(prepareCommonSystemValues).mockResolvedValue([]);
        jest.mocked(getCurrentUserId).mockResolvedValue('user1');
        jest.mocked(refetchCurrentUser).mockResolvedValue({currentUserId: 'user1'});
    });

    it('should seed the current user by calling refetchCurrentUser when getCurrentUserId returns no value', async () => {
        jest.mocked(getCurrentUserId).mockResolvedValueOnce('');
        jest.mocked(refetchCurrentUser).mockResolvedValueOnce({currentUserId: 'seededUser'});

        const result = await appEntry(serverUrl);

        expect(refetchCurrentUser).toHaveBeenCalledWith(serverUrl, undefined);
        expect(result).toEqual({});
    });

    it('should return an error when refetchCurrentUser fails to seed the current user', async () => {
        jest.mocked(getCurrentUserId).mockResolvedValueOnce('');
        jest.mocked(refetchCurrentUser).mockResolvedValueOnce({error: 'No user fetched'});

        const result = await appEntry(serverUrl);

        expect(result).toEqual({error: new Error('appEntry: failed to seed current user')});
    });

    describe('restoring a channel', () => {
        const teamId = 'team1';
        const channelId = 'channel1';

        beforeEach(() => {
            jest.mocked(fetchMyTeam).mockResolvedValue({teams: [], memberships: []});
            jest.mocked(fetchMyChannel).mockResolvedValue({channels: [], memberships: []});
            jest.mocked(getCurrentChannelId).mockResolvedValue('');
        });

        it('should switch to the restored channel once its membership is fetched, before opening the websocket', async () => {
            await appEntry(serverUrl, {teamId, channelId});

            expect(fetchMyChannel).toHaveBeenCalledWith(serverUrl, teamId, channelId);
            expect(switchToChannelById).toHaveBeenCalledWith(serverUrl, channelId, teamId);
            expect(jest.mocked(switchToChannelById).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(WebsocketManager.openAll).mock.invocationCallOrder[0]);
        });

        it('should still open the websocket without switching when the restored channel membership cannot be fetched', async () => {
            jest.mocked(fetchMyChannel).mockResolvedValue({error: new Error('forbidden')});

            await appEntry(serverUrl, {teamId, channelId});

            expect(switchToChannelById).not.toHaveBeenCalled();
            expect(WebsocketManager.openAll).toHaveBeenCalledTimes(1);
        });

        it('should not switch to global threads when the restored team membership cannot be fetched', async () => {
            jest.mocked(fetchMyTeam).mockResolvedValue({error: new Error('forbidden')});

            await appEntry(serverUrl, {teamId, channelId: Screens.GLOBAL_THREADS});

            expect(switchToChannelById).not.toHaveBeenCalled();
        });

        it('should switch to global threads without fetching a channel membership', async () => {
            await appEntry(serverUrl, {teamId, channelId: Screens.GLOBAL_THREADS});

            expect(fetchMyChannel).not.toHaveBeenCalled();
            expect(switchToChannelById).toHaveBeenCalledWith(serverUrl, Screens.GLOBAL_THREADS, teamId);
        });

        it('should not switch when the user opened another screen while the memberships were fetched', async () => {
            jest.spyOn(NavigationStore, 'getVisibleScreen').mockReturnValueOnce(Screens.GLOBAL_THREADS);

            await appEntry(serverUrl, {teamId, channelId});

            expect(switchToChannelById).not.toHaveBeenCalled();
            expect(WebsocketManager.openAll).toHaveBeenCalledTimes(1);
        });

        it('should not switch when the user opened another channel while the memberships were fetched', async () => {
            jest.mocked(getCurrentChannelId).mockResolvedValue('channel2');

            await appEntry(serverUrl, {teamId, channelId});

            expect(switchToChannelById).not.toHaveBeenCalled();
        });

        it('should open the websocket without fetching or switching when there is no channel to restore', async () => {
            await appEntry(serverUrl);

            expect(fetchMyTeam).not.toHaveBeenCalled();
            expect(switchToChannelById).not.toHaveBeenCalled();
            expect(WebsocketManager.openAll).toHaveBeenCalledTimes(1);
        });
    });
});
