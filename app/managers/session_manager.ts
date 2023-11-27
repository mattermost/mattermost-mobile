// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CookieManager, {type Cookie} from '@react-native-cookies/cookies';
import {AppState, type AppStateStatus, DeviceEventEmitter, Platform} from 'react-native';
import FastImage from 'react-native-fast-image';

import {removePushDisabledInServerAcknowledged, storeOnboardingViewedValue} from '@actions/app/global';
import {cancelSessionNotification, logout, scheduleSessionNotification} from '@actions/remote/session';
import {Events, Launch} from '@constants';
import DatabaseManager from '@database/manager';
import {resetMomentLocale} from '@i18n';
import {getAllServerCredentials, removeServerCredentials} from '@init/credentials';
import {relaunchApp} from '@init/launch';
import PushNotifications from '@init/push_notifications';
import * as analytics from '@managers/analytics';
import NetworkManager from '@managers/network_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getAllServers, getServerDisplayName} from '@queries/app/servers';
import {getCurrentUser} from '@queries/servers/user';
import {getThemeFromState} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {deleteFileCache, deleteFileCacheByDir} from '@utils/file';
import {isMainActivity} from '@utils/helpers';
import {urlSafeBase64Encode} from '@utils/security';
import {addNewServer} from '@utils/server';

import type {LaunchType} from '@typings/launch';

type LogoutCallbackArg = {
    serverUrl: string;
    removeServer: boolean;
}

class SessionManager {
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
        this.cancelAllSessionNotifications();
    }

    private cancelAllSessionNotifications = async () => {
        const serverCredentials = await getAllServerCredentials();
        for (const {serverUrl} of serverCredentials) {
            cancelSessionNotification(serverUrl);
        }
    };

    private clearCookies = async (serverUrl: string, webKit: boolean) => {
        try {
            const cookies = await CookieManager.get(serverUrl, webKit);
            const values = Object.values(cookies);
            values.forEach((cookie: Cookie) => {
                CookieManager.clearByName(serverUrl, cookie.name, webKit);
            });
        } catch (error) {
            // Nothing to clear
        }
    };

    private clearCookiesForServer = async (serverUrl: string) => {
        if (Platform.OS === 'ios') {
            this.clearCookies(serverUrl, false);

            // Also delete any cookies that were set by react-native-webview
            this.clearCookies(serverUrl, true);
        } else if (Platform.OS === 'android') {
            CookieManager.flush();
        }
    };

    private scheduleAllSessionNotifications = async () => {
        if (!this.scheduling) {
            this.scheduling = true;
            const serverCredentials = await getAllServerCredentials();
            const promises: Array<Promise<void>> = [];
            for (const {serverUrl} of serverCredentials) {
                promises.push(scheduleSessionNotification(serverUrl));
            }

            await Promise.all(promises);
            this.scheduling = false;
        }
    };

    private resetLocale = async () => {
        if (Object.keys(DatabaseManager.serverDatabases).length) {
            const serverDatabase = await DatabaseManager.getActiveServerDatabase();
            const user = await getCurrentUser(serverDatabase!);
            resetMomentLocale(user?.locale);
        } else {
            resetMomentLocale();
        }
    };

    private terminateSession = async (serverUrl: string, removeServer: boolean) => {
        cancelSessionNotification(serverUrl);
        await removeServerCredentials(serverUrl);
        PushNotifications.removeServerNotifications(serverUrl);

        NetworkManager.invalidateClient(serverUrl);
        WebsocketManager.invalidateClient(serverUrl);

        if (removeServer) {
            await removePushDisabledInServerAcknowledged(urlSafeBase64Encode(serverUrl));
            await DatabaseManager.destroyServerDatabase(serverUrl);
        } else {
            await DatabaseManager.deleteServerDatabase(serverUrl);
        }

        const analyticsClient = analytics.get(serverUrl);
        if (analyticsClient) {
            analyticsClient.reset();
            analytics.invalidate(serverUrl);
        }

        this.resetLocale();
        this.clearCookiesForServer(serverUrl);
        FastImage.clearDiskCache();
        deleteFileCache(serverUrl);
        deleteFileCacheByDir('mmPasteInput');
        deleteFileCacheByDir('thumbnails');
        if (Platform.OS === 'android') {
            deleteFileCacheByDir('image_cache');
        }
    };

    private onAppStateChange = async (appState: AppStateStatus) => {
        if (appState === this.previousAppState || !isMainActivity()) {
            return;
        }

        this.previousAppState = appState;
        switch (appState) {
            case 'active':
                setTimeout(this.cancelAllSessionNotifications, 750);
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
        this.terminatingSessionUrl.add(serverUrl);

        const activeServerUrl = await DatabaseManager.getActiveServerUrl();
        const activeServerDisplayName = await DatabaseManager.getActiveServerDisplayName();

        await this.terminateSession(serverUrl, removeServer);

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
        this.terminatingSessionUrl.delete(serverUrl);
    };

    private onSessionExpired = async (serverUrl: string) => {
        this.terminatingSessionUrl.add(serverUrl);
        await logout(serverUrl, false, false, true);
        await this.terminateSession(serverUrl, false);

        const activeServerUrl = await DatabaseManager.getActiveServerUrl();
        const serverDisplayName = await getServerDisplayName(serverUrl);

        await relaunchApp({launchType: Launch.Normal, serverUrl, displayName: serverDisplayName});
        if (activeServerUrl) {
            addNewServer(getThemeFromState(), serverUrl, serverDisplayName);
        } else {
            EphemeralStore.theme = undefined;
        }
        this.terminatingSessionUrl.delete(serverUrl);
    };
}

export default new SessionManager();
