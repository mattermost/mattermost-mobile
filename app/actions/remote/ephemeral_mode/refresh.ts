// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {wipeServerDatabaseWithRetry, wipeServerFiles} from '@actions/local/ephemeral_mode/wipe';
import {cancelSessionNotification, terminateSession} from '@actions/local/session';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import EphemeralModeManager from '@managers/ephemeral_mode_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getCurrentChannelId, getCurrentTeamId, getPushVerificationStatus, prepareCommonSystemValues} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {logError, logWarning} from '@utils/log';

import {refetchCurrentUser} from '../user';

export const applyPersistenceModeChange = async (serverUrl: string): Promise<{error?: unknown}> => {
    let resumeServerTracking = true;
    try {
        // untrack server during the transition
        EphemeralModeManager.removeServer(serverUrl);

        const credentials = await getServerCredentials(serverUrl);
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
        const {success} = await wipeServerDatabaseWithRetry(serverUrl);
        if (!success) {
            throw new Error('Failed to wipe server database after changing persistence mode');
        }

        wipeServerFiles(serverUrl);

        const {error: refetchError} = await refetchCurrentUser(serverUrl, undefined);
        if (refetchError) {
            throw new Error(`applyPersistenceModeChange: failed to seed current user: ${refetchError}`);
        }

        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const systemModels = await prepareCommonSystemValues(operator, {
            currentPushVerificationStatus: previousPushVerificationStatus,
            currentTeamId: previousCurrentTeamId,
            currentChannelId: previousCurrentChannelId,
        });

        if (systemModels?.length) {
            await operator.batchRecords(systemModels, 'applyPersistenceModeChange');
        }

        if (credentials?.token) {
            await WebsocketManager.createClient(serverUrl, credentials.token, credentials.preauthSecret);
            await WebsocketManager.initializeClient(serverUrl);
        }

        // Touch lastActiveAt so withServerDatabase re-reads the newly-created database instance.
        // Only needed (and safe) for the active server
        const activeServerUrl = await DatabaseManager.getActiveServerUrl();
        if (activeServerUrl === serverUrl) {
            await DatabaseManager.setActiveServerDatabase(serverUrl);
        }

        return {};
    } catch (error) {
        logError('applyPersistenceModeChange', serverUrl, getFullErrorMessage(error));
        const {error: logoutError} = await terminateSession(serverUrl, false);
        if (logoutError) {
            logError('applyPersistenceModeChange: terminateSession failed', serverUrl, logoutError);
        } else {
            // do not resume server tracking in case of session termination
            resumeServerTracking = false;
        }

        return {error};
    } finally {
        if (resumeServerTracking) {
            // restart tracking; file cache was already wiped during the transition
            await EphemeralModeManager.addServer(serverUrl, {cleanFileCache: false});
        }
    }
};
