// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {flushOrphanedAuditQueues} from '@actions/remote/ephemeral_mode';
import {CallsManager} from '@calls/calls_manager';
import DatabaseManager from '@database/manager';
import CallsNative from '@init/calls_native';
import {getAllServerCredentials} from '@init/credentials';
import ManagedApp from '@init/managed_app';
import PushNotifications from '@init/push_notifications';
import EphemeralModeManager from '@managers/ephemeral_mode_manager';
import GlobalEventHandler from '@managers/global_event_handler';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import SessionAttributesManager from '@managers/session_attributes_manager';
import SessionManager from '@managers/session_manager';
import WebsocketManager from '@managers/websocket_manager';
import {queryAllActiveServers} from '@queries/app/servers';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';
import {withSpan} from '@utils/sentry_tracing';

// Controls whether the main initialization (database, etc...) is done, either on app launch
// or on the Share Extension, for example.
let baseAppInitialized = false;
let serverCredentials: ServerCredential[] = [];

// Fallback Polyfill for Promise.allSettle
Promise.allSettled = Promise.allSettled || (<T>(promises: Array<Promise<T>>) => Promise.all(
    promises.map((p) => p.
        then((value) => ({
            status: 'fulfilled',
            value,
        })).
        catch((reason) => ({
            status: 'rejected',
            reason,
        })),
    ),
));

export async function initialize() {
    await withSpan('app.initialize', 'app.init', async () => {
        if (!baseAppInitialized) {
            baseAppInitialized = true;
            try {
                await withSpan('app.initialize.app_database', 'app.init', () => DatabaseManager.initAppDatabase());

                // Keystore entries with no matching active DB row are skipped (accepted vs listing every service).
                const activeUrls = (await queryAllActiveServers()?.fetch() ?? []).map((s) => s.url);
                serverCredentials = await getAllServerCredentials(activeUrls);
                const serverUrls = serverCredentials.map((c) => c.serverUrl);

                await withSpan('app.initialize.database', 'app.init', () => DatabaseManager.initServerDatabases(serverUrls), {
                    attributes: {'mm.server_count': serverUrls.length},
                });
                await withSpan('app.initialize.network', 'app.init', () => NetworkManager.init(serverCredentials));

                flushOrphanedAuditQueues(serverCredentials);

                // EphemeralModeManager init runs before WS init so any pending wipes
                // complete before WebSocket clients start populating server databases.
                await withSpan('app.initialize.ephemeral_mode', 'app.init', () => EphemeralModeManager.init(serverCredentials));
                await withSpan('app.initialize.websocket', 'app.init', () => WebsocketManager.init(serverCredentials));
            } catch (error) {
                baseAppInitialized = false;
                throw error;
            }
        }

        NavigationStore.reset();
        EphemeralStore.setCurrentThreadId('');
        EphemeralStore.setProcessingNotification('');

        await withSpan('app.initialize.security', 'app.init', () => SecurityManager.init());

        await SessionAttributesManager.syncStaticValues();

        GlobalEventHandler.init();
        ManagedApp.init();
        SessionManager.init();
        CallsManager.initialize();
        CallsNative.init();

        PushNotifications.init(serverCredentials.length > 0);
    }, {forceTransaction: true});
}

export function cleanup() {
    ManagedApp.cleanup();
    GlobalEventHandler.cleanup();
    SecurityManager.cleanup();
    SessionManager.cleanup();
    CallsManager.cleanup();
    CallsNative.cleanup();
    PushNotifications.cleanup();
    EphemeralModeManager.cleanup();
}
