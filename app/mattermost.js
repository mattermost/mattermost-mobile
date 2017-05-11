// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import 'babel-polyfill';
import Orientation from 'react-native-orientation';
import {Provider} from 'react-redux';
import {Navigation} from 'react-native-navigation';
import {
    Alert,
    AppState,
    InteractionManager
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import semver from 'semver';

import {setAppState} from 'mattermost-redux/actions/general';
import {logout} from 'mattermost-redux/actions/users';
import {Client4} from 'mattermost-redux/client';
import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {loadConfigAndLicense} from 'app/actions/views/root';
import {NavigationTypes} from 'app/constants';
import initialState from 'app/initial_state';
import {registerScreens} from 'app/screens';
import configureStore from 'app/store';

import Config from 'assets/config';

const store = configureStore(initialState);
registerScreens(store, Provider);

export default class Mattermost {
    constructor() {
        Orientation.lockToPortrait();
        this.unsubscribeFromStore = store.subscribe(this.listenForHydration);
        AppState.addEventListener('change', this.handleAppStateChange);
        EventEmitter.on(General.CONFIG_CHANGED, this.handleConfigChanged);
        EventEmitter.on(NavigationTypes.NAVIGATION_RESET, this.handleReset);

        this.handleAppStateChange(AppState.currentState);
        Client4.setUserAgent(DeviceInfo.getUserAgent());
    }

    handleAppStateChange = (appState) => {
        const {dispatch, getState} = store;
        setAppState(appState === 'active')(dispatch, getState);
    };

    handleConfigChanged = (serverVersion) => {
        const {dispatch, getState} = store;
        const version = serverVersion.match(/^[0-9]*.[0-9]*.[0-9]*(-[a-zA-Z0-9.-]*)?/g)[0];
        if (serverVersion) {
            if (semver.valid(version) && semver.lt(version, Config.MinServerVersion)) {
                Alert.alert(
                    'Server upgrade required',
                    'A server upgrade is required to use the Mattermost app. Please ask your System Administrator for details.',
                    [{
                        text: 'OK',
                        onPress: this.handleVersionUpgrade
                    }]
                );
            } else {
                loadConfigAndLicense(serverVersion)(dispatch, getState);
            }
        }
    };

    handleReset = () => {
        Client4.serverVersion = '';
        this.startApp('fade');
    };

    handleVersionUpgrade = async () => {
        const {dispatch, getState} = store;

        // const {closeDrawers, logout, unrenderDrawer} = this.props.actions;

        Client4.serverVersion = '';

        // closeDrawers();
        // unrenderDrawer();
        if (getState().entities.general.credentials.token) {
            InteractionManager.runAfterInteractions(() => {
                logout()(dispatch, getState);
            });
        }
    };

    // We need to wait for hydration to occur before load the router.
    listenForHydration = () => {
        const state = store.getState();
        if (state.views.root.hydrationComplete) {
            this.unsubscribeFromStore();
            this.startApp();
        }
    };

    startApp = (animationType = 'none') => {
        Navigation.startSingleScreenApp({
            screen: {
                screen: 'Root',
                navigatorStyle: {
                    navBarHidden: true,
                    statusBarHidden: false,
                    statusBarHideWithNavBar: false
                }
            },
            animationType
        });
    };
}
