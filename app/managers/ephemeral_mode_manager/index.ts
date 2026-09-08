// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, type AppStateStatus, DeviceEventEmitter, type NativeEventSubscription} from 'react-native';
import {asapScheduler, BehaviorSubject, combineLatest, type Subscription} from 'rxjs';
import {debounceTime, distinctUntilChanged, skip} from 'rxjs/operators';

import {wipeServerDatabaseWithRetry, wipeServerFiles} from '@actions/local/ephemeral_mode/wipe';
import {clearEphemeralModeState, setDisconnectedSince, setLastSeenTime, setOfflineSince} from '@actions/local/systems';
import {Events, Screens} from '@constants';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import DatabaseManager from '@database/manager';
import PushNotifications from '@init/push_notifications';
import WebsocketManager from '@managers/websocket_manager';
import {getServer, getServerDisplayName} from '@queries/app/servers';
import {getDisconnectedSince, getLastSeenTime, getOfflineSince, observeConfigValue} from '@queries/servers/system';
import {navigateToScreen} from '@screens/navigation';
import {deleteFileCache} from '@utils/file';
import {logDebug, logError} from '@utils/log';
import {showSnackBar} from '@utils/snack_bar';

type ServerEntry =
    | {kind: 'zpm'}
    | {kind: 'mem'; thresholdMs: number; purgeThresholdMs: number};

// Conservative checkpoints since the offline-persistence timer is configured in whole
// hours — a sub-minute heads-up isn't meaningful lead time at that scale.
const WIPE_WARNING_THRESHOLDS_MS = [30 * 60_000, 10 * 60_000, 60_000];

class EphemeralModeManagerSingleton {
    private offlineSubjects: {[serverUrl: string]: BehaviorSubject<boolean>} = {};
    private disconnectionTimers: Record<string, NodeJS.Timeout> = {};
    private purgeTimers: Record<string, NodeJS.Timeout> = {};
    private warnTimers: Record<string, NodeJS.Timeout[]> = {};
    private wsSubscriptions: Record<string, Subscription> = {};
    private configSubscriptions: Record<string, Subscription> = {};
    private appStateSubscription?: NativeEventSubscription;

    private trackedServers = new Map<string, ServerEntry>();
    private cleanupDays: Record<string, number> = {};
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
                await this.notifyIfEphemeralModeActiveOnStart(serverUrl, server);
                await this.addServer(serverUrl);
            } catch (error) {
                logError('EphemeralModeManager.init', error);
            }
        }));
    };

    // Runs once per cold start (not on foreground) so users are reminded of the
    // device's persistence mode every time the app launches, not just when it changes.
    private notifyIfEphemeralModeActiveOnStart = async (serverUrl: string, server: Awaited<ReturnType<typeof getServer>>) => {
        const activeUrl = await DatabaseManager.getActiveServerUrl();
        if (serverUrl !== activeUrl) {
            return;
        }

        if (server?.persistenceFlag === 'zero-persistence') {
            showSnackBar({barType: SNACK_BAR_TYPE.EPHEMERAL_MODE_ZERO_PERSISTENCE_ACTIVE});
        }
    };

    public cleanup = () => {
        for (const url of Object.keys(this.configSubscriptions)) {
            this.removeServer(url);
        }
        this.wipeInProgress.clear();
    };

    // stops tracking a particular server and cancels any pending operations
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
        delete this.cleanupDays[serverUrl];
        delete this.offlineSubjects[serverUrl];
        this.maybeRemoveAppStateListener();
    };

    public isOffline = (serverUrl: string): boolean => {
        return this.offlineSubjects[serverUrl]?.getValue() ?? false;
    };

    public getAutoCacheCleanupDays = (serverUrl: string): number => {
        return this.cleanupDays[serverUrl] ?? 0;
    };

    public isZeroPersistenceMode = (serverUrl: string): boolean => {
        return this.trackedServers.get(serverUrl)?.kind === 'zpm';
    };

    public addServer = async (serverUrl: string, {cleanFileCache = true}: {cleanFileCache?: boolean} = {}) => {
        if (this.configSubscriptions[serverUrl] || this.trackedServers.has(serverUrl)) {
            return;
        }

        const server = await getServer(serverUrl);
        if (server?.persistenceFlag === 'zero-persistence') {
            if (cleanFileCache) {
                await deleteFileCache(serverUrl);
            }
            this.trackedServers.set(serverUrl, {kind: 'zpm'});
            this.ensureAppStateListener();
            return;
        }

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        this.configSubscriptions[serverUrl] = combineLatest([
            observeConfigValue(database, 'MobileEphemeralModeEnabled'),
            observeConfigValue(database, 'MobileEphemeralModeDisconnectionTimeoutSeconds'),
            observeConfigValue(database, 'MobileEphemeralModeOfflinePersistenceTimerHours'),
            observeConfigValue(database, 'MobileEphemeralModeAutoCacheCleanupDays'),
        ]).pipe(

            // Each config row emits separately, so a single sync touching several
            // settings would otherwise deliver one partially-updated tuple per row.
            debounceTime(0, asapScheduler),
            distinctUntilChanged(
                ([prevEnabled, prevTimeout, prevPurgeHours, prevCleanupDays],
                    [nextEnabled, nextTimeout, nextPurgeHours, nextCleanupDays]) =>
                    prevEnabled === nextEnabled && prevTimeout === nextTimeout &&
                    prevPurgeHours === nextPurgeHours && prevCleanupDays === nextCleanupDays,
            ),
        ).subscribe(([enabledStr, timeoutStr, purgeHoursStr, cleanupDaysStr]) => {
            this.onEphemeralModeConfigChange(serverUrl, enabledStr, timeoutStr, purgeHoursStr, cleanupDaysStr);
        });
    };

    private onEphemeralModeConfigChange = async (
        serverUrl: string,
        enabledStr: string | undefined,
        timeoutStr: string | undefined,
        purgeHoursStr: string | undefined,
        cleanupDaysStr: string | undefined,
    ) => {
        const currentTrackedServer = this.trackedServers.get(serverUrl);

        const nextEnabled = enabledStr === 'true';
        const nextThresholdMs = Math.max(0, Number(timeoutStr ?? '0')) * 1000;
        const nextPurgeHours = Math.max(0, Number(purgeHoursStr ?? '0'));
        const nextPurgeThresholdMs = nextPurgeHours * 3600 * 1000;
        const nextCleanupDays = Math.max(0, Number(cleanupDaysStr ?? '0'));

        const wasActive = currentTrackedServer?.kind === 'mem';
        this.cleanupDays[serverUrl] = nextCleanupDays;

        if (nextCleanupDays > 0) {
            logDebug('EphemeralModeManager: auto cache cleanup config received, days:', nextCleanupDays, 'for', serverUrl);
        }

        if (nextEnabled && !wasActive) {
            this.track(serverUrl, nextThresholdMs, nextPurgeThresholdMs);
            showSnackBar({barType: SNACK_BAR_TYPE.EPHEMERAL_MODE_ENABLED, descriptionValues: {hours: nextPurgeHours, days: nextCleanupDays}});
            return;
        }
        if (!nextEnabled && wasActive) {
            await this.untrack(serverUrl);
            showSnackBar({barType: SNACK_BAR_TYPE.EPHEMERAL_MODE_DISABLED});
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
            showSnackBar({barType: SNACK_BAR_TYPE.EPHEMERAL_MODE_SETTINGS_UPDATED, descriptionValues: {hours: nextPurgeHours, days: nextCleanupDays}});
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
        this.clearWarnTimer(serverUrl);
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
                    wipeServerFiles(url);
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

        // no current disconnection timeout set
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

    private clearWarnTimer = (serverUrl: string) => {
        const handles = this.warnTimers[serverUrl];
        if (handles) {
            handles.forEach(clearTimeout);
            delete this.warnTimers[serverUrl];
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

        showSnackBar({barType: SNACK_BAR_TYPE.EPHEMERAL_MODE_DISCONNECTED});

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
        logDebug('EphemeralModeManager: online', serverUrl);
        this.clearPurgeTimer(serverUrl);
        this.clearWarnTimer(serverUrl);
        await clearEphemeralModeState(serverUrl);

        // emit event so UI can react in case of reconnection and the ephemeral mode offline snackbar is showing
        DeviceEventEmitter.emit(Events.EPHEMERAL_MODE_RECONNECTED);
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
            this.clearWarnTimer(serverUrl);
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
        this.clearWarnTimer(serverUrl);
        if (remainingMs <= 0) {
            await this.runWipe(serverUrl);
            return;
        }
        this.scheduleWipeWarnings(serverUrl, remainingMs);
        this.purgeTimers[serverUrl] = setTimeout(() => {
            delete this.purgeTimers[serverUrl];
            this.enqueueEval(serverUrl, () => this.runWipe(serverUrl));
        }, remainingMs);
    };

    private scheduleWipeWarnings = (serverUrl: string, remainingMs: number) => {
        const timers: NodeJS.Timeout[] = [];
        let firedImmediateWarning = false;
        for (const threshold of WIPE_WARNING_THRESHOLDS_MS) {
            if (threshold < remainingMs) {
                timers.push(setTimeout(() => {
                    showSnackBar({barType: SNACK_BAR_TYPE.EPHEMERAL_MODE_WIPE_WARNING, messageValues: {minutes: threshold / 60_000}});
                }, remainingMs - threshold));
            } else if (!firedImmediateWarning) {
                firedImmediateWarning = true;
                showSnackBar({
                    barType: SNACK_BAR_TYPE.EPHEMERAL_MODE_WIPE_WARNING,
                    messageValues: {minutes: Math.max(1, Math.ceil(remainingMs / 60_000))},
                });
            }
        }
        this.warnTimers[serverUrl] = timers;
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
