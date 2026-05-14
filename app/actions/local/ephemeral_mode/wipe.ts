// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getFullErrorMessage} from '@utils/errors';
import {deleteFileCache, deleteFileCacheByDir} from '@utils/file';
import {logError, logInfo, logWarning} from '@utils/log';

const RETRY_TIME = 1000;
const MAX_RETRIES = 5;

export const wipeServerDatabaseWithRetry = async (serverUrl: string): Promise<{success: boolean}> => {
    logInfo('wipeServerDatabaseWithRetry: wipe start', serverUrl);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            // eslint-disable-next-line no-await-in-loop
            await DatabaseManager.wipeServerData(serverUrl);
            logInfo('wipeServerDatabaseWithRetry: wipe complete', serverUrl, `attempts=${attempt + 1}`);
            return {success: true};
        } catch (error) {
            logWarning('wipeServerDatabaseWithRetry: wipe attempt failed', serverUrl, `attempt=${attempt + 1}`, getFullErrorMessage(error));
            if (attempt < MAX_RETRIES) {
                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => setTimeout(resolve, RETRY_TIME));
            }
        }
    }

    logError('wipeServerDatabaseWithRetry: wipe exhausted retries', serverUrl);
    return {success: false};
};

export const wipeServerFiles = (serverUrl: string): {success: boolean} => {
    let success = true;
    const operations: Array<() => void> = [
        () => deleteFileCache(serverUrl),
        () => deleteFileCacheByDir('mmPasteInput'),
        () => deleteFileCacheByDir('thumbnails'),
    ];
    for (const op of operations) {
        try {
            op();
        } catch (error) {
            logWarning('wipeServerFiles', getFullErrorMessage(error));
            success = false;
        }
    }
    if (success) {
        logInfo('wipeServerFiles complete', serverUrl);
    }
    return {success};
};
