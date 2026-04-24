// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, type AppStateStatus, type NativeEventSubscription} from 'react-native';
import {BehaviorSubject, combineLatest, from, of as of$, type Observable, type Subscription} from 'rxjs';
import {distinctUntilChanged, skip, switchMap} from 'rxjs/operators';

import {setDisconnectedSince} from '@actions/local/systems';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {getDisconnectedSince, observeConfigValue} from '@queries/servers/system';
import {logError} from '@utils/log';

class OfflinePersistenceManagerSingleton {
    private offlineSubjects: {[serverUrl: string]: BehaviorSubject<boolean>} = {};
    private disconnectionTimers: Record<string, NodeJS.Timeout> = {};
    private wsSubscriptions: Record<string, Subscription> = {};
    private configSubscriptions: Record<string, Subscription> = {};
    private appStateSubscription?: NativeEventSubscription;

    private activeServers = new Set<string>();
    private thresholdMs: Record<string, number> = {};

    public init = async (serverCredentials: ServerCredential[]) => {
        for (const url of Object.keys(this.configSubscriptions)) {
            this.removeServer(url);
        }

        for (const {serverUrl} of serverCredentials) {
            try {
                this.addServer(serverUrl);
            } catch (error) {
                logError('OfflinePersistenceManager.init', error);
            }
        }
    };

    public removeServer = (serverUrl: string) => {
        if (this.activeServers.has(serverUrl)) {
            this.deactivate(serverUrl);
        }
        this.configSubscriptions[serverUrl]?.unsubscribe();
        delete this.configSubscriptions[serverUrl];
        delete this.thresholdMs[serverUrl];
        delete this.offlineSubjects[serverUrl];
    };

    public observeOffline = (serverUrl: string): Observable<boolean> => {
        return this.getOfflineSubject(serverUrl).asObservable().pipe(distinctUntilChanged());
    };

    public observeActiveServerOffline = (): Observable<boolean> => {
        return from(DatabaseManager.getActiveServerUrl()).pipe(
            switchMap((url) => (url ? this.observeOffline(url) : of$(false))),
        );
    };

    public isOffline = (serverUrl: string): boolean => {
        return this.offlineSubjects[serverUrl]?.getValue() ?? false;
    };

    private addServer = (serverUrl: string) => {
        if (this.configSubscriptions[serverUrl]) {
            return;
        }

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        this.configSubscriptions[serverUrl] = combineLatest([
            observeConfigValue(database, 'MobileEphemeralModeEnabled'),
            observeConfigValue(database, 'MobileEphemeralModeDisconnectionTimeoutSeconds'),
        ]).pipe(
            distinctUntilChanged(
                ([prevEnabled, prevTimeout], [nextEnabled, nextTimeout]) =>
                    prevEnabled === nextEnabled && prevTimeout === nextTimeout,
            ),
        ).subscribe(([enabledStr, timeoutStr]) => {
            this.onEphemeralModeConfigChange(serverUrl, enabledStr, timeoutStr);
        });
    };

    private onEphemeralModeConfigChange = (
        serverUrl: string,
        enabledStr: string | undefined,
        timeoutStr: string | undefined,
    ) => {
        const nextEnabled = enabledStr === 'true';
        const nextThresholdMs = Math.max(0, Number(timeoutStr ?? '0')) * 1000;
        const wasActive = this.activeServers.has(serverUrl);

        this.thresholdMs[serverUrl] = nextThresholdMs;

        if (nextEnabled && !wasActive) {
            this.activate(serverUrl);
            return;
        }
        if (!nextEnabled && wasActive) {
            this.deactivate(serverUrl);
            return;
        }
        if (nextEnabled && wasActive) {
            this.evaluateServer(serverUrl);
            return;
        }

        // Disabled + inactive: clear any stale row left over from a prior enabled session.
        setDisconnectedSince(serverUrl, null);
    };

    private activate = (serverUrl: string) => {
        this.activeServers.add(serverUrl);
        this.ensureAppStateListener();

        // skip(1) drops the BehaviorSubject's replay of the current WS state so it
        // isn't mistaken for a fresh transition; persisted state drives the resume.
        this.wsSubscriptions[serverUrl] = WebsocketManager.observeWebsocketState(serverUrl).pipe(
            skip(1),
        ).subscribe(() => {
            this.evaluateServer(serverUrl);
        });

        this.evaluateServer(serverUrl, true);
    };

    private deactivate = (serverUrl: string) => {
        this.activeServers.delete(serverUrl);
        this.wsSubscriptions[serverUrl]?.unsubscribe();
        delete this.wsSubscriptions[serverUrl];
        this.clearDisconnectionTimer(serverUrl);
        this.flagOffline(serverUrl, false);
        setDisconnectedSince(serverUrl, null);
        this.maybeRemoveAppStateListener();
    };

    private onAppStateChange = (appState: AppStateStatus) => {
        if (appState !== 'active') {
            return;
        }
        for (const url of this.activeServers) {
            this.evaluateServer(url);
        }
    };

    private ensureAppStateListener = () => {
        if (!this.appStateSubscription) {
            this.appStateSubscription = AppState.addEventListener('change', this.onAppStateChange);
        }
    };

    private maybeRemoveAppStateListener = () => {
        if (this.activeServers.size === 0 && this.appStateSubscription) {
            this.appStateSubscription.remove();
            this.appStateSubscription = undefined;
        }
    };

    private evaluateServer = async (serverUrl: string, isResume = false) => {
        if (!this.activeServers.has(serverUrl)) {
            return;
        }

        if (WebsocketManager.isConnected(serverUrl)) {
            this.clearDisconnectionTimer(serverUrl);
            this.flagOffline(serverUrl, false);
            await setDisconnectedSince(serverUrl, null);
            return;
        }

        let database;
        try {
            database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
        } catch (error) {
            logError('OfflinePersistenceManager.evaluateServer', error);
            return;
        }

        const persisted = await getDisconnectedSince(database);

        if (persisted === undefined) {
            // Fresh timers only start on foreground transitions, not on init-resume or while backgrounded.
            if (isResume || AppState.currentState !== 'active') {
                return;
            }
            const now = Date.now();
            await setDisconnectedSince(serverUrl, now);
            this.startDisconnectionTimer(serverUrl, this.thresholdMs[serverUrl]);
            return;
        }

        const elapsed = Date.now() - persisted;
        const threshold = this.thresholdMs[serverUrl];
        if (elapsed >= threshold) {
            this.clearDisconnectionTimer(serverUrl);
            this.flagOffline(serverUrl, true);
            return;
        }
        this.flagOffline(serverUrl, false);
        this.startDisconnectionTimer(serverUrl, threshold - elapsed);
    };

    private startDisconnectionTimer = (serverUrl: string, remainingMs: number) => {
        this.clearDisconnectionTimer(serverUrl);
        if (remainingMs <= 0) {
            this.flagOffline(serverUrl, true);
            return;
        }
        this.disconnectionTimers[serverUrl] = setTimeout(() => {
            delete this.disconnectionTimers[serverUrl];
            this.flagOffline(serverUrl, true);
        }, remainingMs);
    };

    private clearDisconnectionTimer = (serverUrl: string) => {
        const handle = this.disconnectionTimers[serverUrl];
        if (handle) {
            clearTimeout(handle);
            delete this.disconnectionTimers[serverUrl];
        }
    };

    private flagOffline = (serverUrl: string, value: boolean) => {
        this.getOfflineSubject(serverUrl).next(value);
    };

    private getOfflineSubject = (serverUrl: string) => {
        if (!this.offlineSubjects[serverUrl]) {
            this.offlineSubjects[serverUrl] = new BehaviorSubject<boolean>(false);
        }
        return this.offlineSubjects[serverUrl];
    };
}

const OfflinePersistenceManager = new OfflinePersistenceManagerSingleton();
export default OfflinePersistenceManager;
