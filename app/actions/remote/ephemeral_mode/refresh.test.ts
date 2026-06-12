// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {wipeServerDatabaseWithRetry} from '@actions/local/ephemeral_mode/wipe';
import {terminateSession} from '@actions/local/session';
import {refetchCurrentUser} from '@actions/remote/user';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import EphemeralModeManager from '@managers/ephemeral_mode_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getCurrentChannelId, getCurrentTeamId, getPushVerificationStatus, prepareCommonSystemValues} from '@queries/servers/system';

import {applyPersistenceModeChange} from './refresh';

jest.mock('@actions/local/ephemeral_mode/wipe', () => ({
    wipeServerFiles: jest.fn(),
    wipeServerDatabaseWithRetry: jest.fn(),
}));
jest.mock('@actions/local/session', () => ({
    cancelSessionNotification: jest.fn(),
    terminateSession: jest.fn().mockResolvedValue({}),
}));
jest.mock('@actions/remote/user', () => ({
    refetchCurrentUser: jest.fn(),
}));
jest.mock('@init/credentials', () => ({
    getServerCredentials: jest.fn(),
}));
jest.mock('@managers/ephemeral_mode_manager', () => ({
    __esModule: true,
    default: {removeServer: jest.fn(), addServer: jest.fn()},
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
    let setActiveServerDatabaseSpy: jest.SpyInstance;
    const mockOperator = {batchRecords: jest.fn().mockResolvedValue(undefined)};

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(wipeServerDatabaseWithRetry).mockResolvedValue({success: true});
        setActiveServerDatabaseSpy = jest.spyOn(DatabaseManager, 'setActiveServerDatabase').mockResolvedValue(undefined);
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(serverUrl);
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

    it('should wipe the server DB and files, re-seed user state, and create a WS client', async () => {
        const result = await applyPersistenceModeChange(serverUrl);

        expect(WebsocketManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
        expect(EphemeralModeManager.removeServer).toHaveBeenCalledWith(serverUrl);
        expect(wipeServerDatabaseWithRetry).toHaveBeenCalledWith(serverUrl);
        expect(refetchCurrentUser).toHaveBeenCalledWith(serverUrl, undefined);
        expect(WebsocketManager.createClient).toHaveBeenCalledWith(serverUrl, 'tok', 'preauth');
        expect(WebsocketManager.initializeClient).toHaveBeenCalledWith(serverUrl);
        expect(setActiveServerDatabaseSpy).toHaveBeenCalledWith(serverUrl);
        expect(terminateSession).not.toHaveBeenCalled();
        expect(EphemeralModeManager.addServer).toHaveBeenCalledWith(serverUrl, {cleanFileCache: false});
        expect(result).toEqual({});
    });

    it('should skip WS client creation when there are no stored credentials', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue(null);

        await applyPersistenceModeChange(serverUrl);

        expect(WebsocketManager.createClient).not.toHaveBeenCalled();
        expect(WebsocketManager.initializeClient).not.toHaveBeenCalled();
        expect(terminateSession).not.toHaveBeenCalled();
        expect(EphemeralModeManager.addServer).toHaveBeenCalledWith(serverUrl, {cleanFileCache: false});
    });

    it('should skip setActiveServerDatabase when the server is not active', async () => {
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue('https://other.test');

        await applyPersistenceModeChange(serverUrl);

        expect(setActiveServerDatabaseSpy).not.toHaveBeenCalled();
    });

    it('should terminate the session when the wipe throws', async () => {
        const wipeError = new Error('disk full');
        jest.mocked(wipeServerDatabaseWithRetry).mockRejectedValue(wipeError);

        const result = await applyPersistenceModeChange(serverUrl);

        expect(terminateSession).toHaveBeenCalledWith(serverUrl, false);
        expect(EphemeralModeManager.addServer).not.toHaveBeenCalled();
        expect(result).toEqual({error: wipeError});
    });

    it('should terminate the session when the wipe exhausts all retries', async () => {
        jest.mocked(wipeServerDatabaseWithRetry).mockResolvedValue({success: false});

        const result = await applyPersistenceModeChange(serverUrl);

        expect(terminateSession).toHaveBeenCalledWith(serverUrl, false);
        expect(EphemeralModeManager.addServer).not.toHaveBeenCalled();
        expect(result.error).toBeTruthy();
    });

    it('should terminate the session when restoration fails after a successful wipe', async () => {
        const fetchError = new Error('network error');
        jest.mocked(refetchCurrentUser).mockRejectedValue(fetchError);

        const result = await applyPersistenceModeChange(serverUrl);

        expect(terminateSession).toHaveBeenCalledWith(serverUrl, false);
        expect(EphemeralModeManager.addServer).not.toHaveBeenCalled();
        expect(result).toEqual({error: fetchError});
    });
});
