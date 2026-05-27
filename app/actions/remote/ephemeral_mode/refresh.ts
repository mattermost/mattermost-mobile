// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {wipeServerFiles} from '@actions/local/ephemeral_mode/wipe';
import {cancelSessionNotification} from '@actions/local/session';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import WebsocketManager from '@managers/websocket_manager';
import {getCurrentChannelId, getCurrentTeamId, getPushVerificationStatus, prepareCommonSystemValues} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {logError, logInfo, logWarning} from '@utils/log';

import {refetchCurrentUser} from '../user';

// refetch so the UI doesn't strand on an empty store.
export const applyPersistenceModeChange = async (serverUrl: string): Promise<{error?: unknown}> => {
    try {
        const credentials = await getServerCredentials(serverUrl);
        logInfo('restartSession: credentials', credentials?.userId);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Snapshot SYSTEM values that the WS reconnect won't restore on its own so the post-wipe
        // UI doesn't show a regressed state (push-proxy red alert, team-select screen flash, etc).
        const previousPushVerificationStatus = await getPushVerificationStatus(database);
        const previousCurrentTeamId = await getCurrentTeamId(database);
        const previousCurrentChannelId = await getCurrentChannelId(database);

        try {
            await cancelSessionNotification(serverUrl);
        } catch {
            logWarning('restartSession: cancelSessionNotification failed (non-critical)');
        }

        await WebsocketManager.invalidateClient(serverUrl);
        await DatabaseManager.wipeServerData(serverUrl);

        logInfo('restartSession: wipedServerData');

        wipeServerFiles(serverUrl);

        await refetchCurrentUser(serverUrl, undefined);

        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const systemModels = await prepareCommonSystemValues(operator, {
            currentPushVerificationStatus: previousPushVerificationStatus,
            currentTeamId: previousCurrentTeamId,
            currentChannelId: previousCurrentChannelId,
        });

        if (systemModels?.length) {
            await operator.batchRecords(systemModels, 'restartSession');
        }

        if (credentials?.token) {
            logInfo('restartSession: creating websocket client');
            const client = await WebsocketManager.createClient(serverUrl, credentials.token, credentials.preauthSecret);
            await client.initialize();
        }

        // Touch lastActiveAt so withServerDatabase's subscribeActiveServers observer fires and
        // re-reads the newly-created database instance from the manager.
        await DatabaseManager.setActiveServerDatabase(serverUrl);
        logInfo('applyPersistenceModeChange: complete', serverUrl);
        return {};
    } catch (error) {
        logError('applyPersistenceModeChange', serverUrl, getFullErrorMessage(error));
        return {error};
    }
};
