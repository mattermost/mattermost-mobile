// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {wipeServerDatabaseWithRetry} from '@actions/local/ephemeral_mode/wipe';
import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import OfflinePersistenceManager from '@managers/offline_persistence_manager';
import SecurityManager from '@managers/security_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getServerDisplayName, getServersWithWipedAt} from '@queries/app/servers';
import {resetToDataErased} from '@screens/navigation';
import {logError} from '@utils/log';

export type ReconcileResult = {
    showDataErasedFor?: {serverUrl: string; displayName: string};
};

class EphemeralModeWipeManagerSingleton {
    private inProgress = new Set<string>();
    private listenerAttached = false;

    public init = () => {
        if (this.listenerAttached) {
            return;
        }
        DeviceEventEmitter.addListener(Events.EPHEMERAL_MODE_PURGE_DUE, this.onPurgeDue);
        this.listenerAttached = true;
    };

    public reconcile = async (): Promise<ReconcileResult> => {
        const wipedServers = await getServersWithWipedAt();
        if (wipedServers.length === 0) {
            return {};
        }

        await Promise.all(wipedServers.map((row) => wipeServerDatabaseWithRetry(row.url)));

        const activeUrl = await DatabaseManager.getActiveServerUrl();
        const activeRow = wipedServers.find((row) => row.url === activeUrl);
        if (activeRow) {
            return {
                showDataErasedFor: {
                    serverUrl: activeRow.url,
                    displayName: activeRow.displayName || activeRow.url,
                },
            };
        }
        return {};
    };

    private onPurgeDue = async ({serverUrl}: {serverUrl: string}) => {
        if (this.inProgress.has(serverUrl)) {
            return;
        }
        this.inProgress.add(serverUrl);

        try {
            const activeUrl = await DatabaseManager.getActiveServerUrl();
            const displayName = (await getServerDisplayName(serverUrl)) || serverUrl;

            if (serverUrl === activeUrl) {
                await resetToDataErased({serverUrl, displayName});
            }

            await DatabaseManager.updateServerWipedAt(serverUrl, Date.now());

            OfflinePersistenceManager.removeServer(serverUrl);
            SecurityManager.removeServer(serverUrl);
            await WebsocketManager.invalidateClient(serverUrl);
            NetworkManager.invalidateClient(serverUrl);

            await wipeServerDatabaseWithRetry(serverUrl);
        } catch (error) {
            logError('EphemeralModeWipeManager.onPurgeDue', error);
        } finally {
            this.inProgress.delete(serverUrl);
        }
    };
}

const EphemeralModeWipeManager = new EphemeralModeWipeManagerSingleton();
export default EphemeralModeWipeManager;
