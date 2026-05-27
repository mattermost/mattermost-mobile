// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getServer} from '@queries/app/servers';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';
import {deleteFileCache, deleteFileCacheByDir} from '@utils/file';
import {logError, logInfo, logWarning} from '@utils/log';

import {
    reconcilePersistenceFlag,
    wipeServerDatabaseWithRetry,
    wipeServerFiles,
} from './wipe';

import type ServersModel from '@typings/database/models/app/servers';

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

describe('reconcilePersistenceFlag', () => {
    const serverUrl = 'https://server.test';
    let updatePersistenceFlagSpy: jest.SpyInstance;

    const setStoredFlag = (persistenceFlag: 'zero-persistence' | '' | 'wiped') => {
        jest.mocked(getServer).mockResolvedValue({persistenceFlag} as ServersModel);
    };

    beforeEach(() => {
        jest.clearAllMocks();
        updatePersistenceFlagSpy = jest.spyOn(DatabaseManager, 'updatePersistenceFlag').mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns false and skips update when the server record is missing', async () => {
        jest.mocked(getServer).mockResolvedValue(undefined);

        const result = await reconcilePersistenceFlag(serverUrl, {} as ClientConfig);

        expect(result).toBe(false);
        expect(updatePersistenceFlagSpy).not.toHaveBeenCalled();
    });

    it('returns false and skips update when the derived flag matches the stored flag', async () => {
        setStoredFlag('zero-persistence');

        const result = await reconcilePersistenceFlag(serverUrl, {
            MobileEphemeralModeEnabled: 'true',
            MobileEphemeralModeAutoCacheCleanupDays: '0',
        } as ClientConfig);

        expect(result).toBe(false);
        expect(updatePersistenceFlagSpy).not.toHaveBeenCalled();
    });

    it('updates the flag to zero-persistence and returns true when MEM is enabled with 0 cleanup days', async () => {
        setStoredFlag('');

        const result = await reconcilePersistenceFlag(serverUrl, {
            MobileEphemeralModeEnabled: 'true',
            MobileEphemeralModeAutoCacheCleanupDays: '0',
        } as ClientConfig);

        expect(result).toBe(true);
        expect(updatePersistenceFlagSpy).toHaveBeenCalledWith(serverUrl, 'zero-persistence');
    });

    it('clears the zero-persistence flag and returns true when transitioning away from 0 cleanup days', async () => {
        setStoredFlag('zero-persistence');

        const result = await reconcilePersistenceFlag(serverUrl, {
            MobileEphemeralModeEnabled: 'true',
            MobileEphemeralModeAutoCacheCleanupDays: '5',
        } as ClientConfig);

        expect(result).toBe(true);
        expect(updatePersistenceFlagSpy).toHaveBeenCalledWith(serverUrl, '');
    });

    it('clears a wiped flag and returns false without crossing zero-persistence', async () => {
        setStoredFlag('wiped');

        const result = await reconcilePersistenceFlag(serverUrl, {
            MobileEphemeralModeEnabled: 'true',
            MobileEphemeralModeAutoCacheCleanupDays: '5',
        } as ClientConfig);

        expect(result).toBe(false);
        expect(updatePersistenceFlagSpy).toHaveBeenCalledWith(serverUrl, '');
    });
});
