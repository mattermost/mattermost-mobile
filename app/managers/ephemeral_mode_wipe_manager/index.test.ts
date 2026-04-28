// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {wipeServerDatabaseWithRetry} from '@actions/local/ephemeral_mode/wipe';
import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import {getServerDisplayName, getServersWithWipedAt} from '@queries/app/servers';
import {resetToDataErased} from '@screens/navigation';

import EphemeralModeWipeManager from './index';

import type ServersModel from '@typings/database/models/app/servers';

jest.mock('@actions/local/ephemeral_mode/wipe', () => ({
    wipeServerDatabaseWithRetry: jest.fn().mockResolvedValue({success: true}),
}));
jest.mock('@managers/offline_persistence_manager', () => ({
    __esModule: true,
    default: {removeServer: jest.fn(), addServer: jest.fn()},
}));
jest.mock('@managers/security_manager', () => ({
    __esModule: true,
    default: {removeServer: jest.fn()},
}));
jest.mock('@managers/websocket_manager', () => ({
    __esModule: true,
    default: {invalidateClient: jest.fn().mockResolvedValue(undefined)},
}));
jest.mock('@managers/network_manager', () => ({
    __esModule: true,
    default: {invalidateClient: jest.fn()},
}));
jest.mock('@queries/app/servers', () => ({
    getServersWithWipedAt: jest.fn(),
    getServerDisplayName: jest.fn(),
}));
jest.mock('@screens/navigation', () => ({
    resetToDataErased: jest.fn(),
}));
jest.mock('@utils/log');

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

describe('EphemeralModeWipeManager', () => {
    const serverUrl = 'https://server.test';
    const otherUrl = 'https://other.test';
    const displayName = 'My Server';

    let updateWipedAtSpy: jest.SpyInstance;
    let getActiveServerUrlSpy: jest.SpyInstance;

    beforeAll(() => {
        EphemeralModeWipeManager.init();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        updateWipedAtSpy = jest.spyOn(DatabaseManager, 'updateServerWipedAt').mockResolvedValue(undefined);
        getActiveServerUrlSpy = jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(serverUrl);
        jest.mocked(getServerDisplayName).mockResolvedValue(displayName);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('emitting the purge event wipes the affected server', async () => {
        DeviceEventEmitter.emit(Events.EPHEMERAL_MODE_PURGE_DUE, {serverUrl});
        await flushAsync();

        expect(wipeServerDatabaseWithRetry).toHaveBeenCalledWith(serverUrl);
    });

    it('shows DATA_ERASED to the user when the wiped server is active', async () => {
        DeviceEventEmitter.emit(Events.EPHEMERAL_MODE_PURGE_DUE, {serverUrl});
        await flushAsync();

        expect(resetToDataErased).toHaveBeenCalledWith({serverUrl, displayName});
    });

    it('shows DATA_ERASED before any data is destroyed', async () => {
        DeviceEventEmitter.emit(Events.EPHEMERAL_MODE_PURGE_DUE, {serverUrl});
        await flushAsync();

        const setRootOrder = jest.mocked(resetToDataErased).mock.invocationCallOrder[0];
        const wipeOrder = jest.mocked(wipeServerDatabaseWithRetry).mock.invocationCallOrder[0];
        expect(setRootOrder).toBeLessThan(wipeOrder);
    });

    it('does not navigate when the wiped server is not active', async () => {
        getActiveServerUrlSpy.mockResolvedValue(otherUrl);

        DeviceEventEmitter.emit(Events.EPHEMERAL_MODE_PURGE_DUE, {serverUrl});
        await flushAsync();

        expect(resetToDataErased).not.toHaveBeenCalled();
        expect(wipeServerDatabaseWithRetry).toHaveBeenCalledWith(serverUrl);
    });

    it('collapses concurrent fires for the same server into a single wipe', async () => {
        DeviceEventEmitter.emit(Events.EPHEMERAL_MODE_PURGE_DUE, {serverUrl});
        DeviceEventEmitter.emit(Events.EPHEMERAL_MODE_PURGE_DUE, {serverUrl});
        await flushAsync();

        expect(wipeServerDatabaseWithRetry).toHaveBeenCalledTimes(1);
    });

    it('marks wipedAt with a positive timestamp so boot reconcile finds it', async () => {
        DeviceEventEmitter.emit(Events.EPHEMERAL_MODE_PURGE_DUE, {serverUrl});
        await flushAsync();

        expect(updateWipedAtSpy).toHaveBeenCalledTimes(1);
        const [calledUrl, calledValue] = updateWipedAtSpy.mock.calls[0];
        expect(calledUrl).toBe(serverUrl);
        expect(calledValue).toBeGreaterThan(0);
    });

    it('reconcile: re-runs the wipe for every server marked with wipedAt > 0', async () => {
        jest.mocked(getServersWithWipedAt).mockResolvedValue([
            {url: serverUrl, displayName} as ServersModel,
            {url: otherUrl, displayName: 'Other'} as ServersModel,
        ]);
        getActiveServerUrlSpy.mockResolvedValue(undefined);

        await EphemeralModeWipeManager.reconcile();

        expect(wipeServerDatabaseWithRetry).toHaveBeenCalledWith(serverUrl);
        expect(wipeServerDatabaseWithRetry).toHaveBeenCalledWith(otherUrl);
        expect(wipeServerDatabaseWithRetry).toHaveBeenCalledTimes(2);
    });

    it('reconcile: returns showDataErasedFor only for the active server', async () => {
        jest.mocked(getServersWithWipedAt).mockResolvedValue([
            {url: serverUrl, displayName} as ServersModel,
            {url: otherUrl, displayName: 'Other'} as ServersModel,
        ]);
        getActiveServerUrlSpy.mockResolvedValue(serverUrl);

        const result = await EphemeralModeWipeManager.reconcile();

        expect(result).toEqual({showDataErasedFor: {serverUrl, displayName}});
    });
});
