// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking, NativeModules, Platform} from 'react-native';
import {Navigation, NativeEventsReceiver} from 'react-native-navigation';

import {loadMe as loadMeRedux} from 'mattermost-redux/actions/users';

import {setDeepLinkURL} from 'app/actions/views/root';
import {loadMe} from 'app/actions/realm/user';
import {getAppCredentials, getCurrentServerUrl} from 'app/init/credentials';
import emmProvider from 'app/init/emm_provider';
import 'app/init/fetch';
import globalEventHandler from 'app/init/global_event_handler';
import {registerScreens} from 'app/screens';
import {configureRealmStore, configureAppStore} from 'app/store';
import ephemeralStore from 'app/store/ephemeral_store';
import telemetry from 'app/telemetry';
import pushNotificationsUtils from 'app/utils/push_notifications';

const {MattermostShare} = NativeModules;
const startedSharedExtension = Platform.OS === 'android' && MattermostShare.isOpened;
const reduxStore = configureAppStore();
let realmStore;

const init = async () => {
    const credentials = await getAppCredentials();

    ephemeralStore.currentServerUrl = await getCurrentServerUrl();
    if (ephemeralStore.currentServerUrl) {
        realmStore = configureRealmStore(ephemeralStore.currentServerUrl);
        ephemeralStore.setRealmStoreByServer(ephemeralStore.currentServerUrl, realmStore);
    }

    pushNotificationsUtils.configure(reduxStore); // TODO: figure out what to do with this once everything is on realm
    globalEventHandler.configure({
        reduxStore, // TODO same as above todo
        launchEntry,
    });

    registerScreens(reduxStore);

    if (startedSharedExtension) {
        ephemeralStore.appStarted = true;
    }

    return credentials;
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
        reduxStore.dispatch(loadMeRedux());

        if (realmStore) {
            realmStore.dispatch(loadMe());
        }

        launchChannel();
    } else {
        launchSelectServer();
    }

    telemetry.startSinceLaunch(['start:splash_screen']);
    ephemeralStore.appStarted = true;
};

const launchEntryAndAuthenticateIfNeeded = async (credentials) => {
    await emmProvider.handleManagedConfig(reduxStore);
    launchEntry(credentials);

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

new NativeEventsReceiver().appLaunched(async () => {
    const credentials = await getAppCredentials();

    ephemeralStore.currentServerUrl = await getCurrentServerUrl();

    if (startedSharedExtension) {
        ephemeralStore.appStarted = true;
        await launchEntryAndAuthenticateIfNeeded(credentials);
    } else if (credentials) {
        launchChannel(true);
    } else {
        launchSelectServer();
    }
});

init().then(async (credentials) => {
    if (!ephemeralStore.appStarted) {
        await launchEntryAndAuthenticateIfNeeded(credentials);
    }
});
