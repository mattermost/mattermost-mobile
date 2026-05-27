// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import NetworkManager from '@managers/network_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getCurrentChannelId, getCurrentTeamId, getPushVerificationStatus, getTeamHistory} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';

import {applyPersistenceModeChange} from './refresh';

jest.mock('@actions/local/ephemeral_mode/wipe', () => ({
    wipeServerFiles: jest.fn(),
}));
jest.mock('@actions/local/session', () => ({
    cancelSessionNotification: jest.fn(),
}));
jest.mock('@init/credentials', () => ({
    getServerCredentials: jest.fn(),
}));
jest.mock('@managers/network_manager', () => ({
    __esModule: true,
    default: {getClient: jest.fn()},
}));
jest.mock('@managers/websocket_manager', () => ({
    __esModule: true,
    default: {invalidateClient: jest.fn(), createClient: jest.fn()},
}));
jest.mock('@queries/servers/system', () => ({
    getCurrentChannelId: jest.fn(),
    getCurrentTeamId: jest.fn(),
    getPushVerificationStatus: jest.fn(),
    getTeamHistory: jest.fn(),
}));
jest.mock('@queries/servers/user', () => ({
    getCurrentUser: jest.fn(),
}));
jest.mock('@utils/log');

describe('applyPersistenceModeChange', () => {
    const serverUrl = 'https://server.test';
    const fakeUser = {id: 'u1', username: 'user1'};
    let wipeServerDataSpy: jest.SpyInstance;
    let setActiveServerDatabaseSpy: jest.SpyInstance;
    const mockOperator = {
        handleUsers: jest.fn().mockResolvedValue([]),
        handleSystem: jest.fn().mockResolvedValue([]),
    };
    const mockWsClient = {initialize: jest.fn().mockResolvedValue(undefined)};

    beforeEach(() => {
        jest.clearAllMocks();
        wipeServerDataSpy = jest.spyOn(DatabaseManager, 'wipeServerData').mockResolvedValue(undefined);
        setActiveServerDatabaseSpy = jest.spyOn(DatabaseManager, 'setActiveServerDatabase').mockResolvedValue(undefined);
        jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockReturnValue({
            database: {} as never,
            operator: mockOperator as never,
        });
        jest.mocked(getCurrentUser).mockResolvedValue({toAPI: () => fakeUser} as never);
        jest.mocked(getPushVerificationStatus).mockResolvedValue('');
        jest.mocked(getCurrentTeamId).mockResolvedValue('');
        jest.mocked(getCurrentChannelId).mockResolvedValue('');
        jest.mocked(getTeamHistory).mockResolvedValue([]);
        jest.mocked(getServerCredentials).mockResolvedValue({
            serverUrl,
            userId: 'u1',
            token: 'tok',
            preauthSecret: 'preauth',
        });
        jest.mocked(WebsocketManager.createClient).mockResolvedValue(mockWsClient as never);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('wipes the server DB and files, re-seeds user state, and creates a WS client', async () => {
        const result = await applyPersistenceModeChange(serverUrl);

        expect(WebsocketManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
        expect(wipeServerDataSpy).toHaveBeenCalledWith(serverUrl);
        expect(mockOperator.handleUsers).toHaveBeenCalledWith({users: [fakeUser], prepareRecordsOnly: false});
        expect(WebsocketManager.createClient).toHaveBeenCalledWith(serverUrl, 'tok', 'preauth');
        expect(setActiveServerDatabaseSpy).toHaveBeenCalledWith(serverUrl);
        expect(result).toEqual({});
    });

    it('skips WS client creation when there are no stored credentials', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue(null);

        await applyPersistenceModeChange(serverUrl);

        expect(WebsocketManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
        expect(WebsocketManager.createClient).not.toHaveBeenCalled();
    });

    it('returns the error and skips cleanup when the current user cannot be resolved', async () => {
        jest.mocked(getCurrentUser).mockResolvedValue(null as never);
        jest.mocked(NetworkManager.getClient).mockReturnValue({getMe: jest.fn().mockResolvedValue(null)} as never);

        const result = await applyPersistenceModeChange(serverUrl);

        expect(wipeServerDataSpy).not.toHaveBeenCalled();
        expect(setActiveServerDatabaseSpy).not.toHaveBeenCalled();
        expect(result).toEqual({error: 'cannot get current user'});
    });

    it('returns the error and skips active-DB update when the wipe throws', async () => {
        const wipeError = new Error('disk full');
        wipeServerDataSpy.mockRejectedValue(wipeError);

        const result = await applyPersistenceModeChange(serverUrl);

        expect(setActiveServerDatabaseSpy).not.toHaveBeenCalled();
        expect(result).toEqual({error: wipeError});
    });
});
