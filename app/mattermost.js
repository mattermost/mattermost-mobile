// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking, NativeModules, Platform} from 'react-native';
import {Navigation, NativeEventsReceiver} from 'react-native-navigation';
import {Provider} from 'react-redux';

import {loadMe} from 'mattermost-redux/actions/users';

import {setDeepLinkURL} from 'app/actions/views/root';
import initialState from 'app/initial_state';
import {getAppCredentials} from 'app/init/credentials';
import emmProvider from 'app/init/emm_provider';
import 'app/init/fetch';
import globalEventHandler from 'app/init/global_event_handler';
import {registerScreens} from 'app/screens';
import configureStore from 'app/store';
import ephemeralStore from 'app/store/ephemeral_store';
import telemetry from 'app/telemetry';
import pushNotificationsUtils from 'app/utils/push_notifications';

const {Initialization, MattermostShare} = NativeModules;
const startedSharedExtension = Platform.OS === 'android' && MattermostShare.isOpened;
const fromPushNotification = Platform.OS === 'android' && Initialization.replyFromPushNotification;
export const store = configureStore(initialState);

const init = async () => {
    const credentials = await getAppCredentials();
    pushNotificationsUtils.configure(store);
    globalEventHandler.configure({
        store,
        launchEntry,
    });

    registerScreens(store, Provider);

    if (startedSharedExtension || fromPushNotification) {
        ephemeralStore.appStarted = true;
    }

    if (!ephemeralStore.appStarted) {
        launchEntryAndAuthenticateIfNeeded(credentials);
    }
};

const launchSelectServer = () => {
    Navigation.startSingleScreenApp({
        screen: {
            screen: 'SelectServer',
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
            },
        },
        passProps: {
            allowOtherServers: emmProvider.allowOtherServers,
        },
        appStyle: {
            orientation: 'auto',
        },
        animationType: 'fade',
    });
};

const launchChannel = (skipMetrics = false) => {
    Navigation.startSingleScreenApp({
        screen: {
            screen: 'Channel',
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
            },
        },
        passProps: {
            skipMetrics,
        },
        appStyle: {
            orientation: 'auto',
        },
        animationType: 'fade',
    });
};

const launchEntry = (credentials) => {
    telemetry.start([
        'start:select_server_screen',
        'start:channel_screen',
    ]);

    if (credentials) {
        store.dispatch(loadMe());
        launchChannel();
    } else {
        launchSelectServer();
    }

    telemetry.startSinceLaunch(['start:splash_screen']);
    ephemeralStore.appStarted = true;
};

const launchEntryAndAuthenticateIfNeeded = async (credentials) => {
    await emmProvider.handleManagedConfig(store);
    launchEntry(credentials);

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

new NativeEventsReceiver().appLaunched(async () => {
    const credentials = await getAppCredentials();
    if (startedSharedExtension || fromPushNotification) {
        ephemeralStore.appStarted = true;
        await launchEntryAndAuthenticateIfNeeded(credentials);
    } else if (credentials) {
        launchChannel(true);
    } else {
        launchSelectServer();
    }
});

init();
