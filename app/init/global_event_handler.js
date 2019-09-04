// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, AppState, Dimensions, Linking, NativeModules, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import semver from 'semver';

import {setAppState, setServerVersion} from 'mattermost-redux/actions/general';
import {loadMe, logout} from 'mattermost-redux/actions/users';
import {close as closeWebSocket} from 'mattermost-redux/actions/websocket';
import {Client4} from 'mattermost-redux/client';
import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';

import {setDeviceDimensions, setDeviceOrientation, setDeviceAsTablet, setStatusBarHeight} from 'app/actions/device';
import {selectDefaultChannel} from 'app/actions/views/channel';
import {showOverlay} from 'app/actions/navigation';
import {loadConfigAndLicense, setDeepLinkURL, startDataCleanup} from 'app/actions/views/root';
import {NavigationTypes, ViewTypes} from 'app/constants';
import {getTranslations} from 'app/i18n';
import mattermostManaged from 'app/mattermost_managed';
import PushNotifications from 'app/push_notifications';
import {getCurrentLocale} from 'app/selectors/i18n';
import {t} from 'app/utils/i18n';
import {deleteFileCache} from 'app/utils/file';

import LocalConfig from 'assets/config';

import {getAppCredentials, removeAppCredentials} from './credentials';
import emmProvider from './emm_provider';

const {StatusBarManager} = NativeModules;
const PROMPT_IN_APP_PIN_CODE_AFTER = 5 * 1000;

class GlobalEventHandler {
    constructor() {
        EventEmitter.on(NavigationTypes.NAVIGATION_RESET, this.onLogout);
        EventEmitter.on(NavigationTypes.RESTART_APP, this.onRestartApp);
        EventEmitter.on(General.SERVER_VERSION_CHANGED, this.onServerVersionChanged);
        EventEmitter.on(General.CONFIG_CHANGED, this.onServerConfigChanged);
        EventEmitter.on(General.SWITCH_TO_DEFAULT_CHANNEL, this.onSwitchToDefaultChannel);
        this.turnOnInAppNotificationHandling();
        Dimensions.addEventListener('change', this.onOrientationChange);
        AppState.addEventListener('change', this.onAppStateChange);
        Linking.addEventListener('url', this.onDeepLink);
    }

    appActive = async () => {
        this.turnOnInAppNotificationHandling();

        // if the app is being controlled by an EMM provider
        if (emmProvider.enabled && emmProvider.inAppPinCode) {
            const authExpired = (Date.now() - emmProvider.inBackgroundSince) >= PROMPT_IN_APP_PIN_CODE_AFTER;

            // Once the app becomes active we check if the device needs to have a passcode set
            const prompt = emmProvider.inBackgroundSince && authExpired; // if more than 5 minutes have passed prompt for passcode
            await emmProvider.handleAuthentication(this.store, prompt);
        }

        emmProvider.inBackgroundSince = null;
    };

    appInactive = () => {
        this.turnOffInAppNotificationHandling();

        const {dispatch} = this.store;

        // When the app is sent to the background we set the time when that happens
        // and perform a data clean up to improve on performance
        emmProvider.inBackgroundSince = Date.now();

        dispatch(startDataCleanup());
    };

    configure = (opts) => {
        this.store = opts.store;
        this.launchApp = opts.launchApp;

        const window = Dimensions.get('window');
        this.onOrientationChange({window});

        this.StatusBarSizeIOS = require('react-native-status-bar-size');
        if (Platform.OS === 'ios') {
            this.StatusBarSizeIOS.addEventListener('willChange', this.onStatusBarHeightChange);

            StatusBarManager.getHeight(
                (data) => {
                    this.onStatusBarHeightChange(data.height);
                }
            );
        }

        this.JavascriptAndNativeErrorHandler = require('app/utils/error_handling').default;
        this.JavascriptAndNativeErrorHandler.initializeErrorHandling(this.store);

        mattermostManaged.addEventListener('managedConfigDidChange', this.onManagedConfigurationChange);
    };

    configureAnalytics = (config) => {
        const initAnalytics = require('app/utils/segment').init;

        if (!__DEV__ && config && config.DiagnosticsEnabled === 'true' && config.DiagnosticId && LocalConfig.SegmentApiKey) {
            initAnalytics(config);
        } else {
            global.analytics = null;
        }
    };

    onAppStateChange = (appState) => {
        const isActive = appState === 'active';
        const isBackground = appState === 'background';

        if (this.store) {
            this.store.dispatch(setAppState(isActive));
        }

        if (isActive && emmProvider.previousAppState === 'background') {
            this.appActive();
        } else if (isBackground) {
            this.appInactive();
        }

        emmProvider.previousAppState = appState;
    };

    onDeepLink = (event) => {
        const {url} = event;
        this.store.dispatch(setDeepLinkURL(url));
    };

    onManagedConfigurationChange = () => {
        emmProvider.handleManagedConfig(this.store, true);
    };

    onServerConfigChanged = (config) => {
        this.configureAnalytics(config);
    };

    onLogout = async () => {
        this.store.dispatch(closeWebSocket(false));
        this.store.dispatch(setServerVersion(''));
        deleteFileCache();
        removeAppCredentials();

        PushNotifications.clearNotifications();

        if (this.launchApp) {
            this.launchApp();
        }
    };

    onOrientationChange = (dimensions) => {
        if (this.store) {
            const {dispatch} = this.store;
            if (DeviceInfo.isTablet()) {
                dispatch(setDeviceAsTablet());
            }

            const {height, width} = dimensions.window;
            const orientation = height > width ? 'PORTRAIT' : 'LANDSCAPE';

            dispatch(setDeviceOrientation(orientation));
            dispatch(setDeviceDimensions(height, width));
        }
    };

    onRestartApp = async () => {
        await this.store.dispatch(loadConfigAndLicense());
        await this.store.dispatch(loadMe());

        const window = Dimensions.get('window');
        this.onOrientationChange({window});

        if (Platform.OS === 'ios') {
            StatusBarManager.getHeight(
                (data) => {
                    this.onStatusBarHeightChange(data.height);
                }
            );
        }

        if (this.launchApp) {
            const credentials = await getAppCredentials();
            this.launchApp(credentials);
        }
    };

    onServerVersionChanged = async (serverVersion) => {
        const {dispatch, getState} = this.store;
        const state = getState();
        const version = serverVersion.match(/^[0-9]*.[0-9]*.[0-9]*(-[a-zA-Z0-9.-]*)?/g)[0];
        const locale = getCurrentLocale(state);
        const translations = getTranslations(locale);

        if (serverVersion) {
            if (semver.valid(version) && semver.lt(version, LocalConfig.MinServerVersion)) {
                Alert.alert(
                    translations[t('mobile.server_upgrade.title')],
                    translations[t('mobile.server_upgrade.description')],
                    [{
                        text: translations[t('mobile.server_upgrade.button')],
                        onPress: this.serverUpgradeNeeded,
                    }],
                    {cancelable: false}
                );
            } else if (state.entities.users && state.entities.users.currentUserId) {
                dispatch(setServerVersion(serverVersion));
                const data = await dispatch(loadConfigAndLicense());
                this.configureAnalytics(data.config);
            }
        }
    };

    onStatusBarHeightChange = (nextStatusBarHeight) => {
        this.store.dispatch(setStatusBarHeight(nextStatusBarHeight));
    };

    onSwitchToDefaultChannel = (teamId) => {
        this.store.dispatch(selectDefaultChannel(teamId));
    };

    serverUpgradeNeeded = async () => {
        const {dispatch} = this.store;

        dispatch(setServerVersion(''));
        Client4.serverVersion = '';

        const credentials = await getAppCredentials();

        if (credentials) {
            dispatch(logout());
        }
    };

    turnOnInAppNotificationHandling = () => {
        EventEmitter.on(ViewTypes.NOTIFICATION_IN_APP, this.handleInAppNotification);
    }

    turnOffInAppNotificationHandling = () => {
        EventEmitter.off(ViewTypes.NOTIFICATION_IN_APP, this.handleInAppNotification);
    }

    handleInAppNotification = (notification) => {
        const {data} = notification;
        const {dispatch, getState} = this.store;
        const state = getState();
        const currentChannelId = getCurrentChannelId(state);

        if (data && data.channel_id !== currentChannelId) {
            const screen = 'Notification';
            const passProps = {
                notification,
            };

            EventEmitter.emit(NavigationTypes.NAVIGATION_SHOW_OVERLAY);
            dispatch(showOverlay(screen, passProps));
        }
    };
}

export default new GlobalEventHandler();
