// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, type AppStateStatus} from 'react-native';
import {BehaviorSubject} from 'rxjs';

import {wipeServerDatabaseWithRetry} from '@actions/local/ephemeral_mode/wipe';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {getServer, getServerDisplayName} from '@queries/app/servers';
import {resetToDataErased} from '@screens/navigation';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import OfflinePersistenceManager from './index';

import type ServersModel from '@typings/database/models/app/servers';

jest.mock('@actions/local/ephemeral_mode/wipe', () => ({
    wipeServerDatabaseWithRetry: jest.fn().mockResolvedValue({success: true}),
}));
jest.mock('@managers/websocket_manager', () => ({
    __esModule: true,
    default: {
        observeWebsocketState: jest.fn(),
        isConnected: jest.fn(),
    },
}));
jest.mock('@queries/app/servers', () => {
    const actual = jest.requireActual('@queries/app/servers');
    return {
        getServer: jest.fn(actual.getServer),
        getServerDisplayName: jest.fn(),
    };
});
jest.mock('@screens/navigation', () => ({
    resetToDataErased: jest.fn(),
}));
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
        opts: {
            enabled?: boolean;
            timeoutSec?: number;
            purgeHours?: number;
            disconnectedSince?: number;
            offlineSince?: number;
            lastSeenTime?: number;
        },
    ) => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(url);
        const configs: Array<{id: string; value: string}> = [];
        if (opts.enabled !== undefined) {
            configs.push({id: 'MobileEphemeralModeEnabled', value: String(opts.enabled)});
        }
        if (opts.timeoutSec !== undefined) {
            configs.push({id: 'MobileEphemeralModeDisconnectionTimeoutSeconds', value: String(opts.timeoutSec)});
        }

        // Default to a very large purge threshold so disconnection-only tests don't accidentally
        // trip the wipe pipeline (which would tear down the server's offline subject).
        const purgeHours = opts.purgeHours ?? 24 * 365;
        configs.push({id: 'MobileEphemeralModeOfflinePersistenceTimerHours', value: String(purgeHours)});
        if (configs.length) {
            await operator.handleConfigs({configs, configsToDelete: [], prepareRecordsOnly: false});
        }
        const systems: Array<{id: string; value: unknown}> = [];
        if (opts.disconnectedSince !== undefined) {
            systems.push({id: SYSTEM_IDENTIFIERS.DISCONNECTED_SINCE, value: opts.disconnectedSince});
        }
        if (opts.offlineSince !== undefined) {
            systems.push({id: SYSTEM_IDENTIFIERS.OFFLINE_SINCE, value: opts.offlineSince});
        }
        if (opts.lastSeenTime !== undefined) {
            systems.push({id: SYSTEM_IDENTIFIERS.LAST_SEEN_TIME, value: opts.lastSeenTime});
        }
        if (systems.length) {
            await operator.handleSystem({systems, prepareRecordsOnly: false});
        }
    };

    const getPersistedValue = async <T>(url: string, key: string): Promise<T | undefined> => {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(url);
        try {
            const rec = await database.get('System').find(key);
            return (rec as unknown as {value: T}).value;
        } catch {
            return undefined;
        }
    };

    const getPersistedSince = (url: string) => getPersistedValue<number>(url, SYSTEM_IDENTIFIERS.DISCONNECTED_SINCE);
    const getPersistedOfflineSince = (url: string) => getPersistedValue<number>(url, SYSTEM_IDENTIFIERS.OFFLINE_SINCE);
    const getPersistedLastSeen = (url: string) => getPersistedValue<number>(url, SYSTEM_IDENTIFIERS.LAST_SEEN_TIME);

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

    const updateConfig = async (url: string, patch: {enabled?: boolean; timeoutSec?: number; purgeHours?: number}) => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(url);
        const configs: Array<{id: string; value: string}> = [];
        if (patch.enabled !== undefined) {
            configs.push({id: 'MobileEphemeralModeEnabled', value: String(patch.enabled)});
        }
        if (patch.timeoutSec !== undefined) {
            configs.push({id: 'MobileEphemeralModeDisconnectionTimeoutSeconds', value: String(patch.timeoutSec)});
        }
        if (patch.purgeHours !== undefined) {
            configs.push({id: 'MobileEphemeralModeOfflinePersistenceTimerHours', value: String(patch.purgeHours)});
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

    it('removing a server while it is flagged offline does not flip the offline subject', async () => {
        await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10, purgeHours: 1});
        wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

        await OfflinePersistenceManager.init([credsA]);
        await advanceTimers(0);

        const emissions: boolean[] = [];
        const sub = OfflinePersistenceManager.observeOffline(serverA).subscribe((v) => emissions.push(v));

        setWs(serverA, 'not_connected');
        await advanceTimers(0);
        await advanceTimers(10_000);

        expect(OfflinePersistenceManager.isOffline(serverA)).toBe(true);
        expect(emissions).toEqual([false, true]);

        OfflinePersistenceManager.removeServer(serverA);
        await advanceTimers(0);

        expect(emissions).toEqual([false, true]);

        sub.unsubscribe();
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

    describe('purge timer', () => {
        const ONE_HOUR_MS = 3600_000;

        it('flipping the offline flag to true schedules the purge timer without firing', async () => {
            await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10, purgeHours: 1});
            wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

            await OfflinePersistenceManager.init([credsA]);
            await advanceTimers(0);

            setWs(serverA, 'not_connected');
            await advanceTimers(0);
            expect(OfflinePersistenceManager.isOffline(serverA)).toBe(false);

            await advanceTimers(10_000);

            expect(OfflinePersistenceManager.isOffline(serverA)).toBe(true);
            expect(await getPersistedOfflineSince(serverA)).toBeDefined();
            expect(wipeServerDatabaseWithRetry).not.toHaveBeenCalled();
        });

        it('purge timer fires after the configured threshold and triggers the wipe', async () => {
            await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10, purgeHours: 1});
            wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

            await OfflinePersistenceManager.init([credsA]);
            await advanceTimers(0);

            setWs(serverA, 'not_connected');
            await advanceTimers(0);
            await advanceTimers(10_000);

            expect(wipeServerDatabaseWithRetry).not.toHaveBeenCalled();

            await advanceTimers(ONE_HOUR_MS);

            expect(wipeServerDatabaseWithRetry).toHaveBeenCalledTimes(1);
            expect(wipeServerDatabaseWithRetry).toHaveBeenCalledWith(serverA);
        });

        it('firing the purge is synchronous when the threshold is zero', async () => {
            await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10, purgeHours: 0});
            wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

            await OfflinePersistenceManager.init([credsA]);
            await advanceTimers(0);

            setWs(serverA, 'not_connected');
            await advanceTimers(0);
            await advanceTimers(10_000);

            expect(wipeServerDatabaseWithRetry).toHaveBeenCalledTimes(1);
        });

        it('reconnecting before the purge fires cancels the timer and clears persistence', async () => {
            await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10, purgeHours: 1});
            wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

            await OfflinePersistenceManager.init([credsA]);
            await advanceTimers(0);

            setWs(serverA, 'not_connected');
            await advanceTimers(0);
            await advanceTimers(10_000);
            expect(await getPersistedOfflineSince(serverA)).toBeDefined();

            setWs(serverA, 'connected');
            await advanceTimers(0);

            expect(await getPersistedOfflineSince(serverA)).toBeUndefined();
            expect(await getPersistedLastSeen(serverA)).toBeUndefined();

            await advanceTimers(ONE_HOUR_MS);
            expect(wipeServerDatabaseWithRetry).not.toHaveBeenCalled();
        });

        it('backward clock jump while offline preserves the remaining time', async () => {
            const start = 1_700_000_000_000;
            jest.setSystemTime(start);
            await seedConfigAndRow(serverA, {
                enabled: true,
                timeoutSec: 10,
                purgeHours: 24,
                disconnectedSince: start - ONE_HOUR_MS - 10_000,
                offlineSince: start - ONE_HOUR_MS,
                lastSeenTime: start - ONE_HOUR_MS,
            });
            wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('not_connected');

            await OfflinePersistenceManager.init([credsA]);
            await advanceTimers(0);

            const offlineSinceBefore = await getPersistedOfflineSince(serverA);
            expect(offlineSinceBefore).toBe(start - ONE_HOUR_MS);

            const halfHour = 30 * 60 * 1000;
            jest.setSystemTime(start - halfHour);

            setAppState('active');
            await advanceTimers(0);

            const offlineSinceAfter = await getPersistedOfflineSince(serverA);
            expect(offlineSinceAfter).toBe((start - ONE_HOUR_MS) - halfHour);
        });

        it('changing the purge threshold while offline reschedules against offline_since', async () => {
            await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10, purgeHours: 24});
            wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

            await OfflinePersistenceManager.init([credsA]);
            await advanceTimers(0);

            setWs(serverA, 'not_connected');
            await advanceTimers(0);
            await advanceTimers(10_000);
            await advanceTimers(ONE_HOUR_MS);

            await updateConfig(serverA, {purgeHours: 12});
            await advanceTimers(0);

            await advanceTimers((11 * ONE_HOUR_MS) - 1000);
            expect(wipeServerDatabaseWithRetry).not.toHaveBeenCalled();

            await advanceTimers(2000);
            expect(wipeServerDatabaseWithRetry).toHaveBeenCalledTimes(1);
        });

        it('a foreground after the wipe does not re-fire it', async () => {
            await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10, purgeHours: 1});
            wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

            await OfflinePersistenceManager.init([credsA]);
            await advanceTimers(0);

            setWs(serverA, 'not_connected');
            await advanceTimers(0);
            await advanceTimers(10_000);
            await advanceTimers(ONE_HOUR_MS);
            expect(wipeServerDatabaseWithRetry).toHaveBeenCalledTimes(1);

            setAppState('background');
            setAppState('active');
            await advanceTimers(0);

            expect(wipeServerDatabaseWithRetry).toHaveBeenCalledTimes(1);
        });
    });

    describe('purge wipe', () => {
        const ONE_HOUR_MS = 3600_000;
        const otherUrl = 'https://other.test';
        const displayName = 'My Server';

        let updateWipedAtSpy: jest.SpyInstance;
        let getActiveServerUrlSpy: jest.SpyInstance;

        const triggerWipeForServerA = async () => {
            await seedConfigAndRow(serverA, {enabled: true, timeoutSec: 10, purgeHours: 1});
            wsStates[serverA] = new BehaviorSubject<WebsocketConnectedState>('connected');

            await OfflinePersistenceManager.init([credsA]);
            await advanceTimers(0);

            setWs(serverA, 'not_connected');
            await advanceTimers(0);
            await advanceTimers(10_000);
            await advanceTimers(ONE_HOUR_MS);
        };

        beforeEach(() => {
            updateWipedAtSpy = jest.spyOn(DatabaseManager, 'updateServerWipedAt');
            getActiveServerUrlSpy = jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(serverA);
            jest.mocked(getServerDisplayName).mockResolvedValue(displayName);
        });

        it('wipes the affected server when the purge fires', async () => {
            await triggerWipeForServerA();

            expect(wipeServerDatabaseWithRetry).toHaveBeenCalledWith(serverA);
        });

        it('triggers resetToDataErased when the wiped server is active', async () => {
            await triggerWipeForServerA();

            expect(resetToDataErased).toHaveBeenCalledWith({serverUrl: serverA, displayName});
        });

        it('triggers resetToDataErased before any data is destroyed', async () => {
            await triggerWipeForServerA();

            const setRootOrder = jest.mocked(resetToDataErased).mock.invocationCallOrder[0];
            const wipeOrder = jest.mocked(wipeServerDatabaseWithRetry).mock.invocationCallOrder[0];
            expect(setRootOrder).toBeLessThan(wipeOrder);
        });

        it('does not navigate when the wiped server is not active', async () => {
            getActiveServerUrlSpy.mockResolvedValue(otherUrl);

            await triggerWipeForServerA();

            expect(resetToDataErased).not.toHaveBeenCalled();
            expect(wipeServerDatabaseWithRetry).toHaveBeenCalledWith(serverA);
        });

        it('marks wipedAt with a positive timestamp so boot wipe-resumption finds it', async () => {
            await triggerWipeForServerA();

            expect(updateWipedAtSpy).toHaveBeenCalledTimes(1);
            const [calledUrl, calledValue] = updateWipedAtSpy.mock.calls[0];
            expect(calledUrl).toBe(serverA);
            expect(calledValue).toBeGreaterThan(0);
        });

        it('leaves the wiped server with an empty in-memory database so contexts can still mount', async () => {
            jest.mocked(wipeServerDatabaseWithRetry).mockImplementationOnce(async (url: string) => {
                await DatabaseManager.wipeServerData(url);
                return {success: true};
            });

            await triggerWipeForServerA();

            expect(DatabaseManager.serverDatabases[serverA]).toBeDefined();
        });
    });

    describe('init wipe-resumption', () => {
        it('re-runs the wipe for credentials whose server row is marked with wipedAt > 0', async () => {
            jest.mocked(getServer).mockImplementation(async (url: string) => {
                if (url === serverA) {
                    return {url: serverA, wipedAt: 123} as ServersModel;
                }
                return {url, wipedAt: 0} as ServersModel;
            });

            await OfflinePersistenceManager.init([credsA, credsB]);

            expect(wipeServerDatabaseWithRetry).toHaveBeenCalledWith(serverA);
            expect(wipeServerDatabaseWithRetry).toHaveBeenCalledTimes(1);
        });

        it('does not re-wipe servers whose row has wipedAt === 0', async () => {
            jest.mocked(getServer).mockResolvedValue({url: serverA, wipedAt: 0} as ServersModel);

            await OfflinePersistenceManager.init([credsA]);

            expect(wipeServerDatabaseWithRetry).not.toHaveBeenCalled();
        });
    });
});
