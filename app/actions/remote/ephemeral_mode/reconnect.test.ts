// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';
import {router} from 'expo-router';
import {DeviceEventEmitter} from 'react-native';

import {loginEntry} from '@actions/remote/entry';
import {Events, Launch} from '@constants';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import {determineRouteFromLaunchProps} from '@init/launch';
import NetworkManager from '@managers/network_manager';
import {setCurrentUserId} from '@queries/servers/system';

import {reconnectErasedServer} from './reconnect';

jest.mock('@react-native-community/netinfo', () => ({
    __esModule: true,
    default: {fetch: jest.fn()},
}));
jest.mock('expo-router', () => ({
    router: {replace: jest.fn()},
}));
jest.mock('@actions/remote/entry', () => ({
    loginEntry: jest.fn(),
}));
jest.mock('@init/credentials', () => ({
    getServerCredentials: jest.fn(),
}));
jest.mock('@init/launch', () => ({
    determineRouteFromLaunchProps: jest.fn(),
}));
jest.mock('@managers/network_manager', () => ({
    __esModule: true,
    default: {getClient: jest.fn()},
}));
jest.mock('@queries/servers/system', () => ({
    setCurrentUserId: jest.fn().mockResolvedValue({}),
}));
jest.mock('@utils/log');

describe('reconnectErasedServer', () => {
    const serverUrl = 'https://server.test';

    let updatePersistenceFlagSpy: jest.SpyInstance;
    let setActiveServerDatabaseSpy: jest.SpyInstance;
    let wipeServerDataSpy: jest.SpyInstance;
    let emitSpy: jest.SpyInstance;

    const fakeUser = {id: 'u1', email: 'u@example.com'};
    const mockHandleUsers = jest.fn().mockResolvedValue(undefined);
    const mockGetMe = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        updatePersistenceFlagSpy = jest.spyOn(DatabaseManager, 'updatePersistenceFlag').mockResolvedValue(undefined);
        setActiveServerDatabaseSpy = jest.spyOn(DatabaseManager, 'setActiveServerDatabase').mockResolvedValue(undefined);
        wipeServerDataSpy = jest.spyOn(DatabaseManager, 'wipeServerData').mockResolvedValue(undefined);
        emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
        jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockReturnValue({
            operator: {handleUsers: mockHandleUsers} as any,
            database: {} as any,
        });
        (NetworkManager.getClient as jest.Mock).mockReturnValue({getMe: mockGetMe});
        mockGetMe.mockResolvedValue(fakeUser);
        jest.mocked(NetInfo.fetch).mockResolvedValue({isConnected: true} as NetInfoState);
        jest.mocked(getServerCredentials).mockResolvedValue({serverUrl: 'https://server.test', userId: 'u1', token: 'tok-abc', preauthSecret: 'preauth'});
        jest.mocked(loginEntry).mockResolvedValue({});
        jest.mocked(determineRouteFromLaunchProps).mockResolvedValue({
            route: '/(authenticated)/(home)',
            params: {launchType: Launch.Normal, serverUrl, coldStart: true},
        } as Awaited<ReturnType<typeof determineRouteFromLaunchProps>>);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('on no device connectivity: returns no_connection without touching the database', async () => {
        jest.mocked(NetInfo.fetch).mockResolvedValue({isConnected: false} as NetInfoState);

        const result = await reconnectErasedServer(serverUrl);

        expect(mockGetMe).not.toHaveBeenCalled();
        expect(updatePersistenceFlagSpy).not.toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
        expect(result).toEqual({error: 'no_connection'});
    });

    it('on success: persists current user, opens WebSocket via loginEntry, and navigates home', async () => {
        const result = await reconnectErasedServer(serverUrl);

        expect(mockGetMe).toHaveBeenCalled();
        expect(mockHandleUsers).toHaveBeenCalledWith({users: [fakeUser], prepareRecordsOnly: false});
        expect(setCurrentUserId).toHaveBeenCalledWith(expect.objectContaining({handleUsers: mockHandleUsers}), 'u1');
        expect(loginEntry).toHaveBeenCalledWith({serverUrl});
        expect(setActiveServerDatabaseSpy).toHaveBeenCalledWith(serverUrl);
        expect(updatePersistenceFlagSpy).toHaveBeenCalledWith(serverUrl, '');
        expect(determineRouteFromLaunchProps).toHaveBeenCalledWith({launchType: Launch.Normal, serverUrl, coldStart: true});
        expect(router.replace).toHaveBeenCalledWith({pathname: '/(authenticated)/(home)', params: {launchType: Launch.Normal, serverUrl, coldStart: 'true'}});
        expect(wipeServerDataSpy).not.toHaveBeenCalled();
        expect(result).toEqual({});
    });

    it('on 401 from getMe: emits SERVER_LOGOUT to delegate teardown to SessionManager', async () => {
        mockGetMe.mockRejectedValue({status_code: 401, message: 'Unauthorized'});

        const result = await reconnectErasedServer(serverUrl);

        expect(emitSpy).toHaveBeenCalledWith(Events.SERVER_LOGOUT, {serverUrl, removeServer: false});
        expect(loginEntry).not.toHaveBeenCalled();
        expect(wipeServerDataSpy).not.toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
        expect(result).toEqual({});
    });

    it('on generic error from getMe: re-wipes the partial DB and returns the error', async () => {
        const networkError = new Error('Server unreachable');
        mockGetMe.mockRejectedValue(networkError);

        const result = await reconnectErasedServer(serverUrl);

        expect(wipeServerDataSpy).toHaveBeenCalledWith(serverUrl);
        expect(loginEntry).not.toHaveBeenCalled();
        expect(updatePersistenceFlagSpy).not.toHaveBeenCalled();
        expect(emitSpy).not.toHaveBeenCalledWith(Events.SERVER_LOGOUT, expect.anything());
        expect(router.replace).not.toHaveBeenCalled();
        expect(result).toEqual({error: networkError});
    });

    it('on error from loginEntry: re-wipes the partial DB and returns the error', async () => {
        const wsError = new Error('WebSocket failed');
        jest.mocked(loginEntry).mockResolvedValue({error: wsError});

        const result = await reconnectErasedServer(serverUrl);

        expect(wipeServerDataSpy).toHaveBeenCalledWith(serverUrl);
        expect(updatePersistenceFlagSpy).not.toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
        expect(result).toEqual({error: wsError});
    });
});
