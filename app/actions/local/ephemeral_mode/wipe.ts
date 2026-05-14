// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {upgradeEntry} from '@actions/remote/entry';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import OfflinePersistenceManager from '@managers/offline_persistence_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getServer} from '@queries/app/servers';
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

export const derivePersistenceFlag = (config: ClientConfig | undefined): PersistenceFlag => {
    if (!config) {
        return '';
    }
    return config.MobileEphemeralModeEnabled === 'true' && config.MobileEphemeralModeAutoCacheCleanupDays === '0' ? 'zero-persistence' : '';
};

export const reconcilePersistenceFlag = async (serverUrl: string, config: ClientConfig | undefined): Promise<void> => {
    const server = await getServer(serverUrl);
    if (!server) {
        return;
    }
    const nextFlag = derivePersistenceFlag(config);
    if (server.persistenceFlag === nextFlag) {
        return;
    }
    const crossesZeroPersistence = server.persistenceFlag === 'zero-persistence' || nextFlag === 'zero-persistence';
    await DatabaseManager.updatePersistenceFlag(serverUrl, nextFlag);
    if (crossesZeroPersistence) {
        await applyPersistenceModeChange(serverUrl);
    }
};

// Recreate the server DB under the adapter dictated by the new flag, then
// refetch so the UI doesn't strand on an empty store.
export const applyPersistenceModeChange = async (serverUrl: string): Promise<{error?: unknown}> => {
    try {
        logInfo('applyPersistenceModeChange: start', serverUrl);

        OfflinePersistenceManager.removeServer(serverUrl);
        const credentials = await getServerCredentials(serverUrl);

        // Without this the recreate path keeps firstConnectionSynced and skips handleFirstConnect.
        await WebsocketManager.invalidateClient(serverUrl);

        await DatabaseManager.wipeServerData(serverUrl);
        await wipeServerFiles(serverUrl);

        if (credentials?.token) {
            await WebsocketManager.createClient(serverUrl, credentials.token, credentials.preauthSecret);
        }

        const {error} = await upgradeEntry(serverUrl);
        if (error) {
            logError('applyPersistenceModeChange: upgradeEntry failed', serverUrl, getFullErrorMessage(error));
            return {error};
        }

        await OfflinePersistenceManager.addServer(serverUrl);

        logInfo('applyPersistenceModeChange: complete', serverUrl);
        return {};
    } catch (error) {
        logError('applyPersistenceModeChange', serverUrl, getFullErrorMessage(error));
        return {error};
    }
};
