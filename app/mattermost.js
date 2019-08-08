// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking, NativeModules, Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {loadMe as loadMeRedux} from 'mattermost-redux/actions/users';

import {resetToChannel, resetToSelectServer} from 'app/actions/navigation';
import {setDeepLinkURL} from 'app/actions/views/root';
import {loadMe} from 'app/realm/actions/user';
import {getAppCredentials, getCurrentServerUrl} from 'app/init/credentials';
import emmProvider from 'app/init/emm_provider';
import 'app/init/device';
import 'app/init/fetch';
import globalEventHandler from 'app/init/global_event_handler';
import pushNotificationsHandler from 'app/init/push_notifications_handler';
import {registerScreens} from 'app/screens';
import {configureRealmStore, configureAppStore} from 'app/store';
import ephemeralStore from 'app/store/ephemeral_store';
import telemetry from 'app/telemetry';

const {MattermostShare} = NativeModules;
const sharedExtensionStarted = Platform.OS === 'android' && MattermostShare.isOpened;
const reduxStore = configureAppStore();
let realmStore;

const init = async () => {
    ephemeralStore.currentServerUrl = await getCurrentServerUrl();
    if (ephemeralStore.currentServerUrl) {
        realmStore = configureRealmStore(ephemeralStore.currentServerUrl);
        ephemeralStore.setRealmStoreByServer(ephemeralStore.currentServerUrl, realmStore);
    } else {
        realmStore = configureRealmStore();
    }

    if (ephemeralStore.appStarted) {
        launchApp();
        return;
    }

    pushNotificationsHandler.configure(reduxStore);
    globalEventHandler.configure({
        reduxStore,
        launchApp,
    });

    registerScreens(reduxStore);

    if (sharedExtensionStarted) {
        ephemeralStore.appStarted = true;
    }

    if (!ephemeralStore.appStarted) {
        launchAppAndAuthenticateIfNeeded();
    }
};

const launchApp = async () => {
    telemetry.start([
        'start:select_server_screen',
        'start:channel_screen',
    ]);

    const credentials = await getAppCredentials();
    if (credentials) {
        reduxStore.dispatch(loadMeRedux());

        if (realmStore) {
            realmStore.dispatch(loadMe());
        }

        realmStore.dispatch(resetToChannel({skipMetrics: true}));
    } else {
        realmStore.dispatch(resetToSelectServer(emmProvider.allowOtherServers));
    }

    telemetry.startSinceLaunch(['start:splash_screen']);
    ephemeralStore.appStarted = true;
};

const launchAppAndAuthenticateIfNeeded = async () => {
    await emmProvider.handleManagedConfig(reduxStore);
    await launchApp();

    if (emmProvider.enabled) {
        if (emmProvider.jailbreakProtection) {
            emmProvider.checkIfDeviceIsTrusted();
        }

        if (emmProvider.inAppPinCode) {
            await emmProvider.handleAuthentication(reduxStore);
        }
    }

    Linking.getInitialURL().then((url) => {
        reduxStore.dispatch(setDeepLinkURL(url));
    });
};

Navigation.events().registerAppLaunchedListener(() => {
    init();

    // Keep track of the latest componentId to appear
    Navigation.events().registerComponentDidAppearListener(({componentId}) => {
        ephemeralStore.addNavigationComponentId(componentId);
    });

    Navigation.events().registerComponentDidDisappearListener(({componentId}) => {
        ephemeralStore.removeNavigationComponentId(componentId);
    });
});
