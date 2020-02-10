// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {Provider} from 'react-redux';

import {loadMe} from 'mattermost-redux/actions/users';

import {resetToChannel, resetToSelectServer} from 'app/actions/navigation';
import {setDeepLinkURL, loadConfigAndLicense} from 'app/actions/views/root';
import {getAppCredentials} from 'app/init/credentials';
import emmProvider from 'app/init/emm_provider';
import 'app/init/device';
import 'app/init/fetch';
import globalEventHandler from 'app/init/global_event_handler';
import {registerScreens} from 'app/screens';
import store from 'app/store';
import {waitForHydration} from 'app/store/utils';
import EphemeralStore from 'app/store/ephemeral_store';
import telemetry from 'app/telemetry';
import pushNotificationsUtils from 'app/utils/push_notifications';

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

    if (!EphemeralStore.appStarted) {
        launchAppAndAuthenticateIfNeeded(credentials);
    }
};

const launchApp = (credentials) => {
    telemetry.start([
        'start:select_server_screen',
        'start:channel_screen',
    ]);

    if (credentials) {
        waitForHydration(store, async () => {
            await store.dispatch(loadConfigAndLicense());
            store.dispatch(loadMe());
            resetToChannel({skipMetrics: true});
        });
    } else {
        resetToSelectServer(emmProvider.allowOtherServers);
    }

    telemetry.startSinceLaunch(['start:splash_screen']);
    EphemeralStore.appStarted = true;

    Linking.getInitialURL().then((url) => {
        store.dispatch(setDeepLinkURL(url));
    });
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
