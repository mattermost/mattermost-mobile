// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, AppState, Dimensions, Linking, NativeModules, Platform} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import CookieManager from '@react-native-community/cookies';
import DeviceInfo from 'react-native-device-info';
import {getLocales} from 'react-native-localize';
import RNFetchBlob from 'rn-fetch-blob';
import semver from 'semver/preload';

import {setDeviceDimensions, setDeviceOrientation, setDeviceAsTablet, setStatusBarHeight} from '@actions/device';
import {selectDefaultChannel} from '@actions/views/channel';
import {showOverlay} from '@actions/navigation';
import {loadConfigAndLicense, setDeepLinkURL, startDataCleanup} from '@actions/views/root';
import {loadMe, logout} from '@actions/views/user';
import LocalConfig from '@assets/config';
import {NavigationTypes, ViewTypes} from '@constants';
import {getTranslations, resetMomentLocale} from '@i18n';
import {setAppState, setServerVersion} from '@mm-redux/actions/general';
import {getTeams} from '@mm-redux/actions/teams';
import {autoUpdateTimezone} from '@mm-redux/actions/timezone';
import {close as closeWebSocket} from '@actions/websocket';
import {Client4} from '@mm-redux/client';
import {General} from '@mm-redux/constants';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getCurrentUser, getUser} from '@mm-redux/selectors/entities/users';
import {isTimezoneEnabled} from '@mm-redux/selectors/entities/timezone';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {getCurrentLocale} from '@selectors/i18n';
import initialState from '@store/initial_state';
import Store from '@store/store';
import {t} from '@utils/i18n';
import {deleteFileCache} from '@utils/file';
import {getDeviceTimezone} from '@utils/timezone';

import mattermostBucket from 'app/mattermost_bucket';
import mattermostManaged from 'app/mattermost_managed';
import PushNotifications from 'app/push_notifications';

import {getAppCredentials, removeAppCredentials} from './credentials';
import emmProvider from './emm_provider';

const {StatusBarManager} = NativeModules;
const PROMPT_IN_APP_PIN_CODE_AFTER = 5 * 1000;

let analytics;

class GlobalEventHandler {
    constructor() {
        this.pushNotificationListener = false;

        EventEmitter.on(NavigationTypes.NAVIGATION_RESET, this.onLogout);
        EventEmitter.on(NavigationTypes.RESTART_APP, this.onRestartApp);
        EventEmitter.on(General.SERVER_VERSION_CHANGED, this.onServerVersionChanged);
        EventEmitter.on(General.CONFIG_CHANGED, this.onServerConfigChanged);
        EventEmitter.on(General.SWITCH_TO_DEFAULT_CHANNEL, this.onSwitchToDefaultChannel);
        Dimensions.addEventListener('change', this.onOrientationChange);
        AppState.addEventListener('change', this.onAppStateChange);
        Linking.addEventListener('url', this.onDeepLink);
    }

    appActive = async () => {
        this.turnOnInAppNotificationHandling();
        this.setUserTimezone();

        // if the app is being controlled by an EMM provider
        if (emmProvider.enabled && emmProvider.inAppPinCode) {
            const authExpired = (Date.now() - emmProvider.inBackgroundSince) >= PROMPT_IN_APP_PIN_CODE_AFTER;

            // Once the app becomes active we check if the device needs to have a passcode set
            const prompt = emmProvider.inBackgroundSince && authExpired; // if more than 5 minutes have passed prompt for passcode
            await emmProvider.handleAuthentication(prompt);
        }

        emmProvider.inBackgroundSince = null; /* eslint-disable-line require-atomic-updates */
    };

    appInactive = () => {
        this.turnOffInAppNotificationHandling();

        const {dispatch} = Store.redux;

        // When the app is sent to the background we set the time when that happens
        // and perform a data clean up to improve on performance
        emmProvider.inBackgroundSince = Date.now();

        dispatch(startDataCleanup());
    };

    configure = (opts) => {
        this.launchApp = opts.launchApp;

        // onAppStateChange may be called by the AppState listener before we
        // configure the global event handler so we manually call it here
        this.onAppStateChange('active');

        const window = Dimensions.get('window');
        this.onOrientationChange({window});

        this.StatusBarSizeIOS = require('react-native-status-bar-size');
        if (Platform.OS === 'ios') {
            this.StatusBarSizeIOS.addEventListener('willChange', this.onStatusBarHeightChange);

            StatusBarManager.getHeight(
                (data) => {
                    this.onStatusBarHeightChange(data.height);
                },
            );
        }

        this.JavascriptAndNativeErrorHandler = require('app/utils/error_handling').default;
        this.JavascriptAndNativeErrorHandler.initializeErrorHandling(Store.redux);

        mattermostManaged.addEventListener('managedConfigDidChange', this.onManagedConfigurationChange);
    };

    configureAnalytics = async () => {
        const state = Store.redux.getState();
        const config = getConfig(state);
        const initAnalytics = require('./analytics').init;

        if (config && config.DiagnosticsEnabled === 'true' && config.DiagnosticId && LocalConfig.RudderApiKey) {
            analytics = await initAnalytics(config);
        }

        return analytics;
    };

    onAppStateChange = (appState) => {
        const isActive = appState === 'active';
        const isBackground = appState === 'background';

        if (Store.redux) {
            Store.redux.dispatch(setAppState(isActive));

            if (isActive && (!emmProvider.enabled || emmProvider.previousAppState === 'background')) {
                this.appActive();
            } else if (isBackground) {
                this.appInactive();
            }
        }

        emmProvider.previousAppState = appState;
    };

    onDeepLink = (event) => {
        const {url} = event;
        if (url) {
            Store.redux.dispatch(setDeepLinkURL(url));
        }
    };

    onManagedConfigurationChange = () => {
        emmProvider.handleManagedConfig(true);
    };

    onLogout = async () => {
        Store.redux.dispatch(closeWebSocket(false));
        Store.redux.dispatch(setServerVersion(''));

        if (analytics) {
            await analytics.reset();
        }

        removeAppCredentials();
        deleteFileCache();
        resetMomentLocale();

        // TODO: Handle when multi-server support is added
        try {
            await CookieManager.clearAll(Platform.OS === 'ios');
        } catch (error) {
            // Nothing to clear
        }
        PushNotifications.clearNotifications();
        const cacheDir = RNFetchBlob.fs.dirs.CacheDir;
        const mainPath = cacheDir.split('/').slice(0, -1).join('/');

        mattermostBucket.removePreference('cert');
        mattermostBucket.removePreference('emm');
        if (Platform.OS === 'ios') {
            mattermostBucket.removeFile('entities');
        } else {
            const cookies = await RNFetchBlob.fs.exists(`${mainPath}/app_webview/Cookies`);
            const cookiesJ = await RNFetchBlob.fs.exists(`${mainPath}/app_webview/Cookies-journal`);
            if (cookies) {
                RNFetchBlob.fs.unlink(`${mainPath}/app_webview/Cookies`);
            }

            if (cookiesJ) {
                RNFetchBlob.fs.unlink(`${mainPath}/app_webview/Cookies-journal`);
            }
        }

        if (this.launchApp) {
            this.launchApp();
        }

        // Reset the state after sending
        // the user to the Select server URL screen
        // To avoid unavailable data crashes while components are
        // still mounted.
        this.resetState();
    };

    onOrientationChange = (dimensions) => {
        if (Store.redux) {
            const {dispatch, getState} = Store.redux;
            const deviceState = getState().device;

            if (DeviceInfo.isTablet()) {
                dispatch(setDeviceAsTablet());
            }

            const {height, width} = dimensions.window;
            const orientation = height > width ? 'PORTRAIT' : 'LANDSCAPE';
            const savedOrientation = deviceState?.orientation;
            const savedDimension = deviceState?.dimension;

            if (orientation !== savedOrientation) {
                dispatch(setDeviceOrientation(orientation));
            }

            if (height !== savedDimension?.deviceHeight ||
                width !== savedDimension?.deviceWidth) {
                dispatch(setDeviceDimensions(height, width));
            }
        }
    };

    onRestartApp = async () => {
        const {dispatch, getState} = Store.redux;
        const state = getState();
        const {currentUserId} = state.entities.users;
        const user = getUser(state, currentUserId);

        await dispatch(loadConfigAndLicense());
        await dispatch(getTeams());
        await dispatch(loadMe(user));

        const window = Dimensions.get('window');
        this.onOrientationChange({window});

        if (Platform.OS === 'ios') {
            StatusBarManager.getHeight(
                (data) => {
                    this.onStatusBarHeightChange(data.height);
                },
            );
        }
    };

    onServerConfigChanged = (config) => {
        this.configureAnalytics(config);

        if (isMinimumServerVersion(Client4.serverVersion, 5, 24) && config.ExtendSessionLengthWithActivity === 'true') {
            PushNotifications.cancelAllLocalNotifications();
        }
    };

    onServerVersionChanged = async (serverVersion) => {
        const {dispatch, getState} = Store.redux;
        const state = getState();
        const match = serverVersion && serverVersion.match(/^[0-9]*.[0-9]*.[0-9]*(-[a-zA-Z0-9.-]*)?/g);
        const version = match && match[0];
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
                    {cancelable: false},
                );
            } else if (state.entities.users && state.entities.users.currentUserId) {
                dispatch(setServerVersion(serverVersion));
                dispatch(loadConfigAndLicense());
            }
        }
    };

    onStatusBarHeightChange = (nextStatusBarHeight) => {
        Store.redux.dispatch(setStatusBarHeight(nextStatusBarHeight));
    };

    onSwitchToDefaultChannel = (teamId) => {
        Store.redux.dispatch(selectDefaultChannel(teamId));
    };

    resetState = async () => {
        try {
            await AsyncStorage.clear();
            const state = Store.redux.getState();
            const newState = {
                ...initialState,
                app: {
                    build: DeviceInfo.getBuildNumber(),
                    version: DeviceInfo.getVersion(),
                    previousVersion: DeviceInfo.getVersion(),
                },
                entities: {
                    ...initialState.entities,
                    general: {
                        ...initialState.entities.general,
                        deviceToken: state.entities.general.deviceToken,
                    },
                },
                views: {
                    i18n: {
                        locale: getLocales()[0].languageCode,
                    },
                    root: {
                        hydrationComplete: true,
                    },
                    selectServer: {
                        serverUrl: state.views.selectServer.serverUrl,
                    },
                },
                _persist: {
                    rehydrated: true,
                },
            };

            return Store.redux.dispatch({
                type: General.OFFLINE_STORE_PURGE,
                data: newState,
            });
        } catch (e) {
            // clear error
            return e;
        }
    }

    serverUpgradeNeeded = async () => {
        const {dispatch} = Store.redux;

        dispatch(setServerVersion(''));
        Client4.serverVersion = '';

        const credentials = await getAppCredentials();

        if (credentials) {
            dispatch(logout());
        }
    };

    turnOnInAppNotificationHandling = () => {
        if (!this.pushNotificationListener) {
            this.pushNotificationListener = true;
            EventEmitter.on(ViewTypes.NOTIFICATION_IN_APP, this.handleInAppNotification);
        }
    }

    turnOffInAppNotificationHandling = () => {
        this.pushNotificationListener = false;
        EventEmitter.off(ViewTypes.NOTIFICATION_IN_APP, this.handleInAppNotification);
    }

    handleInAppNotification = (notification) => {
        const {data} = notification;
        const {getState} = Store.redux;
        const state = getState();
        const currentChannelId = getCurrentChannelId(state);

        if (data && data.channel_id !== currentChannelId) {
            const screen = 'Notification';
            const passProps = {
                notification,
            };

            EventEmitter.emit(NavigationTypes.NAVIGATION_SHOW_OVERLAY);
            showOverlay(screen, passProps);
        }
    };

    setUserTimezone = async () => {
        const {dispatch, getState} = Store.redux;
        const state = getState();
        const currentUser = getCurrentUser(state);

        const enableTimezone = isTimezoneEnabled(state);
        if (enableTimezone && currentUser.id) {
            const timezone = getDeviceTimezone();
            const {
                automaticTimezone,
                manualTimezone,
                useAutomaticTimezone,
            } = currentUser.timezone;
            let updateTimeZone = false;

            if (useAutomaticTimezone) {
                updateTimeZone = timezone !== automaticTimezone;
            } else {
                updateTimeZone = timezone !== manualTimezone;
            }

            if (updateTimeZone) {
                dispatch(autoUpdateTimezone(timezone));
            }
        }
    };
}

export default new GlobalEventHandler();
