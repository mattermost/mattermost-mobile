// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, type AppStateStatus, DeviceEventEmitter, Platform} from 'react-native';

import {storeGlobal, storeOnboardingViewedValue} from '@actions/app/global';
import {cancelAllSessionNotifications, terminateSession} from '@actions/local/session';
import {logout, scheduleSessionNotification} from '@actions/remote/session';
import {Events, Launch} from '@constants';
import {GLOBAL_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getAllServerCredentials} from '@init/credentials';
import {relaunchApp} from '@init/launch';
import IntuneManager from '@managers/intune_manager';
import SecurityManager from '@managers/security_manager';
import {queryGlobalValue} from '@queries/app/global';
import {getAllServers, getServerDisplayName} from '@queries/app/servers';
import {getThemeFromState} from '@screens/navigation';
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

    constructor() {
        if (Platform.OS === 'android') {
            AppState.addEventListener('blur', () => {
                this.onAppStateChange('inactive');
            });
            AppState.addEventListener('focus', () => {
                this.onAppStateChange('active');
            });
        } else {
            AppState.addEventListener('change', this.onAppStateChange);
        }

        DeviceEventEmitter.addListener(Events.SERVER_LOGOUT, this.onLogout);
        DeviceEventEmitter.addListener(Events.SESSION_EXPIRED, this.onSessionExpired);

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
            await terminateSession(serverUrl, removeServer);
            SecurityManager.removeServer(serverUrl);
            await IntuneManager.unenrollServer(serverUrl, true);

            if (activeServerUrl === serverUrl) {
                let displayName = '';
                let launchType: LaunchType = Launch.AddServer;
                if (!Object.keys(DatabaseManager.serverDatabases).length) {
                    EphemeralStore.theme = undefined;
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

                relaunchApp({launchType, serverUrl, displayName});
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

            await relaunchApp({launchType: Launch.Normal, serverUrl, displayName: serverDisplayName});
            if (activeServerUrl) {
                addNewServer(getThemeFromState(), serverUrl, serverDisplayName);
            } else {
                EphemeralStore.theme = undefined;
            }
        } finally {
            this.terminatingSessionUrl.delete(serverUrl);
        }
    };
}

const SessionManager = new SessionManagerSingleton();
export default SessionManager;
