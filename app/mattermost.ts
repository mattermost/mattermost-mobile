// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, Linking} from 'react-native';
import {ComponentDidAppearEvent, ComponentDidDisappearEvent, Navigation} from 'react-native-navigation';

import {Navigation as NavigationConstants, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getAppCredentials, getInternetCredentials} from '@init/credentials';
import GlobalEventHandler from '@init/global_event_handler';
import ManagedApp from '@init/managed_app';
import '@init/fetch';
import {registerScreens} from '@screens/index';
import {resetToChannel, resetToLogin, resetToSelectServer} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {parseDeepLink} from '@utils/url';


Navigation.events().registerAppLaunchedListener(() => {
    initApp();
    launchApp();
});

const initApp = () => {
    GlobalEventHandler.configure({launchApp});
    registerNavigationListeners();
    registerScreens();

    if (ManagedApp.enabled) {
        ManagedApp.processConfig();
    }
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
    const parsed = parseDeepLink(deepLinkUrl);
    if (!parsed?.serverUrl) {
        // TODO: return error?
        return;
    }

    const {serverUrl} = parsed;
    if (!DatabaseManager.isServerPresent(serverUrl)) {
        // TODO: Probably need to pass in other `parsed` values so that 
        // after adding server we navigate the user to the correct link?
        launchToAddServer(serverUrl);
        return;
    }

    // TODO: set the currentServerUrl?
    // TODO: set the active DB?

    const credentials = await getInternetCredentials(serverUrl);
    if (credentials) {
        // TODO: set the default team and channel from the deeplink
        launchToChannel();
        return;
    }

    
    resetToLogin();
}

const launchToAddServer = (serverUrl: String) => {
    // TODO: show error if allowOtherServers is false and serverUrl
    // is not equal to managed serverUrl
}

const launchToChannel = () => {
    // TODO: Fetch posts for current channel and then load user profile, etc...

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
