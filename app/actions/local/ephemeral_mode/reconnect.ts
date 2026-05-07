// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo from '@react-native-community/netinfo';

import {upgradeEntry} from '@actions/remote/entry';
import {Launch} from '@constants';
import DatabaseManager from '@database/manager';
import {getServerCredentials, removePreauthSecret, removeServerCredentials} from '@init/credentials';
import {relaunchApp} from '@init/launch';
import OfflinePersistenceManager from '@managers/offline_persistence_manager';
import {getServerDisplayName} from '@queries/app/servers';
import {resetToHome} from '@screens/navigation';
import {isErrorWithStatusCode} from '@utils/errors';

const HTTP_UNAUTHORIZED = 401;

type Result = {error?: unknown; needsReauth?: boolean};

export const reconnectErasedServer = async (serverUrl: string): Promise<Result> => {
    try {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
            return {error: 'no_connection'};
        }

        const credentials = await getServerCredentials(serverUrl);
        if (!credentials) {
            return {error: 'no_credentials'};
        }

        const {error} = await upgradeEntry(serverUrl);

        if (error) {
            if (isErrorWithStatusCode(error) && error.status_code === HTTP_UNAUTHORIZED) {
                const displayName = (await getServerDisplayName(serverUrl)) || serverUrl;
                await DatabaseManager.updatePersistenceFlag(serverUrl, '');
                await removeServerCredentials(serverUrl);
                await removePreauthSecret(serverUrl);
                relaunchApp({launchType: Launch.AddServer, serverUrl, displayName});
                return {needsReauth: true};
            }
            await DatabaseManager.wipeServerData(serverUrl);
            return {error};
        }

        await DatabaseManager.updatePersistenceFlag(serverUrl, '');
        OfflinePersistenceManager.addServer(serverUrl);
        await resetToHome({launchType: Launch.Normal, serverUrl, coldStart: false});
        return {};
    } catch (error) {
        return {error};
    }
};
