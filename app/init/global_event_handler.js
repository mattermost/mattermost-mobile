// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, AppState, Dimensions, Linking, NativeModules, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import semver from 'semver';

import {setAppState, setServerVersion} from 'mattermost-redux/actions/general';
import {loadMe, logout} from 'mattermost-redux/actions/users';
import {close as closeWebSocket} from 'mattermost-redux/actions/websocket';
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
import {deleteRealmStore} from 'app/store';
import ephemeralStore from 'app/store/ephemeral_store';
import {t} from 'app/utils/i18n';
import {deleteFileCache} from 'app/utils/file';

import LocalConfig from 'assets/config';

import {getAppCredentials, getCurrentServerUrl, removeAppCredentials} from './credentials';
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
            await emmProvider.handleAuthentication(this.reduxStore, prompt);
        }

        emmProvider.inBackgroundSince = null;
    };

    appInactive = () => {
        this.turnOffInAppNotificationHandling();

        const {dispatch} = this.reduxStore;

        // When the app is sent to the background we set the time when that happens
        // and perform a data clean up to improve on performance
        emmProvider.inBackgroundSince = Date.now();

        dispatch(startDataCleanup());
    };

    configure = (opts) => {
        this.reduxStore = opts.reduxStore;
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
        this.JavascriptAndNativeErrorHandler.initializeErrorHandling(this.reduxStore);

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

        if (this.reduxStore) {
            this.reduxStore.dispatch(setAppState(isActive));
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
        this.reduxStore.dispatch(setDeepLinkURL(url));
    };

    onManagedConfigurationChange = () => {
        emmProvider.handleManagedConfig(this.reduxStore, true);
    };

    onServerConfigChanged = (config) => {
        this.configureAnalytics(config);
    };

    onLogout = async () => {
        const serverUrl = await getCurrentServerUrl();
        const realm = ephemeralStore.getRealmStoreByServer(serverUrl);

        realm.getState().close();
        deleteRealmStore(serverUrl);
        this.reduxStore.dispatch(closeWebSocket(false));
        this.reduxStore.dispatch(setServerVersion(''));
        deleteFileCache(); //TODO: The cache of files should be for each individual server
        removeAppCredentials(serverUrl);

        PushNotifications.clearNotifications();

        if (this.launchApp) {
            //TODO: Select the next available server if there is one
            this.launchApp();
        }
    };

    onOrientationChange = (dimensions) => {
        if (this.reduxStore) {
            const {dispatch} = this.reduxStore;
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
        await this.reduxStore.dispatch(loadConfigAndLicense());
        await this.reduxStore.dispatch(loadMe());

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
            this.launchApp();
        }
    };

    onServerVersionChanged = async (serverVersion) => {
        const {dispatch, getState} = this.reduxStore;
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
        this.reduxStore.dispatch(setStatusBarHeight(nextStatusBarHeight));
    };

    onSwitchToDefaultChannel = (teamId) => {
        this.reduxStore.dispatch(selectDefaultChannel(teamId));
    };

    serverUpgradeNeeded = async () => {
        const {dispatch} = this.reduxStore;

        dispatch(setServerVersion(''));

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
