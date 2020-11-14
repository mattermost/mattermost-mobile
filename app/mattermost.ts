// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, Linking} from 'react-native';
import {ComponentDidAppearEvent, ComponentDidDisappearEvent, Navigation} from 'react-native-navigation';

import {Navigation as NavigationConstants, Screens} from '@constants';
import {getAppCredentials} from '@init/credentials';
import emmProvider from '@init/emm_provider';
import globalEventHandler from '@init/global_event_handler';
import {registerScreens} from '@screens/index';
import {resetToChannel, resetToSelectServer} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';

const init = () => {
    if (EphemeralStore.appStarted) {
        launchApp(true);
        return;
    }

    globalEventHandler.configure({
        launchApp,
    });

    registerScreens();

    if (!EphemeralStore.appStarted) {
        launchApp(false);
    }
};

const launchApp = async (skipEmm: boolean) => {
    if (!skipEmm) {
        await emmProvider.handleManagedConfig();
        if (emmProvider.enabled) {
            if (emmProvider.jailbreakProtection) {
                emmProvider.checkIfDeviceIsTrusted();
            }

            if (emmProvider.inAppPinCode) {
                await emmProvider.handleAuthentication();
            }
        }
    }

    Linking.getInitialURL().then((url) => {
        if (url) {
            // TODO: Handle deeplink
            // if server is not added go to add new server screen
            // if server is added but no credentials found take to server login screen
        }
    });

    const credentials = await getAppCredentials();
    if (credentials) {
        // TODO: Fetch posts for current channel and then load user profile, etc..

        // eslint-disable-next-line no-console
        console.log('Launch app in Channel screen');
        resetToChannel({skipMetrics: true});
    } else {
        resetToSelectServer(emmProvider.allowOtherServers);
    }

    EphemeralStore.appStarted = true;
};

Navigation.events().registerAppLaunchedListener(() => {
    init();

    // Keep track of the latest componentId to appear/disappear
    Navigation.events().registerComponentDidAppearListener(componentDidAppearListener);
    Navigation.events().registerComponentDidDisappearListener(componentDidDisappearListener);
});

export function componentDidAppearListener({componentId}: ComponentDidAppearEvent) {
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

export function componentDidDisappearListener({componentId}: ComponentDidDisappearEvent) {
    if (componentId !== Screens.CHANNEL) {
        EphemeralStore.removeNavigationComponentId(componentId);
    }

    if (componentId === 'MainSidebar') {
        DeviceEventEmitter.emit(NavigationConstants.MAIN_SIDEBAR_DID_CLOSE);
    }
}
