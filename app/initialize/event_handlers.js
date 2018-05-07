// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Alert, AppState, Dimensions, InteractionManager, Keyboard} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {setJSExceptionHandler, setNativeExceptionHandler} from 'react-native-exception-handler';
import {Navigation} from 'react-native-navigation';
import semver from 'semver';

import {logError} from 'mattermost-redux/actions/errors';
import {setAppState, setServerVersion} from 'mattermost-redux/actions/general';
import {logout} from 'mattermost-redux/actions/users';
import {close as closeWebSocket} from 'mattermost-redux/actions/websocket';
import {Client4} from 'mattermost-redux/client';
import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {setDeviceDimensions, setDeviceOrientation, setDeviceAsTablet} from 'app/actions/device';
import {setChannelDisplayName} from 'app/actions/views/channel';
import {loadConfigAndLicense, purgeOfflineStore, startDataCleanup} from 'app/actions/views/root';
import {NavigationTypes} from 'app/constants';
import {getTranslations} from 'app/i18n';
import {getCurrentLocale} from 'app/selectors/i18n';
import {deleteFileCache} from 'app/utils/file';
import {init as initAnalytics} from 'app/utils/segment';
import {captureException, initializeSentry, LOGGER_JAVASCRIPT, LOGGER_NATIVE} from 'app/utils/sentry';

import LocalConfig from 'assets/config';

const AUTHENTICATION_TIMEOUT = 5 * 60 * 1000;

export default class EventHandlers {
    constructor(store, emm, pn, launchApp, startApp) {
        const devMode = Boolean(__DEV__); //eslint-disable-line no-undef
        this.store = store;
        this.emm = emm;
        this.pn = pn;
        this.launchApp = launchApp;
        this.startApp = startApp;
        this.relaunchWhenActive = false;
        this.inBackgroundSince = null;

        initializeSentry();
        Client4.setUserAgent(DeviceInfo.getUserAgent());
        AppState.addEventListener('change', this.handleAppStateChange);
        Dimensions.addEventListener('change', this.handleOrientationChange);
        EventEmitter.on(General.CONFIG_CHANGED, this.handleConfigChanged);
        EventEmitter.on(General.DEFAULT_CHANNEL, this.handleResetChannelDisplayName);
        EventEmitter.on(General.SERVER_VERSION_CHANGED, this.handleServerVersionChanged);
        EventEmitter.on(NavigationTypes.NAVIGATION_RESET, this.handleLogout);
        EventEmitter.on(NavigationTypes.RESTART_APP, this.restartApp);

        setJSExceptionHandler(this.errorHandler, !devMode);
        setNativeExceptionHandler(this.nativeErrorHandler, false);
    }

    configureAnalytics = (config) => {
        if (config && config.DiagnosticsEnabled === 'true' && config.DiagnosticId && LocalConfig.SegmentApiKey) {
            initAnalytics(config);
        } else {
            global.analytics = null;
        }
    };

    errorHandler = (e, isFatal) => {
        if (!e) {
            // This method gets called for propTypes errors in dev mode without an exception
            return;
        }

        console.warn('Handling Javascript error ' + JSON.stringify(e)); // eslint-disable-line no-console
        captureException(e, LOGGER_JAVASCRIPT, this.store);

        const locale = getCurrentLocale(this.store.getState());
        const messages = getTranslations(locale);
        this.store.dispatch(closeWebSocket());

        if (Client4.getUrl()) {
            this.store.dispatch(logError(e));
        }

        if (isFatal) {
            Alert.alert(
                messages['mobile.error_handler.title'],
                messages['mobile.error_handler.description'],
                [{
                    text: messages['mobile.error_handler.button'],
                    onPress: () => {
                        // purge the store
                        this.store.dispatch(purgeOfflineStore());
                    },
                }],
                {cancelable: false}
            );
        }
    };

    handleAppStateChange = async (appState) => {
        const {dispatch} = this.store;
        const isActive = appState === 'active';
        const emmEnabled = this.emm.isEnabled();

        dispatch(setAppState(isActive));

        if (isActive && this.relaunchWhenActive) {
            // This handles when the app was started in the background
            // cause of an iOS push notification reply
            this.setRelaunchWhenActive(false);
            this.launchApp();
        } else if (!isActive && !this.inBackgroundSince) {
            // When the app is sent to the background we set the time when that happens
            // and perform a data clean up to improve on performance
            this.inBackgroundSince = Date.now();
            dispatch(startDataCleanup());
        } else if (isActive && this.inBackgroundSince && (Date.now() - this.inBackgroundSince) >= AUTHENTICATION_TIMEOUT && emmEnabled) {
            // Once the app becomes active after more than 5 minutes in the background and is controlled by an EMM
            this.emm.authenticateIfEnabled();
        }

        if (isActive) {
            this.inBackgroundSince = null;
            Keyboard.dismiss();
        }
    };

    handleConfigChanged = (config) => {
        this.configureAnalytics(config);
    };

    handleLogout = () => {
        deleteFileCache();
        this.resetBadgeAndVersion();
        this.startApp('fade');
    };

    handleOrientationChange = ({window}) => {
        const {dispatch} = this.store;
        const {height, width} = window;
        const orientation = height > width ? 'PORTRAIT' : 'LANDSCAPE';
        dispatch(setDeviceOrientation(orientation));
        dispatch(setDeviceDimensions(height, width));
        if (DeviceInfo.isTablet()) {
            dispatch(setDeviceAsTablet());
        }
    };

    handleResetChannelDisplayName = (displayName) => {
        this.store.dispatch(setChannelDisplayName(displayName));
    };

    handleServerVersionChanged = async (serverVersion) => {
        const {dispatch, getState} = this.store;
        const version = serverVersion.match(/^[0-9]*.[0-9]*.[0-9]*(-[a-zA-Z0-9.-]*)?/g)[0];
        const state = getState();

        if (serverVersion) {
            if (semver.valid(version) && semver.lt(version, LocalConfig.MinServerVersion)) {
                const locale = getCurrentLocale(state);
                const messages = getTranslations(locale);
                Alert.alert(
                    messages['mobile.server_upgrade.title'],
                    messages['mobile.server_upgrade.description'],
                    [{
                        text: messages['mobile.server_upgrade.button'],
                        onPress: this.handleServerVersionUpgradeNeeded,
                    }],
                    {cancelable: false}
                );
            } else if (state.entities.users && state.entities.users.currentUserId) {
                dispatch(setServerVersion(serverVersion));

                // Note that license and config changes are now emitted as websocket events, but
                // we might be connected to an older server. Loading the configuration multiple
                // times isn't a high overhead at present, so there's no harm in potentially
                // repeating the load and handling for now.
                const data = await dispatch(loadConfigAndLicense());
                this.handleConfigChanged(data.config);
            }
        }
    };

    handleServerVersionUpgradeNeeded = async () => {
        const {dispatch, getState} = this.store;

        this.resetBadgeAndVersion();

        if (getState().entities.general.credentials.token) {
            InteractionManager.runAfterInteractions(() => {
                logout()(dispatch, getState);
            });
        }
    };

    nativeErrorHandler = (e) => {
        console.warn('Handling native error ' + JSON.stringify(e)); // eslint-disable-line no-console
        captureException(e, LOGGER_NATIVE, this.store);
    };

    resetBadgeAndVersion = () => {
        const {dispatch} = this.store;
        Client4.serverVersion = '';
        Client4.setUserId('');
        this.pn.resetApplicationIconBadgeNumber(0);
        this.pn.cancelAllLocalNotifications();
        dispatch(setServerVersion(''));
    };

    restartApp = async () => {
        const {dispatch} = this.store;
        Navigation.dismissModal({animationType: 'none'});

        await dispatch(loadConfigAndLicense());
        this.startApp('fade');
    };

    setRelaunchWhenActive = (bool) => {
        this.relaunchWhenActive = bool;
    };
}
