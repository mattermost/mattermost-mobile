// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, type AppStateStatus, type NativeEventSubscription} from 'react-native';
import {BehaviorSubject, combineLatest, type Subscription} from 'rxjs';
import {distinctUntilChanged, skip} from 'rxjs/operators';

import {wipeServerDatabaseWithRetry, wipeServerFiles} from '@actions/local/ephemeral_mode/wipe';
import {clearEphemeralModeState, setDisconnectedSince, setLastSeenTime, setOfflineSince} from '@actions/local/systems';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import PushNotifications from '@init/push_notifications';
import WebsocketManager from '@managers/websocket_manager';
import {getServer, getServerDisplayName} from '@queries/app/servers';
import {getDisconnectedSince, getLastSeenTime, getOfflineSince, observeConfigValue} from '@queries/servers/system';
import {navigateToScreen} from '@screens/navigation';
import {deleteFileCache} from '@utils/file';
import {logError} from '@utils/log';

type ServerEntry =
    | {kind: 'zpm'}
    | {kind: 'mem'; thresholdMs: number; purgeThresholdMs: number};

class EphemeralModeManagerSingleton {
    private offlineSubjects: {[serverUrl: string]: BehaviorSubject<boolean>} = {};
    private disconnectionTimers: Record<string, NodeJS.Timeout> = {};
    private purgeTimers: Record<string, NodeJS.Timeout> = {};
    private wsSubscriptions: Record<string, Subscription> = {};
    private configSubscriptions: Record<string, Subscription> = {};
    private appStateSubscription?: NativeEventSubscription;

    private trackedServers = new Map<string, ServerEntry>();
    private wipeInProgress = new Set<string>();
    private evalQueue: Record<string, Promise<unknown>> = {};

    // Serialise evaluations per server so concurrent emissions (config, WS state,
    // AppState) cannot interleave their read-modify-write of persisted timer state.
    private enqueueEval = (serverUrl: string, fn: () => Promise<void>): Promise<void> => {
        const previous = this.evalQueue[serverUrl] ?? Promise.resolve();
        const next = previous.then(fn).catch((error) => {
            logError('EphemeralModeManager.enqueueEval', error);
        });
        this.evalQueue[serverUrl] = next;
        return next;
    };

    public init = async (serverCredentials: ServerCredential[]) => {
        const tracked = new Set<string>([...Object.keys(this.configSubscriptions), ...this.trackedServers.keys()]);
        for (const url of tracked) {
            this.removeServer(url);
        }

        await Promise.all(serverCredentials.map(async ({serverUrl}) => {
            try {
                const server = await getServer(serverUrl);
                if (server && server.persistenceFlag === 'wiped') {
                    // Recover from a wipe interrupted by app termination before
                    // the DB + file artifacts were both deleted.
                    await this.wipeServerArtifacts(serverUrl);
                }
                await this.addServer(serverUrl);
            } catch (error) {
                logError('EphemeralModeManager.init', error);
            }
        }));
    };

    public cleanup = () => {
        for (const url of Object.keys(this.configSubscriptions)) {
            this.removeServer(url);
        }
        this.wipeInProgress.clear();
    };

    public removeServer = (serverUrl: string) => {
        this.pauseSubscriptions(serverUrl);
        delete this.evalQueue[serverUrl];
    };

    // Tears down everything removeServer does except evalQueue, so callers that
    // hold the eval lock (runWipe) can pause subs without orphaning the in-flight
    // promise that serializes work for this server.
    private pauseSubscriptions = (serverUrl: string) => {
        if (this.trackedServers.get(serverUrl)?.kind === 'mem') {
            this.untrack(serverUrl, {silent: true});
        }
        this.trackedServers.delete(serverUrl);
        this.configSubscriptions[serverUrl]?.unsubscribe();
        delete this.configSubscriptions[serverUrl];
        delete this.offlineSubjects[serverUrl];
        this.maybeRemoveAppStateListener();
    };

    public isOffline = (serverUrl: string): boolean => {
        return this.offlineSubjects[serverUrl]?.getValue() ?? false;
    };

    public isZeroPersistenceMode = (serverUrl: string): boolean => {
        return this.trackedServers.get(serverUrl)?.kind === 'zpm';
    };

    private addServer = async (serverUrl: string) => {
        if (this.configSubscriptions[serverUrl]) {
            return;
        }

        const server = await getServer(serverUrl);
        if (server?.persistenceFlag === 'zero-persistence') {
            await deleteFileCache(serverUrl);
            this.trackedServers.set(serverUrl, {kind: 'zpm'});
            this.ensureAppStateListener();
            return;
        }

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        this.configSubscriptions[serverUrl] = combineLatest([
            observeConfigValue(database, 'MobileEphemeralModeEnabled'),
            observeConfigValue(database, 'MobileEphemeralModeDisconnectionTimeoutSeconds'),
            observeConfigValue(database, 'MobileEphemeralModeOfflinePersistenceTimerHours'),
        ]).pipe(
            distinctUntilChanged(
                ([prevEnabled, prevTimeout, prevPurgeHours], [nextEnabled, nextTimeout, nextPurgeHours]) =>
                    prevEnabled === nextEnabled && prevTimeout === nextTimeout && prevPurgeHours === nextPurgeHours,
            ),
        ).subscribe(([enabledStr, timeoutStr, purgeHoursStr]) => {
            this.onEphemeralModeConfigChange(serverUrl, enabledStr, timeoutStr, purgeHoursStr);
        });
    };

    private onEphemeralModeConfigChange = async (
        serverUrl: string,
        enabledStr: string | undefined,
        timeoutStr: string | undefined,
        purgeHoursStr: string | undefined,
    ) => {
        const nextEnabled = enabledStr === 'true';
        const nextThresholdMs = Math.max(0, Number(timeoutStr ?? '0')) * 1000;
        const nextPurgeThresholdMs = Math.max(0, Number(purgeHoursStr ?? '0')) * 3600 * 1000;
        const wasActive = this.trackedServers.get(serverUrl)?.kind === 'mem';

        if (nextEnabled && !wasActive) {
            this.track(serverUrl, nextThresholdMs, nextPurgeThresholdMs);
            return;
        }
        if (!nextEnabled && wasActive) {
            this.untrack(serverUrl);
            return;
        }
        if (nextEnabled && wasActive) {
            this.trackedServers.set(serverUrl, {kind: 'mem', thresholdMs: nextThresholdMs, purgeThresholdMs: nextPurgeThresholdMs});
            this.enqueueEval(serverUrl, async () => {
                await this.evaluateServer(serverUrl);
                if (this.isOffline(serverUrl)) {
                    await this.evaluatePurge(serverUrl);
                }
            });
            return;
        }

        // Disabled + inactive: clear any stale row left over from a prior enabled session.
        await setDisconnectedSince(serverUrl, null);
    };

    private track = (serverUrl: string, thresholdMs: number, purgeThresholdMs: number) => {
        this.trackedServers.set(serverUrl, {kind: 'mem', thresholdMs, purgeThresholdMs});
        this.ensureAppStateListener();

        // skip(1) drops the BehaviorSubject's replay of the current WS state so it
        // isn't mistaken for a fresh transition; persisted state drives the resume.
        this.wsSubscriptions[serverUrl] = WebsocketManager.observeWebsocketState(serverUrl).pipe(
            skip(1),
        ).subscribe(() => {
            this.enqueueEval(serverUrl, () => this.evaluateServer(serverUrl));
        });

        this.enqueueEval(serverUrl, () => this.evaluateServer(serverUrl, true));
    };

    private untrack = async (serverUrl: string, {silent = false}: {silent?: boolean} = {}) => {
        this.trackedServers.delete(serverUrl);
        this.wsSubscriptions[serverUrl]?.unsubscribe();
        delete this.wsSubscriptions[serverUrl];
        this.clearDisconnectionTimer(serverUrl);
        this.clearPurgeTimer(serverUrl);
        if (!silent) {
            // Server is still alive (feature disabled at runtime); flush offline state.
            await this.flagOffline(serverUrl, false);
            await setDisconnectedSince(serverUrl, null);
        }
        this.maybeRemoveAppStateListener();
    };

    private onAppStateChange = (appState: AppStateStatus) => {
        if (appState === 'background') {
            for (const [url, entry] of this.trackedServers) {
                if (entry.kind === 'zpm') {
                    const success = deleteFileCache(url);
                    if (!success) {
                        logError('EphemeralModeManager.deleteFileCache failed');
                    }
                }
            }
            return;
        }

        if (appState !== 'active') {
            return;
        }

        for (const [url, entry] of this.trackedServers) {
            if (entry.kind !== 'mem') {
                continue;
            }
            this.enqueueEval(url, async () => {
                await this.evaluateServer(url);
                if (this.isOffline(url)) {
                    await this.evaluatePurge(url);
                }
            });
        }
    };

    private ensureAppStateListener = () => {
        if (!this.appStateSubscription) {
            this.appStateSubscription = AppState.addEventListener('change', this.onAppStateChange);
        }
    };

    private maybeRemoveAppStateListener = () => {
        if (this.trackedServers.size === 0 && this.appStateSubscription) {
            this.appStateSubscription.remove();
            this.appStateSubscription = undefined;
        }
    };

    private evaluateServer = async (serverUrl: string, isResume = false) => {
        const entry = this.trackedServers.get(serverUrl);
        if (entry?.kind !== 'mem') {
            return;
        }

        if (WebsocketManager.isConnected(serverUrl)) {
            this.clearDisconnectionTimer(serverUrl);
            await this.flagOffline(serverUrl, false);
            await setDisconnectedSince(serverUrl, null);
            return;
        }

        let database;
        try {
            database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
        } catch (error) {
            logError('EphemeralModeManager.evaluateServer', error);
            return;
        }

        const currentDisconnectedSince = await getDisconnectedSince(database);

        if (currentDisconnectedSince === undefined) {
            // Fresh timers only start on foreground transitions, not on init-resume or while backgrounded.
            if (isResume || AppState.currentState !== 'active') {
                return;
            }
            const now = Date.now();
            await setDisconnectedSince(serverUrl, now);
            this.startDisconnectionTimer(serverUrl, entry.thresholdMs);
            return;
        }

        const elapsed = Date.now() - currentDisconnectedSince;
        const threshold = entry.thresholdMs;
        if (elapsed >= threshold) {
            this.clearDisconnectionTimer(serverUrl);
            await this.flagOffline(serverUrl, true);
            return;
        }
        await this.flagOffline(serverUrl, false);
        this.startDisconnectionTimer(serverUrl, threshold - elapsed);
    };

    private startDisconnectionTimer = (serverUrl: string, remainingMs: number) => {
        this.clearDisconnectionTimer(serverUrl);
        if (remainingMs <= 0) {
            this.enqueueEval(serverUrl, () => this.flagOffline(serverUrl, true));
            return;
        }
        this.disconnectionTimers[serverUrl] = setTimeout(() => {
            delete this.disconnectionTimers[serverUrl];
            this.enqueueEval(serverUrl, () => this.flagOffline(serverUrl, true));
        }, remainingMs);
    };

    private clearDisconnectionTimer = (serverUrl: string) => {
        const handle = this.disconnectionTimers[serverUrl];
        if (handle) {
            clearTimeout(handle);
            delete this.disconnectionTimers[serverUrl];
        }
    };

    private clearPurgeTimer = (serverUrl: string) => {
        const handle = this.purgeTimers[serverUrl];
        if (handle) {
            clearTimeout(handle);
            delete this.purgeTimers[serverUrl];
        }
    };

    private flagOffline = async (serverUrl: string, value: boolean) => {
        const subject = this.getOfflineSubject(serverUrl);
        const prev = subject.getValue();
        subject.next(value);
        if (prev === value) {
            return;
        }
        if (value) {
            await this.onTransitionToOffline(serverUrl);
        } else {
            await this.onTransitionToOnline(serverUrl);
        }
    };

    private onTransitionToOffline = async (serverUrl: string) => {
        const entry = this.trackedServers.get(serverUrl);
        if (entry?.kind !== 'mem') {
            return;
        }

        let database;
        try {
            database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
        } catch (error) {
            logError('EphemeralModeManager.onTransitionToOffline', error);
            return;
        }

        const existing = await getOfflineSince(database);
        if (existing === undefined) {
            // Derive offline_since from disconnected_since so a resume-past-threshold
            // doesn't reset the start of the purge window to "now".
            const disconnectedSince = await getDisconnectedSince(database);
            const offlineSince = disconnectedSince === undefined ? Date.now() : disconnectedSince + entry.thresholdMs;
            await setOfflineSince(serverUrl, offlineSince);
            await setLastSeenTime(serverUrl, Date.now());
        }
        await this.evaluatePurge(serverUrl);
    };

    private onTransitionToOnline = async (serverUrl: string) => {
        this.clearPurgeTimer(serverUrl);
        await clearEphemeralModeState(serverUrl);
    };

    private evaluatePurge = async (serverUrl: string) => {
        if (!this.isOffline(serverUrl)) {
            return;
        }

        const entry = this.trackedServers.get(serverUrl);
        if (entry?.kind !== 'mem') {
            return;
        }

        const server = await getServer(serverUrl);
        if (server && server.persistenceFlag === 'wiped') {
            this.clearPurgeTimer(serverUrl);
            return;
        }

        let database;
        try {
            database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
        } catch (error) {
            logError('EphemeralModeManager.evaluatePurge', error);
            return;
        }

        const lastSeen = await getLastSeenTime(database);
        let offlineSince = await getOfflineSince(database);
        if (offlineSince === undefined) {
            // Defensive: flag says offline but no anchor persisted — fire immediately
            // rather than risk missing the purge entirely.
            await this.runWipe(serverUrl);
            return;
        }

        const now = Date.now();
        if (lastSeen !== undefined && now < lastSeen) {
            const offset = lastSeen - now;
            offlineSince -= offset;
            await setOfflineSince(serverUrl, offlineSince);
        }
        await setLastSeenTime(serverUrl, now);

        const remainingMs = (offlineSince + entry.purgeThresholdMs) - now;

        this.clearPurgeTimer(serverUrl);
        if (remainingMs <= 0) {
            await this.runWipe(serverUrl);
            return;
        }
        this.purgeTimers[serverUrl] = setTimeout(() => {
            delete this.purgeTimers[serverUrl];
            this.enqueueEval(serverUrl, () => this.runWipe(serverUrl));
        }, remainingMs);
    };

    private wipeServerArtifacts = (serverUrl: string) => {
        PushNotifications.removeServerNotifications(serverUrl);
        return Promise.all([
            wipeServerDatabaseWithRetry(serverUrl),
            wipeServerFiles(serverUrl),
        ]);
    };

    private runWipe = async (serverUrl: string) => {
        if (this.wipeInProgress.has(serverUrl)) {
            return;
        }
        this.wipeInProgress.add(serverUrl);

        try {
            const activeUrl = await DatabaseManager.getActiveServerUrl();
            const displayName = (await getServerDisplayName(serverUrl)) || serverUrl;

            if (serverUrl === activeUrl) {
                navigateToScreen(Screens.DATA_ERASED, {serverUrl, displayName}, true);
            }

            await DatabaseManager.updatePersistenceFlag(serverUrl, 'wiped');

            this.pauseSubscriptions(serverUrl);
            const [{success}] = await this.wipeServerArtifacts(serverUrl);
            if (!success) {
                logError('EphemeralModeManager.runWipe: wipe failed after retries, server re-added with stale data', serverUrl);
            }
            await this.addServer(serverUrl);
        } catch (error) {
            logError('EphemeralModeManager.runWipe', error);
        } finally {
            this.wipeInProgress.delete(serverUrl);
        }
    };

    private getOfflineSubject = (serverUrl: string) => {
        if (!this.offlineSubjects[serverUrl]) {
            this.offlineSubjects[serverUrl] = new BehaviorSubject<boolean>(false);
        }
        return this.offlineSubjects[serverUrl];
    };
}

const EphemeralModeManager = new EphemeralModeManagerSingleton();
export default EphemeralModeManager;
