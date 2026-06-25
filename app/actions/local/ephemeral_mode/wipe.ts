// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getServer} from '@queries/app/servers';
import {resetHasEverStartedSync} from '@store/team_load_store';
import {getFullErrorMessage} from '@utils/errors';
import {deleteFileCache, deleteFileCacheByDir} from '@utils/file';
import {logError, logInfo, logWarning} from '@utils/log';

import type {PersistenceFlag} from '@typings/database/models/app/servers';

const RETRY_TIME = 1000;
const MAX_RETRIES = 5;

export const wipeServerDatabaseWithRetry = async (serverUrl: string): Promise<{success: boolean}> => {
    logInfo('wipeServerDatabaseWithRetry: wipe start', serverUrl);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            // eslint-disable-next-line no-await-in-loop
            await DatabaseManager.wipeServerData(serverUrl);
            logInfo('wipeServerDatabaseWithRetry: wipe complete', serverUrl, `attempts=${attempt + 1}`);
            resetHasEverStartedSync(serverUrl);
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

export const reconcilePersistenceFlag = async (serverUrl: string, config: ClientConfig | undefined): Promise<boolean> => {
    const server = await getServer(serverUrl);
    if (!server) {
        return false;
    }
    const nextFlag: PersistenceFlag = config?.MobileEphemeralModeEnabled === 'true' && config.MobileEphemeralModeAutoCacheCleanupDays === '0' ? 'zero-persistence' : '';
    if (server.persistenceFlag === nextFlag) {
        return false;
    }
    const crossesZeroPersistence = server.persistenceFlag === 'zero-persistence' || nextFlag === 'zero-persistence';
    try {
        await DatabaseManager.updatePersistenceFlag(serverUrl, nextFlag);
        return crossesZeroPersistence;
    } catch (error) {
        // database cannot be updated, log error & return false so it will be retried on next config fetch
        logError('reconcilePersistenceFlag', getFullErrorMessage(error));
        return false;
    }
};

