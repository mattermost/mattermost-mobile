// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils, {type SplitViewResult} from '@mattermost/rnutils';
import {defineMessages} from 'react-intl';
import {Alert, DeviceEventEmitter, Linking, NativeEventEmitter} from 'react-native';
import semver from 'semver';

import {switchToChannelById} from '@actions/remote/channel';
import {Device, Events, Sso} from '@constants';
import {MIN_REQUIRED_VERSION} from '@constants/supported_server';
import DatabaseManager from '@database/manager';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import {getServerCredentials} from '@init/credentials';
import {getActiveServerUrl} from '@queries/app/servers';
import {queryTeamDefaultChannel} from '@queries/servers/channel';
import {getCommonSystemValues} from '@queries/servers/system';
import {getTeamChannelHistory} from '@queries/servers/team';
import {setScreensOrientation} from '@screens/navigation';
import {alertInvalidDeepLink, parseAndHandleDeepLink} from '@utils/deep_link';
import {getIntlShape} from '@utils/general';

type LinkingCallbackArg = {url: string};

const splitViewEmitter = new NativeEventEmitter(RNUtils);

const messages = defineMessages({
    serverUpgradeTitle: {
        id: 'mobile.server_upgrade.title',
        defaultMessage: 'Server upgrade required',
    },
    serverUpgradeDescription: {
        id: 'mobile.server_upgrade.description',
        defaultMessage: '\nA server upgrade is required to use the Mattermost app. Please ask your System Administrator for details.\n',
    },
    serverUpgradeButton: {
        id: 'mobile.server_upgrade.button',
        defaultMessage: 'OK',
    },
});

class GlobalEventHandlerSingleton {
    JavascriptAndNativeErrorHandler: jsAndNativeErrorHandler | undefined;

    constructor() {
        DeviceEventEmitter.addListener(Events.SERVER_VERSION_CHANGED, this.onServerVersionChanged);
        splitViewEmitter.addListener('SplitViewChanged', this.onSplitViewChanged);
        Linking.addEventListener('url', this.onDeepLink);
    }

    init = () => {
        this.JavascriptAndNativeErrorHandler = require('@utils/error_handling').default;
        this.JavascriptAndNativeErrorHandler?.initializeErrorHandling();
    };

    onDeepLink = async (event: LinkingCallbackArg) => {
        if (event.url?.startsWith(Sso.REDIRECT_URL_SCHEME) || event.url?.startsWith(Sso.REDIRECT_URL_SCHEME_DEV)) {
            return;
        }

        if (event.url) {
            const {error} = await parseAndHandleDeepLink(event.url, undefined, undefined, true);
            if (error) {
                alertInvalidDeepLink(getIntlShape(DEFAULT_LOCALE));
            }
        }
    };

    onServerVersionChanged = async ({serverUrl, serverVersion}: {serverUrl: string; serverVersion?: string}) => {
        const match = serverVersion?.match(/^[0-9]*.[0-9]*.[0-9]*(-[a-zA-Z0-9.-]*)?/g);
        const version = match && match[0];
        const locale = DEFAULT_LOCALE;
        const translations = getTranslations(locale);

        if (version) {
            if (semver.valid(version) && semver.lt(version, MIN_REQUIRED_VERSION)) {
                Alert.alert(
                    translations[messages.serverUpgradeTitle.id],
                    translations[messages.serverUpgradeDescription.id],
                    [{
                        text: translations[messages.serverUpgradeButton.id],
                        onPress: () => this.serverUpgradeNeeded(serverUrl),
                    }],
                    {cancelable: false},
                );
            }
        }
    };

    onSplitViewChanged = async (result: SplitViewResult) => {
        if (result.isTablet != null && Device.IS_TABLET !== result.isTablet) {
            Device.IS_TABLET = result.isTablet;
            const serverUrl = await getActiveServerUrl();
            if (serverUrl && result.isTablet) {
                try {
                    const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                    const {currentChannelId, currentTeamId} = await getCommonSystemValues(database);
                    if (currentTeamId && !currentChannelId) {
                        let channelId = '';
                        const teamChannelHistory = await getTeamChannelHistory(database, currentTeamId);
                        if (teamChannelHistory.length) {
                            channelId = teamChannelHistory[0];
                        } else {
                            const defaultChannel = await queryTeamDefaultChannel(database, currentTeamId).fetch();
                            if (defaultChannel.length) {
                                channelId = defaultChannel[0].id;
                            }
                        }

                        if (channelId) {
                            switchToChannelById(serverUrl, channelId);
                        }
                    }
                } catch {
                    // do nothing, the UI will not show a channel but that is fixed when the user picks one.
                }
            }
            setScreensOrientation(result.isTablet);
        }
    };

    serverUpgradeNeeded = async (serverUrl: string) => {
        const credentials = await getServerCredentials(serverUrl);

        if (credentials) {
            DeviceEventEmitter.emit(Events.SERVER_LOGOUT, {serverUrl, removeServer: false});
        }
    };
}

const GlobalEventHandler = new GlobalEventHandlerSingleton();
export default GlobalEventHandler;
