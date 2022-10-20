// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, DeviceEventEmitter, Linking} from 'react-native';
import semver from 'semver';

import LocalConfig from '@assets/config.json';
import {Events, Sso} from '@constants';
import {DEFAULT_LOCALE, getTranslations, t} from '@i18n';
import {getServerCredentials} from '@init/credentials';
import {getLaunchPropsFromDeepLink, relaunchApp} from '@init/launch';
import * as analytics from '@managers/analytics';

import type {jsAndNativeErrorHandler} from '@typings/global/error_handling';

type LinkingCallbackArg = {url: string};

class GlobalEventHandler {
    JavascriptAndNativeErrorHandler: jsAndNativeErrorHandler | undefined;

    constructor() {
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

    serverUpgradeNeeded = async (serverUrl: string) => {
        const credentials = await getServerCredentials(serverUrl);

        if (credentials) {
            DeviceEventEmitter.emit(Events.SERVER_LOGOUT, {serverUrl, removeServer: false});
        }
    };
}

export default new GlobalEventHandler();
