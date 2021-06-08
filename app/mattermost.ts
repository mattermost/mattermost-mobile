// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, Linking} from 'react-native';
import {ComponentDidAppearEvent, ComponentDidDisappearEvent, Navigation} from 'react-native-navigation';

import {Navigation as NavigationConstants, Screens} from '@constants';
import {getAppCredentials, getInternetCredentials} from '@init/credentials';
import GlobalEventHandler from '@init/global_event_handler';
import ManagedApp from '@init/managed_app';
import '@init/fetch';
import {registerScreens} from '@screens/index';
import {resetToChannel, resetToSelectServer} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {parseDeepLink} from '@utils/url';
import { createAndSetActiveDatabase } from './utils/database';

Navigation.events().registerAppLaunchedListener(() => {
    // TODO: is this called when MattermostShare is launched? If so
    // don't do any of the below?

    initApp();
    launchApp();
});

const initApp = () => {
    GlobalEventHandler.configure({launchApp});
    registerNavigationListeners();
    registerScreens();
};

const launchApp = async () => {
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
        launchFromDeepLink(initialUrl);
        return;
    }
    
    const credentials = await getAppCredentials();
    if (credentials) {
        launchToChannel();
        return;
    }
    
    resetToSelectServer();
};

const launchFromDeepLink = async (deepLinkUrl: string) => {
    // TODO: the same will be needed for launching from push notification, however,
    // with push notifications the current payload does not include the server URL.
    // We'll do the following on the native side:
    // 1. Payload includes server URL (need server change), proceed to process push notif
    // 2. Only one server DB exists: add the server URL to the payload, proceed to process push notif
    // 3. Multiple servers exist: override payload with warning, proceed to process push notif
    // On the JS side, once the push notification is opened if there is no server URL do nothing

    const parsedDeeplink = parseDeepLink(deepLinkUrl);
    if (!parsedDeeplink?.serverUrl) {
        // TODO: display error to user?
        return;
    }

    const {serverUrl} = parsedDeeplink;
    if (ManagedApp.enabled && !ManagedApp.allowOtherServers && ManagedApp.serverUrl !== serverUrl) {
        // TODO: display error to user?
        return;
    }

    const credentials = await getInternetCredentials(serverUrl);
    if (credentials) {
        launchToChannel(parsedDeeplink);
        return;
    }

    resetToSelectServer(parsedDeeplink);
}

const launchToChannel = (options: LaunchOptions = {}) => {
    if (options.serverUrl) {
        createAndSetActiveDatabase(options.serverUrl);
    }

    // TODO: Given launch options, fetch posts for channel and then load user profile, etc...

    // eslint-disable-next-line no-console
    console.log('Launch app in Channel screen');
    const passProps = {skipMetrics: true};
    resetToChannel(passProps);
}

const registerNavigationListeners = () => {
    Navigation.events().registerComponentDidAppearListener(componentDidAppearListener);
    Navigation.events().registerComponentDidDisappearListener(componentDidDisappearListener);
}

function componentDidAppearListener({componentId}: ComponentDidAppearEvent) {
    EphemeralStore.addNavigationComponentId(componentId);

    switch (componentId) {
        case 'MainSidebar':
            DeviceEventEmitter.emit(NavigationConstants.MAIN_SIDEBAR_DID_OPEN, this.handleSidebarDidOpen);
            DeviceEventEmitter.emit(NavigationConstants.BLUR_POST_DRAFT);
            break;
        case 'SettingsSidebar':
            DeviceEventEmitter.emit(NavigationConstants.BLUR_POST_DRAFT);
            break;
    }
}

function componentDidDisappearListener({componentId}: ComponentDidDisappearEvent) {
    if (componentId !== Screens.CHANNEL) {
        EphemeralStore.removeNavigationComponentId(componentId);
    }

    if (componentId === 'MainSidebar') {
        DeviceEventEmitter.emit(NavigationConstants.MAIN_SIDEBAR_DID_CLOSE);
    }
}
