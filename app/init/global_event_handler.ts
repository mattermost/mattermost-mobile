// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, DeviceEventEmitter, Linking, Platform} from 'react-native';
import CookieManager, {Cookie} from '@react-native-community/cookies';
import {FileSystem} from 'react-native-unimodules';
import semver from 'semver';

import LocalConfig from '@assets/config.json';
import {Navigation} from '@constants';
import {DEFAULT_LOCALE, getTranslations, resetMomentLocale, t} from '@i18n';
import * as analytics from '@init/analytics';
import {getAppCredentials, removeAppCredentials} from '@init/credentials';
import PushNotifications from '@init/push_notifications';
import {deleteFileCache} from '@utils/file';

type LinkingCallbackArg = {url: string};

class GlobalEventHandler {
    launchApp: launchAppFunc | undefined;
    JavascriptAndNativeErrorHandler: jsAndNativeErrorHandler | undefined;

    constructor() {
        DeviceEventEmitter.addListener(Navigation.NAVIGATION_RESET, this.onLogout);

        // DeviceEventEmitter.addListener(General.SERVER_VERSION_CHANGED, this.onServerVersionChanged);
        // DeviceEventEmitter.addListener(General.CONFIG_CHANGED, this.onServerConfigChanged);

        Linking.addEventListener('url', this.onDeepLink);
    }

    configure = (opts: GlobalEventHandlerOpts) => {
        this.launchApp = opts.launchApp;

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
        const {url} = event;
        if (url) {
            // TODO: Handle deeplink
            // if server is not added go to add new server screen
            // if server is added but no credentials found take to server login screen
        }
    };

    clearCookies = async (serverUrl: string | undefined, webKit: boolean) => {
        try {
            if (serverUrl) {
                const cookies = await CookieManager.get(serverUrl, webKit);
                const values = Object.values(cookies);
                values.forEach((cookie: Cookie) => {
                    CookieManager.clearByName(serverUrl, cookie.name, webKit);
                });
            } else {
                await CookieManager.clearAll(webKit);
            }
        } catch (error) {
            // Nothing to clear
        }
    }

    clearCookiesAndWebData = async (serverUrl?: string) => {
        this.clearCookies(serverUrl, false);
        if (Platform.OS === 'ios') {
            // Also delete any cookies that were set by react-native-webview
            this.clearCookies(serverUrl, true);
        }

        // TODO: Only execute this if there are no more servers
        switch (Platform.OS) {
            case 'ios': {
                const mainPath = FileSystem.documentDirectory?.split('/').slice(0, -1).join('/');
                const libraryDir = `${mainPath}/Library`;
                const cookiesDir = `${libraryDir}/Cookies`;
                const cookies = await FileSystem.getInfoAsync(cookiesDir);
                const webkitDir = `${libraryDir}/WebKit`;
                const webkit = await FileSystem.getInfoAsync(webkitDir);

                if (cookies.exists) {
                    FileSystem.deleteAsync(cookiesDir);
                }

                if (webkit.exists) {
                    FileSystem.deleteAsync(webkitDir);
                }
                break;
            }

            case 'android': {
                const cacheDir = FileSystem.cacheDirectory;
                const mainPath = cacheDir?.split('/').slice(0, -1).join('/');
                const cookies = await FileSystem.getInfoAsync(`${mainPath}/app_webview/Cookies`);
                const cookiesJ = await FileSystem.getInfoAsync(`${mainPath}/app_webview/Cookies-journal`);
                if (cookies.exists) {
                    FileSystem.deleteAsync(`${mainPath}/app_webview/Cookies`);
                }

                if (cookiesJ.exists) {
                    FileSystem.deleteAsync(`${mainPath}/app_webview/Cookies-journal`);
                }
                break;
            }
        }
    };

    onLogout = async (serverUrl: string) => {
        // TODO: Close and invalidate ApiClient & WebSocket client

        const analyticsClient = analytics.get(serverUrl);
        if (analyticsClient) {
            analyticsClient.reset();
            analytics.invalidate(serverUrl);
        }

        // TODO: remove credentials and files for the server
        removeAppCredentials();
        deleteFileCache();
        PushNotifications.clearNotifications();

        // TODO: Only execute this if there are no more servers
        // in case there are other servers switch to the appropriate locale
        resetMomentLocale();

        await this.clearCookiesAndWebData();

        if (this.launchApp) {
            this.launchApp(true);
        }

        // TODO: Remove the database
    };

    onServerConfigChanged = (serverUrl: string, config: ClientConfig) => {
        this.configureAnalytics(serverUrl, config);

        // TODO: Add minimum server version checked with cloud support
        // if (isMinimumServerVersion(Client4.serverVersion, 5, 24) && config.ExtendSessionLengthWithActivity === 'true') {
        //     PushNotifications.cancelAllLocalNotifications();
        // }
    };

    onServerVersionChanged = async (serverUrl: string, serverVersion?: string) => {
        const match = serverVersion?.match(/^[0-9]*.[0-9]*.[0-9]*(-[a-zA-Z0-9.-]*)?/g);
        const version = match && match[0];
        const locale = DEFAULT_LOCALE;
        const translations = getTranslations(locale);

        // TODO: Handle when the server is cloud
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

            // TODO: Set server version in client and
            // reload config and license unless done somewhere else
        }
    };

    serverUpgradeNeeded = async (serverUrl: string) => {
        const credentials = await getAppCredentials();

        if (credentials) {
            this.onLogout(serverUrl);
        }
    };
}

export default new GlobalEventHandler();
