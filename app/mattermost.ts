// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';
import {ComponentDidAppearEvent, ComponentDidDisappearEvent, Navigation} from 'react-native-navigation';

import {Navigation as NavigationConstants, Screens} from '@constants';
import GlobalEventHandler from '@init/global_event_handler';
import '@init/fetch';
import {initialLaunch} from '@init/launch';
import ManagedApp from '@init/managed_app';
import {registerScreens} from '@screens/index';
import EphemeralStore from '@store/ephemeral_store';

Navigation.events().registerAppLaunchedListener(() => {
    GlobalEventHandler.init();
    ManagedApp.init();
    registerNavigationListeners();
    registerScreens();
    initialLaunch();
});

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
