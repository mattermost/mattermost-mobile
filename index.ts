// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, LogBox} from 'react-native';
import {RUNNING_E2E} from 'react-native-dotenv';
import 'react-native-gesture-handler';
import {ComponentDidAppearEvent, ComponentDidDisappearEvent, ModalDismissedEvent, Navigation, ScreenPoppedEvent} from 'react-native-navigation';

import {Events, Screens} from './app/constants';
import DatabaseManager from './app/database/manager';
import {getAllServerCredentials} from './app/init/credentials';
import {initialLaunch} from './app/init/launch';
import ManagedApp from './app/init/managed_app';
import PushNotifications from './app/init/push_notifications';
import GlobalEventHandler from './app/managers/global_event_handler';
import NetworkManager from './app/managers/network_manager';
import WebsocketManager from './app/managers/websocket_manager';
import {registerScreens} from './app/screens';
import EphemeralStore from './app/store/ephemeral_store';
import setFontFamily from './app/utils/font_family';
import './app/utils/emoji'; // Imported to ensure it is loaded when used

declare const global: { HermesInternal: null | {} };

if (__DEV__) {
    LogBox.ignoreLogs([
        '`-[RCTRootView cancelTouches]`',
        'scaleY',
        "[react-native-gesture-handler] Seems like you're using an old API with gesture components, check out new Gestures system!",
        'new NativeEventEmitter',
        'ViewPropTypes will be removed from React Native',
    ]);

    // Ignore all notifications if running e2e
    const isRunningE2e = RUNNING_E2E === 'true';
    // eslint-disable-next-line no-console
    console.log(`RUNNING_E2E: ${RUNNING_E2E}, isRunningE2e: ${isRunningE2e}`);
    if (isRunningE2e) {
        LogBox.ignoreAllLogs(true);
    }
}

setFontFamily();

if (global.HermesInternal) {
    // Polyfills required to use Intl with Hermes engine
    require('@formatjs/intl-getcanonicallocales/polyfill');
    require('@formatjs/intl-locale/polyfill');
    require('@formatjs/intl-pluralrules/polyfill');
    require('@formatjs/intl-numberformat/polyfill');
    require('@formatjs/intl-datetimeformat/polyfill');
    require('@formatjs/intl-datetimeformat/add-golden-tz');
}

let alreadyInitialized = false;
Navigation.events().registerAppLaunchedListener(async () => {
    // See caution in the library doc https://wix.github.io/react-native-navigation/docs/app-launch#android
    if (!alreadyInitialized) {
        alreadyInitialized = true;
        GlobalEventHandler.init();
        ManagedApp.init();
        registerNavigationListeners();
        registerScreens();

        const serverCredentials = await getAllServerCredentials();
        const serverUrls = serverCredentials.map((credential) => credential.serverUrl);

        await DatabaseManager.init(serverUrls);
        await NetworkManager.init(serverCredentials);
        await WebsocketManager.init(serverCredentials);
        PushNotifications.init();
    }

    initialLaunch();
});

const registerNavigationListeners = () => {
    Navigation.events().registerComponentDidAppearListener(screenDidAppearListener);
    Navigation.events().registerComponentDidDisappearListener(screenDidDisappearListener);
    Navigation.events().registerComponentWillAppearListener(screenWillAppear);
    Navigation.events().registerScreenPoppedListener(screenPoppedListener);
    Navigation.events().registerModalDismissedListener(modalDismissedListener);
};

function screenWillAppear({componentId}: ComponentDidAppearEvent) {
    if (componentId === Screens.HOME) {
        DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, true);
    } else if ([Screens.EDIT_POST, Screens.THREAD].includes(componentId)) {
        DeviceEventEmitter.emit(Events.PAUSE_KEYBOARD_TRACKING_VIEW, true);
    }
}

function screenDidAppearListener({componentId, passProps, componentType}: ComponentDidAppearEvent) {
    if (!(passProps as any)?.overlay && componentType === 'Component') {
        EphemeralStore.addNavigationComponentId(componentId);
    }
}

function screenDidDisappearListener({componentId}: ComponentDidDisappearEvent) {
    if (componentId !== Screens.HOME) {
        if ([Screens.EDIT_POST, Screens.THREAD].includes(componentId)) {
            DeviceEventEmitter.emit(Events.PAUSE_KEYBOARD_TRACKING_VIEW, false);
        }

        if (EphemeralStore.getNavigationTopComponentId() === Screens.HOME) {
            DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, true);
        }
    }
}

function screenPoppedListener({componentId}: ScreenPoppedEvent) {
    EphemeralStore.removeNavigationComponentId(componentId);
    if (EphemeralStore.getNavigationTopComponentId() === Screens.HOME) {
        DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, true);
    }
}

function modalDismissedListener({componentId}: ModalDismissedEvent) {
    const topScreen = EphemeralStore.getNavigationTopComponentId();
    const topModal = EphemeralStore.getNavigationTopModalId();
    const toRemove = topScreen === topModal ? topModal : componentId;
    EphemeralStore.removeNavigationModal(toRemove);
    if (EphemeralStore.getNavigationTopComponentId() === Screens.HOME) {
        DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, true);
    }
}
