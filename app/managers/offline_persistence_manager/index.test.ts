// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, type AppStateStatus} from 'react-native';
import {BehaviorSubject} from 'rxjs';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import OfflinePersistenceManager from './index';

jest.mock('@managers/websocket_manager');
jest.mock('react-native/Libraries/AppState/AppState');
jest.mock('@utils/log');

describe('OfflinePersistenceManager', () => {
    const serverA = 'https://server-a.test';
    const serverB = 'https://server-b.test';
    const credsA = {serverUrl: serverA, token: 'token-a'} as ServerCredential;
    const credsB = {serverUrl: serverB, token: 'token-b'} as ServerCredential;

    let wsStates: Record<string, BehaviorSubject<WebsocketConnectedState>>;
    let appStateHandlers: Array<(state: AppStateStatus) => void>;
    let appStateRemoveSpies: jest.Mock[];

    const seedConfigAndRow = async (
        url: string,
        opts: {enabled?: boolean; timeoutSec?: number; disconnectedSince?: number},
    ) => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(url);
        const configs: Array<{id: string; value: string}> = [];
        if (opts.enabled !== undefined) {
            configs.push({id: 'MobileEphemeralModeEnabled', value: String(opts.enabled)});
        }
        if (opts.timeoutSec !== undefined) {
            configs.push({id: 'MobileEphemeralModeDisconnectionTimeoutSeconds', value: String(opts.timeoutSec)});
        }
        if (configs.length) {
            await operator.handleConfigs({configs, configsToDelete: [], prepareRecordsOnly: false});
        }
        if (opts.disconnectedSince !== undefined) {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.DISCONNECTED_SINCE, value: opts.disconnectedSince}],
                prepareRecordsOnly: false,
            });
        }
    };

    const getPersistedSince = async (url: string): Promise<number | undefined> => {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(url);
        try {
            const rec = await database.get('System').find(SYSTEM_IDENTIFIERS.DISCONNECTED_SINCE);
            return (rec as unknown as {value: number}).value;
        } catch {
            return undefined;
        }
    };

    const setWs = (url: string, state: WebsocketConnectedState) => {
        if (wsStates[url]) {
            wsStates[url].next(state);
        } else {
            wsStates[url] = new BehaviorSubject<WebsocketConnectedState>(state);
        }
    };

    const setAppState = (state: AppStateStatus) => {
        (AppState as {currentState: AppStateStatus}).currentState = state;
        appStateHandlers.forEach((h) => h(state));
    };

    const updateConfig = async (url: string, patch: {enabled?: boolean; timeoutSec?: number}) => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(url);
        const configs: Array<{id: string; value: string}> = [];
        if (patch.enabled !== undefined) {
            configs.push({id: 'MobileEphemeralModeEnabled', value: String(patch.enabled)});
        }
        if (patch.timeoutSec !== undefined) {
            configs.push({id: 'MobileEphemeralModeDisconnectionTimeoutSeconds', value: String(patch.timeoutSec)});
        }
        await operator.handleConfigs({configs, configsToDelete: [], prepareRecordsOnly: false});
    };

    beforeEach(async () => {
        enableFakeTimers();
        wsStates = {};
        appStateHandlers = [];
        appStateRemoveSpies = [];

        await DatabaseManager.init([serverA, serverB]);

        (WebsocketManager.observeWebsocketState as jest.Mock) = jest.fn((url: string) => {
            if (!wsStates[url]) {
                wsStates[url] = new BehaviorSubject<WebsocketConnectedState>('not_connected');
            }
            return wsStates[url].asObservable();
        });
        (WebsocketManager.isConnected as jest.Mock) = jest.fn(
            (url: string) => wsStates[url]?.getValue() === 'connected',
        );

        (AppState as {currentState: AppStateStatus}).currentState = 'active';
        (AppState.addEventListener as jest.Mock).mockImplementation((event: string, handler: (state: AppStateStatus) => void) => {
            if (event === 'change') {
                appStateHandlers.push(handler);
            }
            const removeSpy = jest.fn();
            appStateRemoveSpies.push(removeSpy);
            return {remove: removeSpy};
        });
    });

    afterEach(async () => {
        await OfflinePersistenceManager.init([]);
        await DatabaseManager.destroyServerDatabase(serverA).catch(() => undefined);
        await DatabaseManager.destroyServerDatabase(serverB).catch(() => undefined);
        disableFakeTimers();
        jest.clearAllMocks();
    });

    it('initializing with ephemeral mode disabled skips subscriptions and clears any stale disconnected_since', async () => {
        await seedConfigAndRow(serverA, {enabled: false, timeoutSec: 10, disconnectedSince: Date.now() - 100});

        await OfflinePersistenceManager.init([credsA]);
        await advanceTimers(0);

        expect(WebsocketManager.observeWebsocketState).not.toHaveBeenCalled();
        expect(AppState.addEventListener).not.toHaveBeenCalled();
        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(false);
        expect(await getPersistedSince(serverA)).toBeUndefined();
    });

    it('disconnecting with a zero threshold flags the server offline immediately', async () => {
        await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 0});
        wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

        await OfflinePersistenceManager.init([credsA]);
        await advanceTimers(0);

        setWs(serverA, 'not_connected');
        await advanceTimers(0);

        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(true);
    });

    it('disconnecting again after a brief reconnect restarts the timer from the new disconnect time', async () => {
        await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10});
        wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

        await OfflinePersistenceManager.init([credsA]);
        await advanceTimers(0);

        setWs(serverA, 'not_connected');
        await advanceTimers(0);
        const firstSince = await getPersistedSince(serverA);
        expect(firstSince).toBeGreaterThan(0);

        await advanceTimers(5000);
        setWs(serverA, 'connected');
        await advanceTimers(0);
        expect(await getPersistedSince(serverA)).toBeUndefined();
        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(false);

        setWs(serverA, 'not_connected');
        await advanceTimers(0);
        const secondSince = await getPersistedSince(serverA);
        expect(secondSince).toBeGreaterThan(firstSince!);

        await advanceTimers(9000);
        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(false);
        await advanceTimers(1000);
        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(true);
    });

    it('closing the websocket while backgrounded does not start a timer, and returning to foreground while still disconnected does', async () => {
        await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10});
        wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

        await OfflinePersistenceManager.init([credsA]);
        await advanceTimers(0);

        setAppState('background');
        await advanceTimers(0);

        setWs(serverA, 'not_connected');
        await advanceTimers(60_000);
        expect(await getPersistedSince(serverA)).toBeUndefined();
        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(false);

        setAppState('active');
        await advanceTimers(0);
        expect(await getPersistedSince(serverA)).toBeGreaterThan(0);
    });

    it('resuming after app kill with elapsed time past threshold flags the server offline on init', async () => {
        const now = Date.now();
        await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10, disconnectedSince: now - 20_000});

        await OfflinePersistenceManager.init([credsA]);
        await advanceTimers(0);

        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(true);
    });

    it('resuming after app kill with elapsed time below threshold schedules the remaining time', async () => {
        const now = Date.now();
        await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10, disconnectedSince: now - 5000});

        await OfflinePersistenceManager.init([credsA]);
        await advanceTimers(0);

        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(false);
        await advanceTimers(5000);
        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(true);
    });

    it('initializing while already disconnected waits for a real transition before starting a timer', async () => {
        await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10});
        wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('not_connected');

        await OfflinePersistenceManager.init([credsA]);
        await advanceTimers(0);

        expect(await getPersistedSince(serverA)).toBeUndefined();
        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(false);

        setWs(serverA, 'connected');
        await advanceTimers(0);
        setWs(serverA, 'not_connected');
        await advanceTimers(0);
        expect(await getPersistedSince(serverA)).toBeGreaterThan(0);
    });

    it('enabling ephemeral mode at runtime starts observing, and disabling it afterwards cleans everything up', async () => {
        await seedConfigAndRow(serverA, {enabled: false, timeoutSec: 10});
        wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

        await OfflinePersistenceManager.init([credsA]);
        await advanceTimers(0);
        expect(WebsocketManager.observeWebsocketState).not.toHaveBeenCalled();

        await updateConfig(serverA, {enabled: true});
        await advanceTimers(0);
        expect(WebsocketManager.observeWebsocketState).toHaveBeenCalledWith(serverA);

        setWs(serverA, 'not_connected');
        await advanceTimers(0);
        expect(await getPersistedSince(serverA)).toBeGreaterThan(0);

        await updateConfig(serverA, {enabled: false});
        await advanceTimers(0);

        expect(await getPersistedSince(serverA)).toBeUndefined();
        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(false);

        await advanceTimers(60_000);
        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(false);
    });

    it('changing the threshold while disconnected reschedules the timer against the persisted disconnect time', async () => {
        await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 60});
        wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

        await OfflinePersistenceManager.init([credsA]);
        await advanceTimers(0);

        setWs(serverA, 'not_connected');
        await advanceTimers(0);
        await advanceTimers(30_000);

        await updateConfig(serverA, {timeoutSec: 120});
        await advanceTimers(0);

        // With old threshold would have fired at +30s; new total threshold is 120s
        await advanceTimers(30_000);
        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(false);

        // At a total of 120s elapsed, fires
        await advanceTimers(60_000);
        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(true);
    });

    it('disconnecting multiple servers only runs timers for those with ephemeral mode enabled', async () => {
        await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10});
        await seedConfigAndRow(serverB, {enabled: false, timeoutSec: 10});
        wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');
        wsStates[serverB] = new BehaviorSubject<WebsocketConnectedState>('connected');

        await OfflinePersistenceManager.init([credsA, credsB]);
        await advanceTimers(0);

        setWs(serverA, 'not_connected');
        setWs(serverB, 'not_connected');
        await advanceTimers(0);

        expect(await getPersistedSince(serverA)).toBeGreaterThan(0);
        expect(await getPersistedSince(serverB)).toBeUndefined();

        await advanceTimers(10_000);
        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(true);
        expect(OfflinePersistenceManager.isOffline(serverB)).toBe(false);
    });

    it('installs the AppState listener once when the first server activates and removes it when the last one deactivates', async () => {
        await seedConfigAndRow(serverA, {enabled: false, timeoutSec: 10});
        await seedConfigAndRow(serverB, {enabled: false, timeoutSec: 10});
        wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');
        wsStates[serverB] = new BehaviorSubject<WebsocketConnectedState>('connected');

        await OfflinePersistenceManager.init([credsA, credsB]);
        await advanceTimers(0);
        expect(AppState.addEventListener).not.toHaveBeenCalled();

        await updateConfig(serverA, {enabled: true});
        await advanceTimers(0);
        expect(AppState.addEventListener).toHaveBeenCalledTimes(1);

        await updateConfig(serverB, {enabled: true});
        await advanceTimers(0);
        expect(AppState.addEventListener).toHaveBeenCalledTimes(1);

        await updateConfig(serverA, {enabled: false});
        await advanceTimers(0);
        expect(appStateRemoveSpies[0]).not.toHaveBeenCalled();

        await updateConfig(serverB, {enabled: false});
        await advanceTimers(0);
        expect(appStateRemoveSpies[0]).toHaveBeenCalled();
    });

    it('removing a server tears down its subscriptions and ignores further websocket transitions', async () => {
        await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10});
        wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

        await OfflinePersistenceManager.init([credsA]);
        await advanceTimers(0);

        setWs(serverA, 'not_connected');
        await advanceTimers(0);

        OfflinePersistenceManager.removeServer(serverA);
        await advanceTimers(0);

        setWs(serverA, 'connected');
        setWs(serverA, 'not_connected');
        await advanceTimers(20_000);

        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(false);
    });
});
