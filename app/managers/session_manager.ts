// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {router} from 'expo-router';
import {AppState, type AppStateStatus, DeviceEventEmitter, type EventSubscription, type NativeEventSubscription, Platform} from 'react-native';

import {storeGlobal, storeOnboardingViewedValue} from '@actions/app/global';
import {cancelAllSessionNotifications, terminateSession} from '@actions/local/session';
import {logout, scheduleSessionNotification} from '@actions/remote/session';
import {Events, Launch} from '@constants';
import {GLOBAL_IDENTIFIERS} from '@constants/database';
import {getDefaultThemeByAppearance} from '@context/theme';
import DatabaseManager from '@database/manager';
import {getAllServerCredentials} from '@init/credentials';
import {determineRouteFromLaunchProps} from '@init/launch';
import IntuneManager from '@managers/intune_manager';
import SecurityManager from '@managers/security_manager';
import {queryGlobalValue} from '@queries/app/global';
import {getAllServers, getServerDisplayName} from '@queries/app/servers';
import EphemeralStore from '@store/ephemeral_store';
import {deleteFileCacheByDir} from '@utils/file';
import {isMainActivity} from '@utils/helpers';
import {addNewServer} from '@utils/server';

import type {LaunchType} from '@typings/launch';

type LogoutCallbackArg = {
    serverUrl: string;
    removeServer: boolean;
}

export class SessionManagerSingleton {
    private previousAppState: AppStateStatus;
    private scheduling = false;
    private terminatingSessionUrl = new Set<string>();
    private appStateChangeListener: NativeEventSubscription | undefined;
    private appStateBlurListener: NativeEventSubscription | undefined;
    private appStateFocusListener: NativeEventSubscription | undefined;
    private serverLogoutListener: EventSubscription | undefined;
    private sessionExpiredListener: EventSubscription | undefined;

    constructor() {
        if (Platform.OS === 'android') {
            this.appStateBlurListener = AppState.addEventListener('blur', () => {
                this.onAppStateChange('inactive');
            });
            this.appStateFocusListener = AppState.addEventListener('focus', () => {
                this.onAppStateChange('active');
            });
        } else {
            this.appStateChangeListener = AppState.addEventListener('change', this.onAppStateChange);
        }

        this.serverLogoutListener = DeviceEventEmitter.addListener(Events.SERVER_LOGOUT, this.onLogout);
        this.sessionExpiredListener = DeviceEventEmitter.addListener(Events.SESSION_EXPIRED, this.onSessionExpired);

        this.previousAppState = AppState.currentState;
    }

    init() {
        cancelAllSessionNotifications();

        let updateToMigrationDone = false;
        queryGlobalValue(GLOBAL_IDENTIFIERS.CACHE_MIGRATION)?.fetch().then((records) => {
            const cacheMigrationDone = Boolean(records?.[0]?.value);
            if (!cacheMigrationDone) {
                if (Platform.OS === 'ios') {
                    deleteFileCacheByDir('com.hackemist.SDImageCache');
                } else if (Platform.OS === 'android') {
                    deleteFileCacheByDir('image_cache');
                    deleteFileCacheByDir('image_manager_disk_cache');
                }
                updateToMigrationDone = true;
            }
        }).finally(() => {
            if (updateToMigrationDone) {
                storeGlobal(GLOBAL_IDENTIFIERS.CACHE_MIGRATION, true);
            }
        });
    }

    cleanup() {
        this.appStateChangeListener?.remove();
        this.appStateBlurListener?.remove();
        this.appStateFocusListener?.remove();
        this.serverLogoutListener?.remove();
        this.sessionExpiredListener?.remove();
    }

    private scheduleAllSessionNotifications = async () => {
        if (!this.scheduling) {
            this.scheduling = true;
            const serverCredentials = await getAllServerCredentials();
            const promises: Array<Promise<{error: unknown} | {error?: undefined}>> = [];
            for (const {serverUrl} of serverCredentials) {
                promises.push(scheduleSessionNotification(serverUrl));
            }

            await Promise.all(promises);
            this.scheduling = false;
        }
    };

    private onAppStateChange = async (appState: AppStateStatus) => {
        if (appState === this.previousAppState || !isMainActivity()) {
            return;
        }

        this.previousAppState = appState;
        switch (appState) {
            case 'active':
                setTimeout(cancelAllSessionNotifications, 750);
                break;
            case 'inactive':
                this.scheduleAllSessionNotifications();
                break;
        }
    };

    private onLogout = async ({serverUrl, removeServer}: LogoutCallbackArg) => {
        if (this.terminatingSessionUrl.has(serverUrl)) {
            return;
        }
        try {
            this.terminatingSessionUrl.add(serverUrl);

            const activeServerUrl = await DatabaseManager.getActiveServerUrl();
            const activeServerDisplayName = await DatabaseManager.getActiveServerDisplayName();

            // We do not unenroll with Wipe as we already removed all the data during terminateSession
            await IntuneManager.unenrollServer(serverUrl, false);
            await terminateSession(serverUrl, removeServer);
            SecurityManager.removeServer(serverUrl);

            if (activeServerUrl === serverUrl) {
                let displayName = '';
                let launchType: LaunchType = Launch.AddServer;
                if (!Object.keys(DatabaseManager.serverDatabases).length) {
                    EphemeralStore.setTheme(getDefaultThemeByAppearance());
                    launchType = Launch.Normal;

                    if (activeServerDisplayName) {
                        displayName = activeServerDisplayName;
                    }
                }

                // set the onboardingViewed value to false so the launch will show the onboarding screen after all servers were removed
                const servers = await getAllServers();
                if (!servers.length) {
                    await storeOnboardingViewedValue(false);
                }
                const launchRoute = await determineRouteFromLaunchProps({launchType, serverUrl, displayName});

                router.replace({pathname: launchRoute.route, params: launchRoute.params});
            }
        } finally {
            this.terminatingSessionUrl.delete(serverUrl);
        }
    };

    private onSessionExpired = async (serverUrl: string) => {
        this.terminatingSessionUrl.add(serverUrl);

        try {
        // logout is not doing anything in this scenario, but we keep it
        // to keep the same flow as other logout scenarios.
            await logout(serverUrl, undefined, {skipServerLogout: true, skipEvents: true});

            await terminateSession(serverUrl, false);
            SecurityManager.removeServer(serverUrl);
            await IntuneManager.unenrollServer(serverUrl, true);

            const activeServerUrl = await DatabaseManager.getActiveServerUrl();
            const serverDisplayName = await getServerDisplayName(serverUrl);

            const launchRoute = await determineRouteFromLaunchProps({launchType: Launch.Normal, serverUrl, displayName: serverDisplayName});
            router.replace({pathname: launchRoute.route, params: launchRoute.params});
            if (activeServerUrl) {
                addNewServer(EphemeralStore.getTheme(), serverUrl, serverDisplayName);
            } else {
                EphemeralStore.setTheme(getDefaultThemeByAppearance());
            }
        } finally {
            this.terminatingSessionUrl.delete(serverUrl);
        }
    };
}

const SessionManager = new SessionManagerSingleton();
export default SessionManager;
