// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {upgradeEntry} from '@actions/remote/entry';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import OfflinePersistenceManager from '@managers/offline_persistence_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getServer} from '@queries/app/servers';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';
import {deleteFileCache, deleteFileCacheByDir} from '@utils/file';
import {logError, logInfo, logWarning} from '@utils/log';

import {
    applyPersistenceModeChange,
    derivePersistenceFlag,
    reconcilePersistenceFlag,
    wipeServerDatabaseWithRetry,
    wipeServerFiles,
} from './wipe';

import type ServersModel from '@typings/database/models/app/servers';

jest.mock('@actions/remote/entry', () => ({
    upgradeEntry: jest.fn(),
}));
jest.mock('@init/credentials', () => ({
    getServerCredentials: jest.fn(),
}));
jest.mock('@managers/offline_persistence_manager', () => ({
    __esModule: true,
    default: {addServer: jest.fn(), removeServer: jest.fn()},
}));
jest.mock('@managers/websocket_manager', () => ({
    __esModule: true,
    default: {invalidateClient: jest.fn(), createClient: jest.fn()},
}));
jest.mock('@queries/app/servers', () => ({
    getServer: jest.fn(),
}));
jest.mock('@utils/file', () => ({
    deleteFileCache: jest.fn(),
    deleteFileCacheByDir: jest.fn(),
}));
jest.mock('@utils/log');

describe('wipeServerDatabaseWithRetry', () => {
    const serverUrl = 'https://server.test';

    beforeEach(() => {
        enableFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        disableFakeTimers();
        jest.restoreAllMocks();
    });

    it('succeeds on first attempt', async () => {
        const deleteSpy = jest.spyOn(DatabaseManager, 'wipeServerData').mockResolvedValue();

        const result = await wipeServerDatabaseWithRetry(serverUrl);

        expect(result).toEqual({success: true});
        expect(deleteSpy).toHaveBeenCalledTimes(1);
        expect(deleteSpy).toHaveBeenCalledWith(serverUrl);
        expect(logInfo).toHaveBeenCalledWith('wipeServerDatabaseWithRetry: wipe start', serverUrl);
        expect(logInfo).toHaveBeenCalledWith('wipeServerDatabaseWithRetry: wipe complete', serverUrl, 'attempts=1');
        expect(logWarning).not.toHaveBeenCalled();
        expect(logError).not.toHaveBeenCalled();
    });

    it('gives up after exhausting retries', async () => {
        const deleteSpy = jest.spyOn(DatabaseManager, 'wipeServerData').mockRejectedValue(new Error('fs broken'));

        const wipePromise = wipeServerDatabaseWithRetry(serverUrl);

        // Each retry iteration needs: timer fire → catch rejection → schedule next setTimeout.
        // Pump the loop with a 1000ms advance plus an extra microtask flush per attempt.
        for (let i = 0; i < 6; i++) {
            // eslint-disable-next-line no-await-in-loop
            await advanceTimers(1000);
            // eslint-disable-next-line no-await-in-loop
            await advanceTimers(0);
        }

        const result = await wipePromise;

        expect(result).toEqual({success: false});
        expect(deleteSpy).toHaveBeenCalledTimes(6);
        expect(logWarning).toHaveBeenCalledTimes(6);
        expect(logError).toHaveBeenCalledWith('wipeServerDatabaseWithRetry: wipe exhausted retries', serverUrl);
    });
});

describe('wipeServerFiles', () => {
    const serverUrl = 'https://server.test';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(deleteFileCache).mockReturnValue(true);
        jest.mocked(deleteFileCacheByDir).mockReturnValue(true);
    });

    it('calls all three deletions and returns success when all succeed', () => {
        const result = wipeServerFiles(serverUrl);

        expect(result).toEqual({success: true});
        expect(deleteFileCache).toHaveBeenCalledWith(serverUrl);
        expect(deleteFileCacheByDir).toHaveBeenCalledWith('mmPasteInput');
        expect(deleteFileCacheByDir).toHaveBeenCalledWith('thumbnails');
        expect(logInfo).toHaveBeenCalledWith('wipeServerFiles complete', serverUrl);
        expect(logWarning).not.toHaveBeenCalled();
    });

    it('returns failure and logs a warning when one deletion throws, but the others still run', () => {
        jest.mocked(deleteFileCacheByDir).
            mockReturnValueOnce(true).
            mockImplementationOnce(() => {
                throw new Error('io error');
            });

        const result = wipeServerFiles(serverUrl);

        expect(result).toEqual({success: false});
        expect(deleteFileCache).toHaveBeenCalledWith(serverUrl);
        expect(deleteFileCacheByDir).toHaveBeenCalledWith('mmPasteInput');
        expect(deleteFileCacheByDir).toHaveBeenCalledWith('thumbnails');
        expect(logWarning).toHaveBeenCalledTimes(1);
        expect(logInfo).not.toHaveBeenCalled();
    });
});

describe('applyPersistenceModeChange', () => {
    const serverUrl = 'https://server.test';
    let wipeServerDataSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        wipeServerDataSpy = jest.spyOn(DatabaseManager, 'wipeServerData').mockResolvedValue(undefined);
        jest.mocked(deleteFileCache).mockResolvedValue(true);
        jest.mocked(deleteFileCacheByDir).mockResolvedValue(true);
        jest.mocked(upgradeEntry).mockResolvedValue({error: undefined, time: 0});
        jest.mocked(getServerCredentials).mockResolvedValue({serverUrl, userId: 'u1', token: 'tok', preauthSecret: 'preauth'});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('tears down OPM + WS, recreates the server DB and WS client, refetches state, then re-attaches to OPM', async () => {
        const result = await applyPersistenceModeChange(serverUrl);

        expect(OfflinePersistenceManager.removeServer).toHaveBeenCalledWith(serverUrl);
        expect(WebsocketManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
        expect(wipeServerDataSpy).toHaveBeenCalledWith(serverUrl);
        expect(deleteFileCache).toHaveBeenCalledWith(serverUrl);
        expect(WebsocketManager.createClient).toHaveBeenCalledWith(serverUrl, 'tok', 'preauth');
        expect(upgradeEntry).toHaveBeenCalledWith(serverUrl);
        expect(OfflinePersistenceManager.addServer).toHaveBeenCalledWith(serverUrl);
        expect(result).toEqual({});
    });

    it('skips WS client creation when there are no stored credentials', async () => {
        jest.mocked(getServerCredentials).mockResolvedValue(null);

        await applyPersistenceModeChange(serverUrl);

        expect(WebsocketManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
        expect(WebsocketManager.createClient).not.toHaveBeenCalled();
    });

    it('when upgradeEntry fails: returns the error and does not re-attach to OPM', async () => {
        const networkError = new Error('Server unreachable');
        jest.mocked(upgradeEntry).mockResolvedValue({error: networkError, time: 0});

        const result = await applyPersistenceModeChange(serverUrl);

        expect(wipeServerDataSpy).toHaveBeenCalledWith(serverUrl);
        expect(OfflinePersistenceManager.addServer).not.toHaveBeenCalled();
        expect(result).toEqual({error: networkError});
    });

    it('when wipe throws: returns the error and does not refetch or re-attach', async () => {
        const wipeError = new Error('disk full');
        wipeServerDataSpy.mockRejectedValue(wipeError);

        const result = await applyPersistenceModeChange(serverUrl);

        expect(upgradeEntry).not.toHaveBeenCalled();
        expect(OfflinePersistenceManager.addServer).not.toHaveBeenCalled();
        expect(result).toEqual({error: wipeError});
    });
});

describe('derivePersistenceFlag', () => {
    it('returns zero-persistence only when MEM is enabled AND auto cache cleanup days is exactly 0', () => {
        expect(derivePersistenceFlag({
            MobileEphemeralModeEnabled: 'true',
            MobileEphemeralModeAutoCacheCleanupDays: '0',
        } as ClientConfig)).toBe('zero-persistence');
    });

    it('returns empty when MEM is enabled but cache cleanup days is non-zero', () => {
        expect(derivePersistenceFlag({
            MobileEphemeralModeEnabled: 'true',
            MobileEphemeralModeAutoCacheCleanupDays: '5',
        } as ClientConfig)).toBe('');
    });

    it('returns empty when MEM is disabled regardless of cache cleanup days', () => {
        expect(derivePersistenceFlag({
            MobileEphemeralModeEnabled: 'false',
            MobileEphemeralModeAutoCacheCleanupDays: '0',
        } as ClientConfig)).toBe('');
    });

    it('returns empty when config is undefined', () => {
        expect(derivePersistenceFlag(undefined)).toBe('');
    });
});

describe('reconcilePersistenceFlag', () => {
    const serverUrl = 'https://server.test';
    let updatePersistenceFlagSpy: jest.SpyInstance;
    let wipeServerDataSpy: jest.SpyInstance;

    const setStoredFlag = (persistenceFlag: 'zero-persistence' | '' | 'wiped') => {
        jest.mocked(getServer).mockResolvedValue({persistenceFlag} as ServersModel);
    };

    beforeEach(() => {
        jest.clearAllMocks();
        updatePersistenceFlagSpy = jest.spyOn(DatabaseManager, 'updatePersistenceFlag').mockResolvedValue(undefined);
        wipeServerDataSpy = jest.spyOn(DatabaseManager, 'wipeServerData').mockResolvedValue(undefined);
        jest.mocked(deleteFileCache).mockResolvedValue(true);
        jest.mocked(deleteFileCacheByDir).mockResolvedValue(true);
        jest.mocked(upgradeEntry).mockResolvedValue({error: undefined, time: 0});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('no-op when the server record is missing', async () => {
        jest.mocked(getServer).mockResolvedValue(undefined);

        await reconcilePersistenceFlag(serverUrl, {MobileEphemeralModeEnabled: 'true', MobileEphemeralModeAutoCacheCleanupDays: '0'} as ClientConfig);

        expect(updatePersistenceFlagSpy).not.toHaveBeenCalled();
        expect(wipeServerDataSpy).not.toHaveBeenCalled();
    });

    it('no-op when the derived flag matches the stored flag', async () => {
        setStoredFlag('zero-persistence');

        await reconcilePersistenceFlag(serverUrl, {MobileEphemeralModeEnabled: 'true', MobileEphemeralModeAutoCacheCleanupDays: '0'} as ClientConfig);

        expect(updatePersistenceFlagSpy).not.toHaveBeenCalled();
        expect(wipeServerDataSpy).not.toHaveBeenCalled();
    });

    it('clears the flag and recreates the server DB when cleanup days transitions away from 0', async () => {
        setStoredFlag('zero-persistence');

        await reconcilePersistenceFlag(serverUrl, {MobileEphemeralModeEnabled: 'true', MobileEphemeralModeAutoCacheCleanupDays: '5'} as ClientConfig);

        expect(updatePersistenceFlagSpy).toHaveBeenCalledWith(serverUrl, '');
        expect(wipeServerDataSpy).toHaveBeenCalledWith(serverUrl);
        expect(upgradeEntry).toHaveBeenCalledWith(serverUrl);
        expect(OfflinePersistenceManager.addServer).toHaveBeenCalledWith(serverUrl);
    });

    it('sets the zero-persistence flag and recreates the server DB when MEM is freshly enabled with 0 cleanup days', async () => {
        setStoredFlag('');

        await reconcilePersistenceFlag(serverUrl, {MobileEphemeralModeEnabled: 'true', MobileEphemeralModeAutoCacheCleanupDays: '0'} as ClientConfig);

        expect(updatePersistenceFlagSpy).toHaveBeenCalledWith(serverUrl, 'zero-persistence');
        expect(wipeServerDataSpy).toHaveBeenCalledWith(serverUrl);
    });

    it('clears a wiped flag without triggering a fresh recreate', async () => {
        // The MEM-purge reconnect flow drives the wipe→reload; reconcilePersistenceFlag
        // must not also call applyPersistenceModeChange or it would clobber that work.
        setStoredFlag('wiped');

        await reconcilePersistenceFlag(serverUrl, {MobileEphemeralModeEnabled: 'true', MobileEphemeralModeAutoCacheCleanupDays: '5'} as ClientConfig);

        expect(updatePersistenceFlagSpy).toHaveBeenCalledWith(serverUrl, '');
        expect(wipeServerDataSpy).not.toHaveBeenCalled();
        expect(upgradeEntry).not.toHaveBeenCalled();
        expect(OfflinePersistenceManager.addServer).not.toHaveBeenCalled();
    });
});
