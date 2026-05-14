// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';
import {deleteFileCache, deleteFileCacheByDir} from '@utils/file';
import {logError, logInfo, logWarning} from '@utils/log';

import {wipeServerDatabaseWithRetry, wipeServerFiles} from './wipe';

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
