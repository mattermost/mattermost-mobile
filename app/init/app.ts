// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CallsManager} from '@calls/calls_manager';
import DatabaseManager from '@database/manager';
import CallsNative from '@init/calls_native';
import {getAllServerCredentials} from '@init/credentials';
import {launchMark} from '@init/launch_profiler';
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
    launchMark('initialize_start');
    if (!baseAppInitialized) {
        baseAppInitialized = true;
        try {
            await DatabaseManager.initAppDatabase();

            // Keystore entries with no matching active DB row are skipped (accepted vs listing every service).
            const activeUrls = (await queryAllActiveServers()?.fetch() ?? []).map((s) => s.url);
            const credStarted = Date.now();
            serverCredentials = await getAllServerCredentials(activeUrls);
            launchMark('credentials', `${serverCredentials.length} servers ${Date.now() - credStarted}ms`);

            const dbStarted = Date.now();
            await DatabaseManager.initServerDatabases(serverCredentials.map((c) => c.serverUrl));
            launchMark('database', `${serverCredentials.length} servers ${Date.now() - dbStarted}ms`);
            const netStarted = Date.now();
            await NetworkManager.init(serverCredentials);
            launchMark('network', `${Date.now() - netStarted}ms`);

            // EphemeralModeManager init runs before WS init so any pending wipes
            // complete before WebSocket clients start populating server databases.
            await EphemeralModeManager.init(serverCredentials);
            const wsStarted = Date.now();
            await WebsocketManager.init(serverCredentials);
            launchMark('websocket_init', `${Date.now() - wsStarted}ms`);
        } catch (error) {
            baseAppInitialized = false;
            throw error;
        }
    }

    NavigationStore.reset();
    EphemeralStore.setCurrentThreadId('');
    EphemeralStore.setProcessingNotification('');

    await SecurityManager.init();

    await SessionAttributesManager.syncStaticValues();

    GlobalEventHandler.init();
    ManagedApp.init();
    SessionManager.init();
    CallsManager.initialize();
    CallsNative.init();

    PushNotifications.init(serverCredentials.length > 0);
    launchMark('initialize_done');
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
