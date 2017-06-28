// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import 'babel-polyfill';
import Orientation from 'react-native-orientation';
import {Provider} from 'react-redux';
import {Navigation} from 'react-native-navigation';
import {IntlProvider} from 'react-intl';
import {
    Alert,
    AppState,
    InteractionManager,
    Platform
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {setJSExceptionHandler} from 'react-native-exception-handler';
import semver from 'semver';

import {setAppState, setDeviceToken, setServerVersion} from 'mattermost-redux/actions/general';
import {markChannelAsRead} from 'mattermost-redux/actions/channels';
import {logError} from 'mattermost-redux/actions/errors';
import {logout} from 'mattermost-redux/actions/users';
import {Client4} from 'mattermost-redux/client';
import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {goToNotification, loadConfigAndLicense, queueNotification} from 'app/actions/views/root';
import {setChannelDisplayName} from 'app/actions/views/channel';
import {NavigationTypes, ViewTypes} from 'app/constants';
import {getTranslations} from 'app/i18n';
import initialState from 'app/initial_state';
import PushNotifications from 'app/push_notifications';
import {registerScreens} from 'app/screens';
import configureStore from 'app/store';

import Config from 'assets/config';

const store = configureStore(initialState);
registerScreens(store, Provider);

export default class Mattermost {
    constructor() {
        this.isConfigured = false;
        setJSExceptionHandler(this.errorHandler, true);
        Orientation.lockToPortrait();
        this.unsubscribeFromStore = store.subscribe(this.listenForHydration);
        AppState.addEventListener('change', this.handleAppStateChange);
        EventEmitter.on(General.CONFIG_CHANGED, this.handleConfigChanged);
        EventEmitter.on(NavigationTypes.NAVIGATION_RESET, this.handleReset);
        EventEmitter.on(General.DEFAULT_CHANNEL, this.handleResetDisplayName);
        EventEmitter.on(NavigationTypes.RESTART_APP, this.restartApp);

        this.handleAppStateChange(AppState.currentState);
        Client4.setUserAgent(DeviceInfo.getUserAgent());
    }

    errorHandler = (e, isFatal) => {
        const intl = this.getIntl();
        logError(e)(store.dispatch);

        if (isFatal) {
            Alert.alert(
                intl.formatMessage({id: 'mobile.error_handler.title', defaultMessage: 'Unexpected error occurred'}),
                intl.formatMessage({id: 'mobile.error_handler.description', defaultMessage: '\nClick relaunch to open the app again. After restart, you can report the problem from the settings menu.\n'}),
                [{
                    text: intl.formatMessage({id: 'mobile.error_handler.button', defaultMessage: 'Relaunch'}),
                    onPress: () => {
                        // purge the store
                        store.dispatch({type: General.OFFLINE_STORE_PURGE});
                    }
                }],
                {cancelable: false}
            );
        }
    };

    getIntl = () => {
        const state = store.getState();
        let locale = DeviceInfo.getDeviceLocale().split('-')[0];
        if (state.views.i18n.locale) {
            locale = state.views.i18n.locale;
        }

        const intlProvider = new IntlProvider({locale, messages: getTranslations(locale)}, {});
        const {intl} = intlProvider.getChildContext();
        return intl;
    };

    handleAppStateChange = (appState) => {
        const {dispatch, getState} = store;
        setAppState(appState === 'active')(dispatch, getState);
    };

    handleConfigChanged = (serverVersion) => {
        const {dispatch, getState} = store;
        const version = serverVersion.match(/^[0-9]*.[0-9]*.[0-9]*(-[a-zA-Z0-9.-]*)?/g)[0];
        const intl = this.getIntl();

        if (serverVersion) {
            if (semver.valid(version) && semver.lt(version, Config.MinServerVersion)) {
                Alert.alert(
                    intl.formatMessage({id: 'mobile.server_upgrade.title', defaultMessage: 'Server upgrade required'}),
                    intl.formatMessage({id: 'mobile.server_upgrade.description', defaultMessage: '\nA server upgrade is required to use the Mattermost app. Please ask your System Administrator for details.\n'}),
                    [{
                        text: intl.formatMessage({id: 'mobile.server_upgrade.button', defaultMessage: 'OK'}),
                        onPress: this.handleVersionUpgrade
                    }],
                    {cancelable: false}
                );
            } else {
                setServerVersion('')(dispatch, getState);
                loadConfigAndLicense(serverVersion)(dispatch, getState);
            }
        }
    };

    handleReset = () => {
        const {dispatch, getState} = store;
        Client4.serverVersion = '';
        PushNotifications.cancelAllLocalNotifications();
        setServerVersion('')(dispatch, getState);
        this.startApp('fade');
    };

    handleResetDisplayName = (displayName) => {
        store.dispatch(setChannelDisplayName(displayName));
    };

    handleVersionUpgrade = async () => {
        const {dispatch, getState} = store;

        Client4.serverVersion = '';
        PushNotifications.setApplicationIconBadgeNumber(0);

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

    configurePushNotifications = () => {
        PushNotifications.configure({
            onRegister: this.onRegisterDevice,
            onNotification: this.onPushNotification,
            popInitialNotification: true,
            requestPermissions: true
        });
    };

    onRegisterDevice = (data) => {
        const prefix = Platform.OS === 'ios' ? General.PUSH_NOTIFY_APPLE_REACT_NATIVE : General.PUSH_NOTIFY_ANDROID_REACT_NATIVE;
        const {dispatch, getState} = store;
        setDeviceToken(`${prefix}:${data.token}`)(dispatch, getState);
        this.isConfigured = true;
    };

    onPushNotification = (deviceNotification) => {
        const {data, foreground, message, userInfo, userInteraction} = deviceNotification;
        const {dispatch, getState} = store;
        const state = getState();
        const notification = {
            data,
            message
        };

        if (userInfo) {
            notification.localNotification = userInfo.localNotification;
        }

        if (data.type === 'clear') {
            markChannelAsRead(data.channel_id)(dispatch, getState);
        } else if (foreground) {
            EventEmitter.emit(ViewTypes.NOTIFICATION_IN_APP, notification);
        } else if (userInteraction) {
            if (!notification.localNotification) {
                if (!state.views.root.appInitializing) {
                    // go to notification if the app is initialized
                    goToNotification(notification)(dispatch, getState);
                    EventEmitter.emit(ViewTypes.NOTIFICATION_TAPPED);
                } else if (state.entities.general.credentials.token) {
                    // queue notification if app is not initialized but we are logged in
                    queueNotification(notification)(dispatch, getState);
                }
            }
        }
    };

    restartApp = () => {
        Navigation.dismissModal({animationType: 'none'});
        this.startApp('fade');
    };

    startApp = (animationType = 'none') => {
        if (!this.isConfigured) {
            this.configurePushNotifications();
        }

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
