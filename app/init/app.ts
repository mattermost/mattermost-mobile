// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';
import {ComponentDidAppearEvent, ComponentDidDisappearEvent, ModalDismissedEvent, Navigation, ScreenPoppedEvent} from 'react-native-navigation';

import {Events, Screens} from '@constants';
import {OVERLAY_SCREENS} from '@constants/screens';
import DatabaseManager from '@database/manager';
import {getAllServerCredentials} from '@init/credentials';
import {initialLaunch} from '@init/launch';
import ManagedApp from '@init/managed_app';
import PushNotifications from '@init/push_notifications';
import GlobalEventHandler from '@managers/global_event_handler';
import NetworkManager from '@managers/network_manager';
import SessionManager from '@managers/session_manager';
import WebsocketManager from '@managers/websocket_manager';
import {registerScreens} from '@screens/index';
import NavigationStore from '@store/navigation_store';

let alreadyInitialized = false;
let serverCredentials: ServerCredential[];

export async function initialize() {
    if (!alreadyInitialized) {
        alreadyInitialized = true;
        serverCredentials = await getAllServerCredentials();
        const serverUrls = serverCredentials.map((credential) => credential.serverUrl);

        await DatabaseManager.init(serverUrls);
        await NetworkManager.init(serverCredentials);

        GlobalEventHandler.init();
        ManagedApp.init();
        SessionManager.init();
    }
}

export async function start() {
    await initialize();
    await WebsocketManager.init(serverCredentials);

    PushNotifications.init(serverCredentials.length > 0);

    registerNavigationListeners();
    registerScreens();
    initialLaunch();
}

function registerNavigationListeners() {
    Navigation.events().registerComponentDidAppearListener(screenDidAppearListener);
    Navigation.events().registerComponentDidDisappearListener(screenDidDisappearListener);
    Navigation.events().registerComponentWillAppearListener(screenWillAppear);
    Navigation.events().registerScreenPoppedListener(screenPoppedListener);
    Navigation.events().registerModalDismissedListener(modalDismissedListener);
}

function screenWillAppear({componentId}: ComponentDidAppearEvent) {
    if (componentId === Screens.HOME) {
        DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, true);
    } else if ([Screens.EDIT_POST, Screens.THREAD].includes(componentId)) {
        DeviceEventEmitter.emit(Events.PAUSE_KEYBOARD_TRACKING_VIEW, true);
    }
}

function screenDidAppearListener({componentId, componentType}: ComponentDidAppearEvent) {
    if (!OVERLAY_SCREENS.has(componentId) && componentType === 'Component') {
        NavigationStore.addNavigationComponentId(componentId);
    }
}

function screenDidDisappearListener({componentId}: ComponentDidDisappearEvent) {
    if (componentId !== Screens.HOME) {
        if ([Screens.EDIT_POST, Screens.THREAD].includes(componentId)) {
            DeviceEventEmitter.emit(Events.PAUSE_KEYBOARD_TRACKING_VIEW, false);
        }

        if (NavigationStore.getNavigationTopComponentId() === Screens.HOME) {
            DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, true);
        }
    }
}

function screenPoppedListener({componentId}: ScreenPoppedEvent) {
    NavigationStore.removeNavigationComponentId(componentId);
    if (NavigationStore.getNavigationTopComponentId() === Screens.HOME) {
        DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, true);
    }
}

function modalDismissedListener({componentId}: ModalDismissedEvent) {
    const topScreen = NavigationStore.getNavigationTopComponentId();
    const topModal = NavigationStore.getNavigationTopModalId();
    const toRemove = topScreen === topModal ? topModal : componentId;
    NavigationStore.removeNavigationModal(toRemove);
    if (NavigationStore.getNavigationTopComponentId() === Screens.HOME) {
        DeviceEventEmitter.emit(Events.TAB_BAR_VISIBLE, true);
    }
}
