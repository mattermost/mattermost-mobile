// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CookieManager, {Cookie} from '@react-native-cookies/cookies';
import {Alert, DeviceEventEmitter, Linking, Platform} from 'react-native';
import FastImage from 'react-native-fast-image';
import semver from 'semver';

import LocalConfig from '@assets/config.json';
import {Events, Sso, Launch} from '@constants';
import DatabaseManager from '@database/manager';
import {DEFAULT_LOCALE, getTranslations, resetMomentLocale, t} from '@i18n';
import {getServerCredentials, removeServerCredentials} from '@init/credentials';
import {getLaunchPropsFromDeepLink, relaunchApp} from '@init/launch';
import PushNotifications from '@init/push_notifications';
import * as analytics from '@managers/analytics';
import NetworkManager from '@managers/network_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import {deleteFileCache, deleteFileCacheByDir} from '@utils/file';

import type {jsAndNativeErrorHandler} from '@typings/global/error_handling';
import type {LaunchType} from '@typings/launch';

type LinkingCallbackArg = {url: string};

type LogoutCallbackArg = {
    serverUrl: string;
    removeServer: boolean;
}

class GlobalEventHandler {
    JavascriptAndNativeErrorHandler: jsAndNativeErrorHandler | undefined;

    constructor() {
        DeviceEventEmitter.addListener(Events.SERVER_LOGOUT, this.onLogout);
        DeviceEventEmitter.addListener(Events.SERVER_VERSION_CHANGED, this.onServerVersionChanged);
        DeviceEventEmitter.addListener(Events.CONFIG_CHANGED, this.onServerConfigChanged);

        Linking.addEventListener('url', this.onDeepLink);
    }

    init = () => {
        this.JavascriptAndNativeErrorHandler = require('@utils/error_handling').default;
        this.JavascriptAndNativeErrorHandler?.initializeErrorHandling();
    };

    configureAnalytics = async (serverUrl: string, config?: ClientConfig) => {
        if (serverUrl && config?.DiagnosticsEnabled === 'true' && config?.DiagnosticId && LocalConfig.RudderApiKey) {
            let client = analytics.get(serverUrl);
            if (!client) {
                client = analytics.create(serverUrl);
            }

            await client.init(config);
        }
    };

    onDeepLink = (event: LinkingCallbackArg) => {
        if (event.url?.startsWith(Sso.REDIRECT_URL_SCHEME) || event.url?.startsWith(Sso.REDIRECT_URL_SCHEME_DEV)) {
            return;
        }

        if (event.url) {
            const props = getLaunchPropsFromDeepLink(event.url);
            relaunchApp(props);
        }
    };

    clearCookies = async (serverUrl: string, webKit: boolean) => {
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

    clearCookiesForServer = async (serverUrl: string) => {
        this.clearCookies(serverUrl, false);
        if (Platform.OS === 'ios') {
            // Also delete any cookies that were set by react-native-webview
            this.clearCookies(serverUrl, true);
        } else if (Platform.OS === 'android') {
            CookieManager.flush();
        }
    };

    onLogout = async ({serverUrl, removeServer}: LogoutCallbackArg) => {
        await removeServerCredentials(serverUrl);
        PushNotifications.removeServerNotifications(serverUrl);

        NetworkManager.invalidateClient(serverUrl);
        WebsocketManager.invalidateClient(serverUrl);

        const activeServerUrl = await DatabaseManager.getActiveServerUrl();
        const activeServerDisplayName = await DatabaseManager.getActiveServerDisplayName();
        if (removeServer) {
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

            relaunchApp({launchType, serverUrl, displayName}, true);
        }
    };

    onServerConfigChanged = ({serverUrl, config}: {serverUrl: string; config: ClientConfig}) => {
        this.configureAnalytics(serverUrl, config);
    };

    onServerVersionChanged = async ({serverUrl, serverVersion}: {serverUrl: string; serverVersion?: string}) => {
        const match = serverVersion?.match(/^[0-9]*.[0-9]*.[0-9]*(-[a-zA-Z0-9.-]*)?/g);
        const version = match && match[0];
        const locale = DEFAULT_LOCALE;
        const translations = getTranslations(locale);

        if (version) {
            if (semver.valid(version) && semver.lt(version, LocalConfig.MinServerVersion)) {
                Alert.alert(
                    translations[t('mobile.server_upgrade.title')],
                    translations[t('mobile.server_upgrade.description')],
                    [{
                        text: translations[t('mobile.server_upgrade.button')],
                        onPress: () => this.serverUpgradeNeeded(serverUrl),
                    }],
                    {cancelable: false},
                );
            }
        }
    };

    resetLocale = async () => {
        if (Object.keys(DatabaseManager.serverDatabases).length) {
            const serverDatabase = await DatabaseManager.getActiveServerDatabase();
            const user = await getCurrentUser(serverDatabase!);
            resetMomentLocale(user?.locale);
        } else {
            resetMomentLocale();
        }
    };

    serverUpgradeNeeded = async (serverUrl: string) => {
        const credentials = await getServerCredentials(serverUrl);

        if (credentials) {
            this.onLogout({serverUrl, removeServer: false});
        }
    };
}

export default new GlobalEventHandler();
