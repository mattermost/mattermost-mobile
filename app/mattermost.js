// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Linking} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {Provider} from 'react-redux';

import EventEmitter from '@mm-redux/utils/event_emitter';

import {resetToChannel, resetToSelectServer} from '@actions/navigation';
import {setDeepLinkURL} from '@actions/views/root';
import {loadMe, logout} from '@actions/views/user';
import telemetry from 'app/telemetry';
import {NavigationTypes} from '@constants';
import {getAppCredentials} from '@init/credentials';
import emmProvider from '@init/emm_provider';
import '@init/device';
import '@init/fetch';
import globalEventHandler from '@init/global_event_handler';
import {registerScreens} from '@screens';
import configureStore from '@store';
import EphemeralStore from '@store/ephemeral_store';
import getStorage from '@store/mmkv_adapter';
import Store from '@store/store';
import {waitForHydration} from '@store/utils';
import {validatePreviousVersion} from '@utils/general';
import pushNotificationsUtils from '@utils/push_notifications';
import {captureJSException} from '@utils/sentry';

const init = async () => {
    const credentials = await getAppCredentials();
    const dt = Date.now();
    const MMKVStorage = await getStorage();

    const {store} = configureStore(MMKVStorage);
    if (EphemeralStore.appStarted) {
        launchApp(credentials);
        return;
    }

    pushNotificationsUtils.configure();
    globalEventHandler.configure({
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

    const store = Store.redux;
    if (credentials) {
        waitForHydration(store, async () => {
            const {previousVersion} = store.getState().app;
            const valid = validatePreviousVersion(previousVersion);
            if (valid) {
                store.dispatch(loadMe());
                resetToChannel({skipMetrics: true});
            } else {
                const error = new Error(`Previous app version "${previousVersion}" is invalid.`);
                captureJSException(error, false, store);
                store.dispatch(logout());
            }
        });
    } else {
        resetToSelectServer(emmProvider.allowOtherServers);
    }

    telemetry.startSinceLaunch(['start:splash_screen']);
    EphemeralStore.appStarted = true;

    Linking.getInitialURL().then((url) => {
        if (url) {
            store.dispatch(setDeepLinkURL(url));
        }
    });
};

const launchAppAndAuthenticateIfNeeded = async (credentials) => {
    await emmProvider.handleManagedConfig();
    await launchApp(credentials);

    if (emmProvider.enabled) {
        if (emmProvider.jailbreakProtection) {
            emmProvider.checkIfDeviceIsTrusted();
        }

        if (emmProvider.inAppPinCode) {
            await emmProvider.handleAuthentication();
        }
    }
};

Navigation.events().registerAppLaunchedListener(() => {
    init();

    // Keep track of the latest componentId to appear
    Navigation.events().registerComponentDidAppearListener(({componentId}) => {
        EphemeralStore.addNavigationComponentId(componentId);

        switch (componentId) {
        case 'MainSidebar':
            EventEmitter.emit(NavigationTypes.MAIN_SIDEBAR_DID_OPEN, this.handleSidebarDidOpen);
            EventEmitter.emit(Navigation.BLUR_POST_TEXTBOX);
            break;
        case 'SettingsSidebar':
            EventEmitter.emit(NavigationTypes.BLUR_POST_TEXTBOX);
            break;
        }
    });

    Navigation.events().registerComponentDidDisappearListener(({componentId}) => {
        EphemeralStore.removeNavigationComponentId(componentId);

        if (componentId === 'MainSidebar') {
            EventEmitter.emit(NavigationTypes.MAIN_SIDEBAR_DID_CLOSE);
        }
    });
});
