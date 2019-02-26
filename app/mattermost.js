// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable global-require*/
import {
    Alert,
    AppState,
    Dimensions,
    InteractionManager,
    Keyboard,
    NativeModules,
    Platform,
    YellowBox,
} from 'react-native';
const {StatusBarManager, MattermostShare, Initialization} = NativeModules;

import DeviceInfo from 'react-native-device-info';
import {Navigation, NativeEventsReceiver} from 'react-native-navigation';
import {Provider} from 'react-redux';
import semver from 'semver';

import {Client4} from 'mattermost-redux/client';
import {setAppState, setServerVersion} from 'mattermost-redux/actions/general';
import {loadMe, logout} from 'mattermost-redux/actions/users';
import {close as closeWebSocket} from 'mattermost-redux/actions/websocket';
import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {selectDefaultChannel} from 'app/actions/views/channel';
import {setDeviceDimensions, setDeviceOrientation, setDeviceAsTablet, setStatusBarHeight} from 'app/actions/device';
import {handleLoginIdChanged} from 'app/actions/views/login';
import {handleServerUrlChanged} from 'app/actions/views/select_server';
import {loadConfigAndLicense, startDataCleanup} from 'app/actions/views/root';

import initialState from 'app/initial_state';
import configureStore from 'app/store';
import {NavigationTypes} from 'app/constants';
import mattermostBucket from 'app/mattermost_bucket';
import mattermostManaged from 'app/mattermost_managed';
import {configurePushNotifications} from 'app/utils/push_notifications';
import PushNotifications from 'app/push_notifications';
import {registerScreens} from 'app/screens';
import {deleteFileCache} from 'app/utils/file';
import avoidNativeBridge from 'app/utils/avoid_native_bridge';
import {t} from 'app/utils/i18n';
import LocalConfig from 'assets/config';

import App from './app';
import './fetch_preconfig';

const AUTHENTICATION_TIMEOUT = 5 * 60 * 1000;

// Hide warnings caused by React Native (https://github.com/facebook/react-native/issues/20841)
YellowBox.ignoreWarnings(['Require cycle: node_modules/react-native/Libraries/Network/fetch.js']);

export const app = new App();
export const store = configureStore(initialState);
registerScreens(store, Provider);

const lazyLoadExternalModules = () => {
    const StatusBarSizeIOS = require('react-native-status-bar-size');
    const initializeErrorHandling = require('app/utils/error_handling').initializeErrorHandling;
    return {
        StatusBarSizeIOS,
        initializeErrorHandling,
    };
};

const lazyLoadAnalytics = () => {
    const initAnalytics = require('app/utils/segment').init;

    return {
        initAnalytics,
    };
};

const initializeModules = () => {
    const {
        StatusBarSizeIOS,
        initializeErrorHandling,
    } = lazyLoadExternalModules();
    const {
        config,
    } = store.getState().entities.general;
    const window = Dimensions.get('window');

    initializeErrorHandling();

    EventEmitter.on(NavigationTypes.NAVIGATION_RESET, handleLogout);
    EventEmitter.on(NavigationTypes.RESTART_APP, restartApp);
    EventEmitter.on(General.SERVER_VERSION_CHANGED, handleServerVersionChanged);
    EventEmitter.on(General.CONFIG_CHANGED, handleConfigChanged);
    EventEmitter.on(General.SWITCH_TO_DEFAULT_CHANNEL, handleSwithToDefaultChannel);
    Dimensions.addEventListener('change', handleOrientationChange);
    mattermostManaged.addEventListener('managedConfigDidChange', () => {
        handleManagedConfig(true);
    });

    if (config) {
        configureAnalytics(config);
    }

    handleOrientationChange({window});

    if (Platform.OS === 'ios') {
        StatusBarSizeIOS.addEventListener('willChange', handleStatusBarHeightChange);

        StatusBarManager.getHeight(
            (data) => {
                handleStatusBarHeightChange(data.height);
            }
        );
    }
};

const configureAnalytics = (config) => {
    const {
        initAnalytics,
    } = lazyLoadAnalytics();
    if (!__DEV__ && config && config.DiagnosticsEnabled === 'true' && config.DiagnosticId && LocalConfig.SegmentApiKey) {
        initAnalytics(config);
    } else {
        global.analytics = null;
    }
};

const resetBadgeAndVersion = () => {
    Client4.serverVersion = '';
    Client4.setUserId('');
    PushNotifications.setApplicationIconBadgeNumber(0);
    PushNotifications.cancelAllLocalNotifications();
    store.dispatch(setServerVersion(''));
};

const handleLogout = () => {
    // Because we can logout while being offline we reset
    // the Client online flag to true cause the network handler
    // is not available at this point
    Client4.setOnline(true);
    store.dispatch(closeWebSocket(false));

    app.setAppStarted(true);
    app.clearNativeCache();
    deleteFileCache();
    resetBadgeAndVersion();
    launchSelectServer();
};

const restartApp = async () => {
    Navigation.dismissModal({animationType: 'none'});

    try {
        await store.dispatch(loadConfigAndLicense());
        await store.dispatch(loadMe());
    } catch (e) {
        console.warn('Failed to load initial data while restarting', e); // eslint-disable-line no-console
    }

    launchChannel();
};

const handleServerVersionChanged = async (serverVersion) => {
    const {dispatch, getState} = store;
    const version = serverVersion.match(/^[0-9]*.[0-9]*.[0-9]*(-[a-zA-Z0-9.-]*)?/g)[0];
    const translations = app.getTranslations();
    const state = getState();

    if (serverVersion) {
        if (semver.valid(version) && semver.lt(version, LocalConfig.MinServerVersion)) {
            Alert.alert(
                translations[t('mobile.server_upgrade.title')],
                translations[t('mobile.server_upgrade.description')],
                [{
                    text: translations[t('mobile.server_upgrade.button')],
                    onPress: handleServerVersionUpgradeNeeded,
                }],
                {cancelable: false}
            );
        } else if (state.entities.users && state.entities.users.currentUserId) {
            dispatch(setServerVersion(serverVersion));
            const data = await dispatch(loadConfigAndLicense());
            configureAnalytics(data.config);
        }
    }
};

const handleConfigChanged = (config) => {
    configureAnalytics(config);
};

const handleServerVersionUpgradeNeeded = async () => {
    const {dispatch, getState} = store;

    resetBadgeAndVersion();

    if (getState().entities.general.credentials.token) {
        InteractionManager.runAfterInteractions(() => {
            dispatch(logout());
        });
    }
};

const handleStatusBarHeightChange = (nextStatusBarHeight) => {
    store.dispatch(setStatusBarHeight(nextStatusBarHeight));
};

const handleOrientationChange = (dimensions) => {
    const {dispatch} = store;
    if (DeviceInfo.isTablet()) {
        dispatch(setDeviceAsTablet());
    }

    const {height, width} = dimensions.window;
    const orientation = height > width ? 'PORTRAIT' : 'LANDSCAPE';

    dispatch(setDeviceOrientation(orientation));
    dispatch(setDeviceDimensions(height, width));
};

export const handleManagedConfig = async (eventFromEmmServer = false) => {
    if (app.performingEMMAuthentication) {
        return true;
    }

    const {dispatch, getState} = store;
    const state = getState();

    let authNeeded = false;
    let blurApplicationScreen = false;
    let jailbreakProtection = false;
    let vendor = null;
    let serverUrl = null;
    let username = null;

    if (LocalConfig.AutoSelectServerUrl) {
        dispatch(handleServerUrlChanged(LocalConfig.DefaultServerUrl));
        app.setAllowOtherServers(false);
    }

    try {
        const config = await avoidNativeBridge(
            () => {
                return true;
            },
            () => {
                return Initialization.managedConfig;
            },
            () => {
                return mattermostManaged.getConfig();
            }
        );

        if (config && Object.keys(config).length) {
            app.setEMMEnabled(true);
            authNeeded = config.inAppPinCode && config.inAppPinCode === 'true';
            blurApplicationScreen = config.blurApplicationScreen && config.blurApplicationScreen === 'true';
            jailbreakProtection = config.jailbreakProtection && config.jailbreakProtection === 'true';
            vendor = config.vendor || 'Mattermost';

            if (!state.entities.general.credentials.token) {
                serverUrl = config.serverUrl;
                username = config.username;

                if (config.allowOtherServers && config.allowOtherServers === 'false') {
                    app.setAllowOtherServers(false);
                }
            }

            if (jailbreakProtection) {
                const isTrusted = mattermostManaged.isTrustedDevice();

                if (!isTrusted) {
                    const translations = app.getTranslations();
                    Alert.alert(
                        translations[t('mobile.managed.blocked_by')].replace('{vendor}', vendor),
                        translations[t('mobile.managed.jailbreak')].replace('{vendor}', vendor),
                        [{
                            text: translations[t('mobile.managed.exit')],
                            style: 'destructive',
                            onPress: () => {
                                mattermostManaged.quitApp();
                            },
                        }],
                        {cancelable: false}
                    );
                    return false;
                }
            }

            if (authNeeded && !eventFromEmmServer) {
                const authenticated = await handleAuthentication(vendor);
                if (!authenticated) {
                    return false;
                }
            }

            if (blurApplicationScreen) {
                mattermostManaged.blurAppScreen(true);
            }

            if (serverUrl) {
                dispatch(handleServerUrlChanged(serverUrl));
            }

            if (username) {
                dispatch(handleLoginIdChanged(username));
            }
        }
    } catch (error) {
        return true;
    }

    return true;
};

const handleAuthentication = async (vendor) => {
    app.setPerformingEMMAuthentication(true);
    const isSecured = await mattermostManaged.isDeviceSecure();

    const translations = app.getTranslations();
    if (isSecured) {
        try {
            mattermostBucket.setPreference('emm', vendor);
            await mattermostManaged.authenticate({
                reason: translations[t('mobile.managed.secured_by')].replace('{vendor}', vendor),
                fallbackToPasscode: true,
                suppressEnterPassword: true,
            });
        } catch (err) {
            mattermostManaged.quitApp();
            return false;
        }
    }

    app.setPerformingEMMAuthentication(false);
    return true;
};

const handleSwithToDefaultChannel = (teamId) => {
    store.dispatch(selectDefaultChannel(teamId));
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
            allowOtherServers: app.allowOtherServers,
        },
        appStyle: {
            orientation: 'auto',
        },
        animationType: 'fade',
    });
};

const launchChannel = () => {
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
        appStyle: {
            orientation: 'auto',
        },
        animationType: 'fade',
    });
};

const handleAppStateChange = (appState) => {
    const isActive = appState === 'active';

    store.dispatch(setAppState(isActive));

    if (isActive) {
        handleAppActive();
        return;
    }

    handleAppInActive();
};

const handleAppActive = async () => {
    const authExpired = (Date.now() - app.inBackgroundSince) >= AUTHENTICATION_TIMEOUT;

    // This handles when the app was started in the background
    // cause of an iOS push notification reply
    if (Platform.OS === 'ios' && app.shouldRelaunchWhenActive) {
        app.launchApp();
        app.setShouldRelaunchWhenActive(false);
    }

    // Once the app becomes active after more than 5 minutes in the background and is controlled by an EMM Provider
    if (app.emmEnabled && app.inBackgroundSince && authExpired) {
        try {
            const config = await mattermostManaged.getConfig();
            const authNeeded = config.inAppPinCode && config.inAppPinCode === 'true';
            if (authNeeded) {
                await handleAuthentication(config.vendor);
            }
        } catch (error) {
            // do nothing
        }
    }

    app.setInBackgroundSince(null);
    Keyboard.dismiss();
};

const handleAppInActive = () => {
    const {dispatch, getState} = store;
    const theme = getTheme(getState());

    // When the app is sent to the background we set the time when that happens
    // and perform a data clean up to improve on performance
    app.setInBackgroundSince(Date.now());
    app.setStartupThemes(
        theme.sidebarHeaderBg,
        theme.sidebarHeaderTextColor,
        theme.centerChannelBg,
    );
    dispatch(startDataCleanup());
};

AppState.addEventListener('change', handleAppStateChange);

const launchEntry = () => {
    Navigation.startSingleScreenApp({
        screen: {
            screen: 'Entry',
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
            },
        },
        passProps: {
            initializeModules,
        },
        appStyle: {
            orientation: 'auto',
        },
        animationType: 'fade',
    });
};

configurePushNotifications();
const startedSharedExtension = Platform.OS === 'android' && MattermostShare.isOpened;
const fromPushNotification = Platform.OS === 'android' && Initialization.replyFromPushNotification;

if (startedSharedExtension || fromPushNotification) {
    // Hold on launching Entry screen
    app.setAppStarted(true);

    // Listen for when the user opens the app
    new NativeEventsReceiver().appLaunched(() => {
        app.setAppStarted(false);
        launchEntry();
    });
}

if (!app.appStarted) {
    launchEntry();
}
