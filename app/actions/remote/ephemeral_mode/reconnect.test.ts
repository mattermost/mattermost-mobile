// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';
import {router} from 'expo-router';

import {loginEntry} from '@actions/remote/entry';
import {fetchMe} from '@actions/remote/user';
import {Launch} from '@constants';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import {determineRouteFromLaunchProps} from '@init/launch';
import {setCurrentUserId} from '@queries/servers/system';

import {reconnectErasedServer} from './reconnect';

jest.mock('@react-native-community/netinfo', () => ({
    ...jest.requireActual('@react-native-community/netinfo'),
    __esModule: true,
    default: {fetch: jest.fn()},
}));
jest.mock('expo-router', () => ({
    router: {replace: jest.fn()},
}));
jest.mock('@actions/remote/entry', () => ({
    loginEntry: jest.fn(),
}));
jest.mock('@actions/remote/user', () => ({
    fetchMe: jest.fn(),
}));
jest.mock('@init/credentials', () => ({
    getServerCredentials: jest.fn(),
}));
jest.mock('@init/launch', () => ({
    determineRouteFromLaunchProps: jest.fn(),
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

    const fakeUser = {id: 'u1', email: 'u@example.com'};
    const mockOperator = {handleUsers: jest.fn().mockResolvedValue(undefined)};

    beforeEach(() => {
        jest.clearAllMocks();
        updatePersistenceFlagSpy = jest.spyOn(DatabaseManager, 'updatePersistenceFlag').mockResolvedValue(undefined);
        setActiveServerDatabaseSpy = jest.spyOn(DatabaseManager, 'setActiveServerDatabase').mockResolvedValue(undefined);
        wipeServerDataSpy = jest.spyOn(DatabaseManager, 'wipeServerData').mockResolvedValue(undefined);
        jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockReturnValue({
            operator: mockOperator as never,
            database: {} as never,
        });
        jest.mocked(fetchMe).mockResolvedValue({user: fakeUser} as never);
        jest.mocked(NetInfo.fetch).mockResolvedValue({isConnected: true} as NetInfoState);
        jest.mocked(getServerCredentials).mockResolvedValue({serverUrl, userId: 'u1', token: 'tok-abc', preauthSecret: 'preauth'});
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

        expect(fetchMe).not.toHaveBeenCalled();
        expect(updatePersistenceFlagSpy).not.toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
        expect(result).toEqual({error: 'no_connection'});
    });

    it('on missing credentials: returns no_credentials without fetching the user', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue(null);

        const result = await reconnectErasedServer(serverUrl);

        expect(fetchMe).not.toHaveBeenCalled();
        expect(result).toEqual({error: 'no_credentials'});
    });

    it('on success: opens WebSocket via loginEntry and navigates home', async () => {
        const result = await reconnectErasedServer(serverUrl);

        expect(fetchMe).toHaveBeenCalledWith(serverUrl);
        expect(setCurrentUserId).toHaveBeenCalledWith(mockOperator, 'u1');
        expect(loginEntry).toHaveBeenCalledWith({serverUrl});
        expect(setActiveServerDatabaseSpy).toHaveBeenCalledWith(serverUrl);
        expect(updatePersistenceFlagSpy).toHaveBeenCalledWith(serverUrl, '');
        expect(determineRouteFromLaunchProps).toHaveBeenCalledWith({launchType: Launch.Normal, serverUrl, coldStart: true});
        expect(router.replace).toHaveBeenCalledWith({pathname: '/(authenticated)/(home)', params: {launchType: Launch.Normal, serverUrl, coldStart: true}});
        expect(wipeServerDataSpy).not.toHaveBeenCalled();
        expect(result).toEqual({});
    });

    it('on fetchMe failure: returns the error and skips loginEntry, wipe, and navigation', async () => {
        const fetchError = new Error('User fetch failed');
        jest.mocked(fetchMe).mockResolvedValue({error: fetchError} as never);

        const result = await reconnectErasedServer(serverUrl);

        expect(loginEntry).not.toHaveBeenCalled();
        expect(wipeServerDataSpy).not.toHaveBeenCalled();
        expect(updatePersistenceFlagSpy).not.toHaveBeenCalled();
        expect(router.replace).not.toHaveBeenCalled();
        expect(result).toEqual({error: fetchError});
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
