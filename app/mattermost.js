// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import 'babel-polyfill';
import Orientation from 'react-native-orientation';
import {Provider} from 'react-redux';
import {Navigation, NativeEventsReceiver} from 'react-native-navigation';
import {IntlProvider} from 'react-intl';
import {
    Alert,
    AppState,
    InteractionManager,
    Keyboard,
    NativeModules,
    Platform
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {setJSExceptionHandler, setNativeExceptionHandler} from 'react-native-exception-handler';
import StatusBarSizeIOS from 'react-native-status-bar-size';
import semver from 'semver';

import {General} from 'mattermost-redux/constants';
import {setAppState, setDeviceToken, setServerVersion} from 'mattermost-redux/actions/general';
import {markChannelAsRead} from 'mattermost-redux/actions/channels';
import {logError} from 'mattermost-redux/actions/errors';
import {logout} from 'mattermost-redux/actions/users';
import {close as closeWebSocket} from 'mattermost-redux/actions/websocket';
import {Client, Client4} from 'mattermost-redux/client';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {
    calculateDeviceDimensions,
    setDeviceOrientation,
    setDeviceAsTablet,
    setStatusBarHeight
} from 'app/actions/device';
import {
    createPost,
    loadConfigAndLicense,
    loadFromPushNotification,
    purgeOfflineStore
} from 'app/actions/views/root';
import {setChannelDisplayName} from 'app/actions/views/channel';
import {handleLoginIdChanged} from 'app/actions/views/login';
import {handleServerUrlChanged} from 'app/actions/views/select_server';
import {NavigationTypes, ViewTypes} from 'app/constants';
import {getTranslations} from 'app/i18n';
import initialState from 'app/initial_state';
import PushNotifications from 'app/push_notifications';
import {registerScreens} from 'app/screens';
import configureStore from 'app/store';
import mattermostBucket from 'app/mattermost_bucket';
import mattermostManaged from 'app/mattermost_managed';
import {deleteFileCache} from 'app/utils/file';
import {init as initAnalytics} from 'app/utils/segment';
import {
    captureException,
    initializeSentry,
    LOGGER_JAVASCRIPT,
    LOGGER_NATIVE
} from 'app/utils/sentry';
import {stripTrailingSlashes} from 'app/utils/url';

import Config from 'assets/config';

const {StatusBarManager} = NativeModules;
const AUTHENTICATION_TIMEOUT = 5 * 60 * 1000;

export default class Mattermost {
    constructor() {
        if (Platform.OS === 'android') {
            // This is to remove the warnings for the scaleY property used in android.
            // The property is necessary because some Android devices won't render the posts
            // properly if we use transform: {scaleY: -1} in the stylesheet.
            console.ignoredYellowBox = ['`scaleY`']; //eslint-disable-line
        }
        this.isConfigured = false;
        this.allowOtherServers = true;

        Orientation.unlockAllOrientations();

        initializeSentry();

        this.store = configureStore(initialState);
        this.unsubscribeFromStore = this.store.subscribe(this.listenForHydration);
        AppState.addEventListener('change', this.handleAppStateChange);
        EventEmitter.on(General.CONFIG_CHANGED, this.handleConfigChanged);
        EventEmitter.on(NavigationTypes.NAVIGATION_RESET, this.handleReset);
        EventEmitter.on(General.DEFAULT_CHANNEL, this.handleResetDisplayName);
        EventEmitter.on(NavigationTypes.RESTART_APP, this.restartApp);
        Orientation.addOrientationListener(this.orientationDidChange);
        mattermostManaged.addEventListener('managedConfigDidChange', this.handleManagedConfig);

        this.handleAppStateChange(AppState.currentState);
        Client4.setUserAgent(DeviceInfo.getUserAgent());

        if (Platform.OS === 'ios') {
            StatusBarSizeIOS.addEventListener('willChange', this.handleStatusBarHeightChange);
            StatusBarManager.getHeight(
                (data) => {
                    this.handleStatusBarHeightChange(data.height);
                }
            );
        }

        registerScreens(this.store, Provider);

        setJSExceptionHandler(this.errorHandler, false);
        setNativeExceptionHandler(this.nativeErrorHandler, false);
    }

    errorHandler = (e, isFatal) => {
        console.warn('Handling Javascript error ' + JSON.stringify(e)); // eslint-disable-line no-console
        captureException(e, LOGGER_JAVASCRIPT, this.store);

        const intl = this.getIntl();
        closeWebSocket()(this.store.dispatch, this.store.getState);
        logError(e)(this.store.dispatch);

        if (isFatal) {
            Alert.alert(
                intl.formatMessage({id: 'mobile.error_handler.title', defaultMessage: 'Unexpected error occurred'}),
                intl.formatMessage({id: 'mobile.error_handler.description', defaultMessage: '\nClick relaunch to open the app again. After restart, you can report the problem from the settings menu.\n'}),
                [{
                    text: intl.formatMessage({id: 'mobile.error_handler.button', defaultMessage: 'Relaunch'}),
                    onPress: () => {
                        // purge the store
                        this.store.dispatch(purgeOfflineStore());
                    }
                }],
                {cancelable: false}
            );
        }
    };

    nativeErrorHandler = (e) => {
        console.warn('Handling native error ' + JSON.stringify(e)); // eslint-disable-line no-console
        captureException(e, LOGGER_NATIVE, this.store);
    };

    getIntl = () => {
        const state = this.store.getState();
        let locale = DeviceInfo.getDeviceLocale().split('-')[0];
        if (state.views.i18n.locale) {
            locale = state.views.i18n.locale;
        }

        const intlProvider = new IntlProvider({locale, messages: getTranslations(locale)}, {});
        const {intl} = intlProvider.getChildContext();
        return intl;
    };

    configureAnalytics = (config) => {
        if (config && config.DiagnosticsEnabled === 'true' && config.DiagnosticId && Config.SegmentApiKey) {
            initAnalytics(config);
        } else {
            global.analytics = null;
        }
    };

    configurePushNotifications = () => {
        PushNotifications.configure({
            onRegister: this.onRegisterDevice,
            onNotification: this.onPushNotification,
            onReply: this.onPushNotificationReply,
            popInitialNotification: true,
            requestPermissions: true
        });
        this.isConfigured = true;
    };

    handleAppStateChange = async (appState) => {
        const {dispatch, getState} = this.store;
        const isActive = appState === 'active';
        setAppState(isActive)(dispatch, getState);

        if (isActive && this.shouldRelaunchonActive) {
            this.launchApp();
            this.shouldRelaunchonActive = false;
        } else {
            try {
                if (!isActive && !this.inBackgroundSince) {
                    this.inBackgroundSince = Date.now();
                    dispatch({type: ViewTypes.DATA_CLEANUP, payload: getState()});
                } else if (isActive && this.inBackgroundSince && (Date.now() - this.inBackgroundSince) >= AUTHENTICATION_TIMEOUT) {
                    this.inBackgroundSince = null;

                    if (this.mdmEnabled) {
                        const config = await mattermostManaged.getConfig();
                        const authNeeded = config.inAppPinCode && config.inAppPinCode === 'true';
                        if (authNeeded) {
                            const authenticated = await this.handleAuthentication(config.vendor);
                            if (!authenticated) {
                                mattermostManaged.quitApp();
                            }
                        }
                    }
                } else if (isActive) {
                    this.inBackgroundSince = null;
                    Keyboard.dismiss();
                }
            } catch (error) {
                // do nothing
            }
        }
    };

    handleAuthentication = async (vendor) => {
        const isSecured = await mattermostManaged.isDeviceSecure();

        const intl = this.getIntl();
        if (isSecured) {
            try {
                mattermostBucket.set('emm', vendor, Config.AppGroupId);
                await mattermostManaged.authenticate({
                    reason: intl.formatMessage({
                        id: 'mobile.managed.secured_by',
                        defaultMessage: 'Secured by {vendor}'
                    }, {vendor}),
                    fallbackToPasscode: true,
                    suppressEnterPassword: true
                });
            } catch (err) {
                mattermostManaged.quitApp();
                return false;
            }
        }

        return true;
    };

    handleConfigChanged = async (serverVersion) => {
        const {dispatch, getState} = this.store;
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
                setServerVersion(serverVersion)(dispatch, getState);
                const data = await loadConfigAndLicense()(dispatch, getState);
                this.configureAnalytics(data.config);
            }
        }
    };

    handleManagedConfig = async (serverConfig) => {
        const {dispatch, getState} = this.store;
        const state = getState();

        let authNeeded = false;
        let blurApplicationScreen = false;
        let jailbreakProtection = false;
        let vendor = null;
        let serverUrl = null;
        let username = null;

        if (Config.AutoSelectServerUrl) {
            handleServerUrlChanged(Config.DefaultServerUrl)(dispatch, getState);
            this.allowOtherServers = false;
        }

        try {
            const config = await mattermostManaged.getConfig();
            if (config) {
                this.mdmEnabled = true;
                authNeeded = config.inAppPinCode && config.inAppPinCode === 'true';
                blurApplicationScreen = config.blurApplicationScreen && config.blurApplicationScreen === 'true';
                jailbreakProtection = config.jailbreakProtection && config.jailbreakProtection === 'true';
                vendor = config.vendor || 'Mattermost';

                if (!state.entities.general.credentials.token) {
                    serverUrl = config.serverUrl;
                    username = config.username;

                    if (config.allowOtherServers && config.allowOtherServers === 'false') {
                        this.allowOtherServers = false;
                    }
                }
            }
        } catch (error) {
            return true;
        }

        if (this.mdmEnabled) {
            if (jailbreakProtection) {
                const isTrusted = mattermostManaged.isTrustedDevice();

                if (!isTrusted) {
                    const intl = this.getIntl();
                    Alert.alert(
                        intl.formatMessage({
                            id: 'mobile.managed.blocked_by',
                            defaultMessage: 'Blocked by {vendor}'
                        }, {vendor}),
                        intl.formatMessage({
                            id: 'mobile.managed.jailbreak',
                            defaultMessage: 'Jailbroken devices are not trusted by {vendor}, please exit the app.'
                        }, {vendor}),
                        [{
                            text: intl.formatMessage({id: 'mobile.managed.exit', defaultMessage: 'Exit'}),
                            style: 'destructive',
                            onPress: () => {
                                mattermostManaged.quitApp();
                            }
                        }],
                        {cancelable: false}
                    );
                    return false;
                }
            }

            if (authNeeded && !serverConfig) {
                if (Platform.OS === 'android') {
                    //Start a fake app as we need at least one activity for android
                    await this.startFakeApp();
                }
                const authenticated = await this.handleAuthentication(vendor);
                if (!authenticated) {
                    return false;
                }
            }

            if (blurApplicationScreen) {
                mattermostManaged.blurAppScreen(true);
            }

            if (serverUrl) {
                handleServerUrlChanged(serverUrl)(dispatch, getState);
            }

            if (username) {
                handleLoginIdChanged(username)(dispatch, getState);
            }
        }

        return true;
    };

    handleReset = () => {
        this.appStarted = false;
        deleteFileCache();
        this.resetBadgeAndVersion();
        this.startApp('fade');
    };

    handleResetDisplayName = (displayName) => {
        this.store.dispatch(setChannelDisplayName(displayName));
    };

    handleStatusBarHeightChange = (nextStatusBarHeight) => {
        this.store.dispatch(setStatusBarHeight(nextStatusBarHeight));
    };

    handleVersionUpgrade = async () => {
        const {dispatch, getState} = this.store;

        Client4.serverVersion = '';
        PushNotifications.setApplicationIconBadgeNumber(0);

        if (getState().entities.general.credentials.token) {
            InteractionManager.runAfterInteractions(() => {
                logout()(dispatch, getState);
            });
        } else {
            this.resetBadgeAndVersion();
        }
    };

    // We need to wait for hydration to occur before load the router.
    listenForHydration = () => {
        const state = this.store.getState();
        if (!this.isConfigured) {
            this.configurePushNotifications();
        }

        if (state.views.root.hydrationComplete) {
            this.unsubscribeFromStore();

            const orientation = Orientation.getInitialOrientation();
            if (orientation) {
                this.orientationDidChange(orientation);
            }

            const {config} = state.entities.general;
            if (config) {
                this.configureAnalytics(config);
            }

            const {currentUserId} = state.entities.users;
            if (currentUserId) {
                Client4.setUserId(currentUserId);
            }

            const isNotActive = AppState.currentState !== 'active';
            const notification = PushNotifications.getNotification();
            if (notification) {
                // If we have a notification means that the app was started cause of a reply
                // and the app was not sitting in the background nor opened
                const {data, text, badge} = notification;
                this.onPushNotificationReply(data, text, badge);
                PushNotifications.resetNotification();
            }

            if (Platform.OS === 'android') {
                // In case of Android we need to handle the bridge being initialized by HeadlessJS
                Promise.resolve(Navigation.isAppLaunched()).then((appLaunched) => {
                    if (notification) {
                        if (appLaunched) {
                            this.launchApp(); // App is launched -> show UI
                        } else {
                            new NativeEventsReceiver().appLaunched(this.launchApp); // App hasn't been launched yet -> show the UI only when needed.
                        }
                    } else {
                        this.launchApp();
                    }
                });
            } else if (isNotActive) {
                // for IOS replying from push notification starts the app in the background
                this.shouldRelaunchonActive = true;
                this.startFakeApp();
            } else {
                this.launchApp();
            }
        }
    };

    onRegisterDevice = (data) => {
        this.isConfigured = true;
        const {dispatch, getState} = this.store;
        let prefix;
        if (Platform.OS === 'ios') {
            prefix = General.PUSH_NOTIFY_APPLE_REACT_NATIVE;
            if (DeviceInfo.getBundleId().includes('rnbeta')) {
                prefix = `${prefix}beta`;
            }
        } else {
            prefix = General.PUSH_NOTIFY_ANDROID_REACT_NATIVE;
        }

        setDeviceToken(`${prefix}:${data.token}`)(dispatch, getState);
    };

    onPushNotification = (deviceNotification) => {
        const {dispatch, getState} = this.store;
        const state = getState();
        const {token, url} = state.entities.general.credentials;
        let startAppFromPushNotification = false;

        // mark the app as started as soon as possible
        if (token && url && !this.appStarted) {
            this.appStarted = true;
            startAppFromPushNotification = true;
        }

        const {data, foreground, message, userInfo, userInteraction} = deviceNotification;
        const notification = {
            data,
            message
        };

        if (userInfo) {
            notification.localNotification = userInfo.localNotification;
        }

        if (data.type === 'clear') {
            markChannelAsRead(data.channel_id, null, false)(dispatch, getState);
        } else if (foreground) {
            EventEmitter.emit(ViewTypes.NOTIFICATION_IN_APP, notification);
        } else if (userInteraction && !notification.localNotification) {
            EventEmitter.emit('close_channel_drawer');
            if (startAppFromPushNotification) {
                Client.setToken(token);
                Client4.setToken(token);
                Client4.setUrl(stripTrailingSlashes(url));
                Client.setUrl(stripTrailingSlashes(url));
            }

            InteractionManager.runAfterInteractions(async () => {
                await loadFromPushNotification(notification)(dispatch, getState);

                if (startAppFromPushNotification) {
                    this.startAppFromPushNotification();
                } else {
                    EventEmitter.emit(ViewTypes.NOTIFICATION_TAPPED);
                }
            });
        }
    };

    onPushNotificationReply = (data, text, badge, completed) => {
        const {dispatch, getState} = this.store;
        const state = getState();
        const {currentUserId} = state.entities.users;

        if (currentUserId) {
            // one thing to note is that for android it will reply to the last post in the stack
            const rootId = data.root_id || data.post_id;
            const post = {
                user_id: currentUserId,
                channel_id: data.channel_id,
                root_id: rootId,
                parent_id: rootId,
                message: text
            };

            if (!Client4.getUrl()) {
                // Make sure the Client has the server url set
                Client4.setUrl(state.entities.general.credentials.url);
            }

            if (!Client.getToken()) {
                // Make sure the Client has the server token set
                Client4.setToken(state.entities.general.credentials.token);
            }

            createPost(post)(dispatch, getState);
            markChannelAsRead(data.channel_id)(dispatch, getState);

            if (badge >= 0) {
                PushNotifications.setApplicationIconBadgeNumber(badge);
            }
        }

        if (completed) {
            // You must call to completed(), otherwise the action will not be triggered
            completed();
        }
    };

    orientationDidChange = (orientation) => {
        const {dispatch} = this.store;
        dispatch(setDeviceOrientation(orientation));
        if (DeviceInfo.isTablet()) {
            dispatch(setDeviceAsTablet());
        }
        setTimeout(() => {
            dispatch(calculateDeviceDimensions());
        }, 100);
    };

    resetBadgeAndVersion = () => {
        const {dispatch, getState} = this.store;
        Client4.serverVersion = '';
        Client.serverVersion = '';
        Client.token = null;
        Client4.userId = '';
        PushNotifications.setApplicationIconBadgeNumber(0);
        PushNotifications.cancelAllLocalNotifications();
        setServerVersion('')(dispatch, getState);
    };

    restartApp = async () => {
        Navigation.dismissModal({animationType: 'none'});

        const {dispatch, getState} = this.store;
        await loadConfigAndLicense()(dispatch, getState);
        this.appStarted = false;
        this.startApp('fade');
    };

    launchApp = () => {
        this.handleManagedConfig().then((shouldStart) => {
            if (shouldStart) {
                this.startApp('fade');
            }
        });
    };

    startFakeApp = async () => {
        return Navigation.startSingleScreenApp({
            screen: {
                screen: 'Root',
                navigatorStyle: {
                    navBarHidden: true,
                    statusBarHidden: false,
                    statusBarHideWithNavBar: false
                }
            },
            passProps: {
                justInit: true
            }
        });
    };

    startApp = (animationType = 'none') => {
        if (!this.appStarted) {
            Navigation.startSingleScreenApp({
                screen: {
                    screen: 'Root',
                    navigatorStyle: {
                        navBarHidden: true,
                        statusBarHidden: false,
                        statusBarHideWithNavBar: false,
                        screenBackgroundColor: 'transparent'
                    }
                },
                passProps: {
                    allowOtherServers: this.allowOtherServers
                },
                appStyle: {
                    orientation: 'auto'
                },
                animationType
            });

            this.appStarted = true;
        }
    };

    startAppFromPushNotification = () => {
        Navigation.startSingleScreenApp({
            screen: {
                screen: 'Channel',
                navigatorStyle: {
                    navBarHidden: true,
                    statusBarHidden: false,
                    statusBarHideWithNavBar: false,
                    screenBackgroundColor: 'transparent'
                }
            },
            passProps: {
                allowOtherServers: this.allowOtherServers
            },
            appStyle: {
                orientation: 'auto'
            },
            animationType: 'none'
        });
        this.appStarted = false;
    };
}
