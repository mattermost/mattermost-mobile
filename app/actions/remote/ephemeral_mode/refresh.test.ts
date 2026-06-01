// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {refetchCurrentUser} from '@actions/remote/user';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import WebsocketManager from '@managers/websocket_manager';
import {getCurrentChannelId, getCurrentTeamId, getPushVerificationStatus, prepareCommonSystemValues} from '@queries/servers/system';

import {applyPersistenceModeChange} from './refresh';

jest.mock('@actions/local/ephemeral_mode/wipe', () => ({
    wipeServerFiles: jest.fn(),
}));
jest.mock('@actions/local/session', () => ({
    cancelSessionNotification: jest.fn(),
}));
jest.mock('@actions/remote/user', () => ({
    refetchCurrentUser: jest.fn(),
}));
jest.mock('@init/credentials', () => ({
    getServerCredentials: jest.fn(),
}));
jest.mock('@managers/websocket_manager', () => ({
    __esModule: true,
    default: {invalidateClient: jest.fn(), createClient: jest.fn(), initializeClient: jest.fn()},
}));
jest.mock('@queries/servers/system', () => ({
    getCurrentChannelId: jest.fn(),
    getCurrentTeamId: jest.fn(),
    getPushVerificationStatus: jest.fn(),
    prepareCommonSystemValues: jest.fn(),
}));
jest.mock('@utils/log');

describe('applyPersistenceModeChange', () => {
    const serverUrl = 'https://server.test';
    let wipeServerDataSpy: jest.SpyInstance;
    let setActiveServerDatabaseSpy: jest.SpyInstance;
    const mockOperator = {
        batchRecords: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        wipeServerDataSpy = jest.spyOn(DatabaseManager, 'wipeServerData').mockResolvedValue(undefined);
        setActiveServerDatabaseSpy = jest.spyOn(DatabaseManager, 'setActiveServerDatabase').mockResolvedValue(undefined);
        jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockReturnValue({
            database: {} as never,
            operator: mockOperator as never,
        });
        jest.mocked(refetchCurrentUser).mockResolvedValue(undefined);
        jest.mocked(getPushVerificationStatus).mockResolvedValue('');
        jest.mocked(getCurrentTeamId).mockResolvedValue('');
        jest.mocked(getCurrentChannelId).mockResolvedValue('');
        jest.mocked(prepareCommonSystemValues).mockResolvedValue([]);
        jest.mocked(getServerCredentials).mockResolvedValue({
            serverUrl,
            userId: 'u1',
            token: 'tok',
            preauthSecret: 'preauth',
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('wipes the server DB and files, re-seeds user state, and creates a WS client', async () => {
        const result = await applyPersistenceModeChange(serverUrl);

        expect(WebsocketManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
        expect(wipeServerDataSpy).toHaveBeenCalledWith(serverUrl);
        expect(refetchCurrentUser).toHaveBeenCalledWith(serverUrl, undefined);
        expect(WebsocketManager.createClient).toHaveBeenCalledWith(serverUrl, 'tok', 'preauth');
        expect(WebsocketManager.initializeClient).toHaveBeenCalledWith(serverUrl);
        expect(setActiveServerDatabaseSpy).toHaveBeenCalledWith(serverUrl);
        expect(result).toEqual({});
    });

    it('skips WS client creation when there are no stored credentials', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue(null);

        await applyPersistenceModeChange(serverUrl);

        expect(WebsocketManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
        expect(WebsocketManager.createClient).not.toHaveBeenCalled();
        expect(WebsocketManager.initializeClient).not.toHaveBeenCalled();
    });

    it('returns the error and skips active-DB update when the wipe throws', async () => {
        const wipeError = new Error('disk full');
        wipeServerDataSpy.mockRejectedValue(wipeError);

        const result = await applyPersistenceModeChange(serverUrl);

        expect(setActiveServerDatabaseSpy).not.toHaveBeenCalled();
        expect(result).toEqual({error: wipeError});
    });
});
