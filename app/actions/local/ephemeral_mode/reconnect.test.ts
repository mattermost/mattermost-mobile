// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';

import {upgradeEntry} from '@actions/remote/entry';
import {Launch} from '@constants';
import DatabaseManager from '@database/manager';
import {getServerCredentials, removePreauthSecret, removeServerCredentials} from '@init/credentials';
import {relaunchApp} from '@init/launch';
import NetworkManager from '@managers/network_manager';
import OfflinePersistenceManager from '@managers/offline_persistence_manager';
import WebsocketManager from '@managers/websocket_manager';
import {resetToHome} from '@screens/navigation';

import {reconnectErasedServer} from './reconnect';

jest.mock('@react-native-community/netinfo', () => ({
    __esModule: true,
    default: {fetch: jest.fn()},
}));
jest.mock('@actions/remote/entry', () => ({
    upgradeEntry: jest.fn(),
}));
jest.mock('@init/credentials', () => ({
    getServerCredentials: jest.fn(),
    removeServerCredentials: jest.fn(),
    removePreauthSecret: jest.fn(),
}));
jest.mock('@init/launch', () => ({
    relaunchApp: jest.fn(),
}));
jest.mock('@managers/network_manager', () => ({
    __esModule: true,
    default: {createClient: jest.fn()},
}));
jest.mock('@managers/offline_persistence_manager', () => ({
    __esModule: true,
    default: {addServer: jest.fn()},
}));
jest.mock('@managers/websocket_manager', () => ({
    __esModule: true,
    default: {createClient: jest.fn()},
}));
jest.mock('@screens/navigation', () => ({
    resetToHome: jest.fn(),
}));
jest.mock('@utils/log');

describe('reconnectErasedServer', () => {
    const serverUrl = 'https://server.test';
    const displayName = 'My Server';

    let createSpy: jest.SpyInstance;
    let updateWipedAtSpy: jest.SpyInstance;
    let wipeServerDataSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        createSpy = jest.spyOn(DatabaseManager, 'createServerDatabase').mockResolvedValue(undefined);
        updateWipedAtSpy = jest.spyOn(DatabaseManager, 'updateServerWipedAt').mockResolvedValue(undefined);
        wipeServerDataSpy = jest.spyOn(DatabaseManager, 'wipeServerData').mockResolvedValue(undefined);
        jest.mocked(NetInfo.fetch).mockResolvedValue({isConnected: true} as NetInfoState);
        jest.mocked(getServerCredentials).mockResolvedValue({serverUrl: 'https://server.test', userId: 'u1', token: 'tok-abc', preauthSecret: 'preauth'});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('on no device connectivity: returns no_connection without touching the database', async () => {
        jest.mocked(NetInfo.fetch).mockResolvedValue({isConnected: false} as NetInfoState);

        const result = await reconnectErasedServer(serverUrl, displayName);

        expect(createSpy).not.toHaveBeenCalled();
        expect(upgradeEntry).not.toHaveBeenCalled();
        expect(updateWipedAtSpy).not.toHaveBeenCalled();
        expect(resetToHome).not.toHaveBeenCalled();
        expect(result).toEqual({error: 'no_connection'});
    });

    it('on success: re-creates network/ws/db clients, runs upgradeEntry, clears wipedAt, and navigates home', async () => {
        jest.mocked(upgradeEntry).mockResolvedValue({error: undefined, time: 0});

        const result = await reconnectErasedServer(serverUrl, displayName);

        expect(NetworkManager.createClient).toHaveBeenCalledWith(serverUrl, 'tok-abc', 'preauth');
        expect(WebsocketManager.createClient).toHaveBeenCalledWith(serverUrl, 'tok-abc', 'preauth');
        expect(createSpy).toHaveBeenCalledWith({
            config: {dbName: serverUrl, serverUrl, identifier: '', displayName},
        });
        expect(upgradeEntry).toHaveBeenCalledWith(serverUrl);
        expect(updateWipedAtSpy).toHaveBeenCalledWith(serverUrl, 0);
        expect(OfflinePersistenceManager.addServer).toHaveBeenCalledWith(serverUrl);
        expect(resetToHome).toHaveBeenCalledWith(expect.objectContaining({serverUrl}));
        expect(relaunchApp).not.toHaveBeenCalled();
        expect(wipeServerDataSpy).not.toHaveBeenCalled();
        expect(result).toEqual({});
    });

    it('on 401: clears wipedAt and credentials, then relaunches into AddServer', async () => {
        jest.mocked(upgradeEntry).mockResolvedValue({error: {status_code: 401, message: 'Unauthorized'}, time: 0});

        const result = await reconnectErasedServer(serverUrl, displayName);

        expect(updateWipedAtSpy).toHaveBeenCalledWith(serverUrl, 0);
        expect(removeServerCredentials).toHaveBeenCalledWith(serverUrl);
        expect(removePreauthSecret).toHaveBeenCalledWith(serverUrl);
        expect(relaunchApp).toHaveBeenCalledWith({launchType: Launch.AddServer, serverUrl, displayName});
        expect(resetToHome).not.toHaveBeenCalled();
        expect(result).toEqual({needsReauth: true});
    });

    it('on generic error after DB was created: defensively wipes the partial DB and returns the error', async () => {
        const networkError = new Error('Server unreachable');
        jest.mocked(upgradeEntry).mockResolvedValue({error: networkError, time: 0});

        const result = await reconnectErasedServer(serverUrl, displayName);

        expect(createSpy).toHaveBeenCalledTimes(1);
        expect(wipeServerDataSpy).toHaveBeenCalledWith(serverUrl);
        expect(updateWipedAtSpy).not.toHaveBeenCalled();
        expect(removeServerCredentials).not.toHaveBeenCalled();
        expect(removePreauthSecret).not.toHaveBeenCalled();
        expect(resetToHome).not.toHaveBeenCalled();
        expect(relaunchApp).not.toHaveBeenCalled();
        expect(result).toEqual({error: networkError});
    });
});
