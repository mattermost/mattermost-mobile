// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking, NativeModules, Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {Provider} from 'react-redux';

import {loadMe} from 'mattermost-redux/actions/users';

import {resetToChannel, resetToSelectServer} from 'app/actions/navigation';
import {setDeepLinkURL} from 'app/actions/views/root';
import initialState from 'app/initial_state';
import {getAppCredentials} from 'app/init/credentials';
import emmProvider from 'app/init/emm_provider';
import 'app/init/device';
import 'app/init/fetch';
import globalEventHandler from 'app/init/global_event_handler';
import {registerScreens} from 'app/screens';
import configureStore from 'app/store';
import EphemeralStore from 'app/store/ephemeral_store';
import telemetry from 'app/telemetry';
import pushNotificationsUtils from 'app/utils/push_notifications';

const {MattermostShare} = NativeModules;
const sharedExtensionStarted = Platform.OS === 'android' && MattermostShare.isOpened;
export const store = configureStore(initialState);

const init = async () => {
    const credentials = await getAppCredentials();
    if (EphemeralStore.appStarted) {
        launchApp(credentials);
        return;
    }

    pushNotificationsUtils.configure(store);
    globalEventHandler.configure({
        store,
        launchApp,
    });

    registerScreens(store, Provider);

    if (sharedExtensionStarted) {
        EphemeralStore.appStarted = true;
    }

    if (!EphemeralStore.appStarted) {
        launchAppAndAuthenticateIfNeeded(credentials);
    }
};

const launchApp = async (credentials) => {
    telemetry.start([
        'start:select_server_screen',
        'start:channel_screen',
    ]);

    if (credentials) {
        store.dispatch(loadMe());
        store.dispatch(resetToChannel({skipMetrics: true}));
    } else {
        store.dispatch(resetToSelectServer(emmProvider.allowOtherServers));
    }

    telemetry.startSinceLaunch(['start:splash_screen']);
    EphemeralStore.appStarted = true;
};

const launchAppAndAuthenticateIfNeeded = async (credentials) => {
    await emmProvider.handleManagedConfig(store);
    await launchApp(credentials);

    if (emmProvider.enabled) {
        if (emmProvider.jailbreakProtection) {
            emmProvider.checkIfDeviceIsTrusted();
        }

        if (emmProvider.inAppPinCode) {
            await emmProvider.handleAuthentication(store);
        }
    }

    Linking.getInitialURL().then((url) => {
        store.dispatch(setDeepLinkURL(url));
    });
};

Navigation.events().registerAppLaunchedListener(() => {
    init();

    // Keep track of the latest componentId to appear
    Navigation.events().registerComponentDidAppearListener(({componentId}) => {
        EphemeralStore.addNavigationComponentId(componentId);
    });

    Navigation.events().registerComponentDidDisappearListener(({componentId}) => {
        EphemeralStore.removeNavigationComponentId(componentId);
    });
});
