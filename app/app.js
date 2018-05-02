// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable global-require*/
import {AsyncStorage} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {setGenericPassword, getGenericPassword, resetGenericPassword} from 'react-native-keychain';

import {loadMe} from 'mattermost-redux/actions/users';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {ViewTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';
import tracker from 'app/utils/time_tracker';

import {store, handleManagedConfig} from 'app/mattermost';

const lazyLoadLocalization = () => {
    const IntlProvider = require('react-intl').IntlProvider;
    const getTranslations = require('app/i18n').getTranslations;

    return {
        IntlProvider,
        getTranslations,
    };
};

const DEVICE_SECURE_CACHE_KEY = 'DEVICE_SECURE_CACHE_KEY';
const TOOLBAR_BACKGROUND = 'TOOLBAR_BACKGROUND';
const TOOLBAR_TEXT_COLOR = 'TOOLBAR_TEXT_COLOR';
const APP_BACKGROUND = 'APP_BACKGROUND';

export default class App {
    constructor() {
        // Usage: app.js
        this.shouldRelaunchWhenActive = false;
        this.inBackgroundSince = null;
        this.nativeAppLaunched = false;

        // Usage: screen/entry.js
        this.startAppFromPushNotification = false;
        this.isNotificationsConfigured = false;
        this.allowOtherServers = true;
        this.appStarted = false;
        this.emmEnabled = false;
        this.intl = null;
        this.toolbarBackground = null;
        this.toolbarTextColor = null;
        this.appBackground = null;

        // Usage utils/push_notifications.js
        this.replyNotificationData = null;
        this.deviceToken = null;

        // Usage credentials
        this.currentUserId = null;
        this.token = null;
        this.url = null;

        this.getStartupThemes();
        this.getAppCredentials();
    }

    getIntl = () => {
        if (this.intl) {
            return this.intl;
        }
        const {
            IntlProvider,
            getTranslations,
        } = lazyLoadLocalization();

        const state = store.getState();
        let locale = DeviceInfo.getDeviceLocale().split('-')[0];
        if (state.views.i18n.locale) {
            locale = state.views.i18n.locale;
        }

        const intlProvider = new IntlProvider({locale, messages: getTranslations(locale)}, {});
        const {intl} = intlProvider.getChildContext();
        this.setIntl(intl);
        return intl;
    };

    getManagedConfig = async () => {
        try {
            const shouldStart = await AsyncStorage.getItem(DEVICE_SECURE_CACHE_KEY);
            if (shouldStart !== null) {
                return shouldStart === 'true';
            }
        } catch (error) {
            return false;
        }
        return false;
    };

    getAppCredentials = async () => {
        try {
            const credentials = await getGenericPassword();
            if (credentials) {
                const usernameParsed = credentials.username.split(',');
                const passwordParsed = credentials.password.split(',');

                // username == deviceToken, currentUserId
                // password == token, url
                if (usernameParsed.length === 2 && passwordParsed.length === 2) {
                    const [deviceToken, currentUserId] = usernameParsed;
                    const [token, url] = passwordParsed;

                    this.deviceToken = deviceToken;
                    this.currentUserId = currentUserId;
                    this.token = token;
                    this.url = url;
                }
            }
        } catch (error) {
            return null;
        }

        return null;
    };

    getStartupThemes = async () => {
        try {
            const [
                toolbarBackground,
                toolbarTextColor,
                appBackground,
            ] = await Promise.all([
                await AsyncStorage.getItem(TOOLBAR_BACKGROUND),
                AsyncStorage.getItem(TOOLBAR_TEXT_COLOR),
                AsyncStorage.getItem(APP_BACKGROUND),
            ]);

            if (toolbarBackground) {
                this.toolbarBackground = toolbarBackground;
                this.toolbarTextColor = toolbarTextColor;
                this.appBackground = appBackground;
            }
        } catch (error) {
            return null;
        }

        return null;
    };

    setManagedConfig = (shouldStart) => {
        AsyncStorage.setItem(DEVICE_SECURE_CACHE_KEY, shouldStart.toString());
    };

    setAppCredentials = (deviceToken, currentUserId, token, url) => {
        if (!currentUserId) {
            return;
        }
        const username = `${deviceToken}, ${currentUserId}`;
        const password = `${token},${url}`;
        setGenericPassword(username, password);
    };

    setStartupThemes = (toolbarBackground, toolbarTextColor, appBackground) => {
        AsyncStorage.setItem(TOOLBAR_BACKGROUND, toolbarBackground);
        AsyncStorage.setItem(TOOLBAR_TEXT_COLOR, toolbarTextColor);
        AsyncStorage.setItem(APP_BACKGROUND, appBackground);
    };

    setStartAppFromPushNotification = (startAppFromPushNotification) => {
        this.startAppFromPushNotification = startAppFromPushNotification;
    };

    setIsNotificationsConfigured = (isNotificationsConfigured) => {
        this.isNotificationsConfigured = isNotificationsConfigured;
    };

    setAllowOtherServers = (allowOtherServers) => {
        this.allowOtherServers = allowOtherServers;
    };

    setAppStarted = (appStarted) => {
        this.appStarted = appStarted;
    };

    setEMMEnabled = (emmEnabled) => {
        this.emmEnabled = emmEnabled;
    };

    setIntl = (intl) => {
        this.intl = intl;
    };

    setDeviceToken = (deviceToken) => {
        this.deviceToken = deviceToken;
    };

    setReplyNotificationData = (replyNotificationData) => {
        this.replyNotificationData = replyNotificationData;
    };

    setInBackgroundSince = (inBackgroundSince) => {
        this.inBackgroundSince = inBackgroundSince;
    };

    setShouldRelaunchWhenActive = (shouldRelaunchWhenActive) => {
        this.shouldRelaunchWhenActive = shouldRelaunchWhenActive;
    };

    setNativeAppLaunched = (nativeAppLaunched) => {
        this.nativeAppLaunched = nativeAppLaunched;
    };

    clearCache = () => {
        resetGenericPassword();
        AsyncStorage.multiRemove([
            DEVICE_SECURE_CACHE_KEY,
            TOOLBAR_BACKGROUND,
            TOOLBAR_TEXT_COLOR,
            APP_BACKGROUND,
        ]);
    };

    verifyManagedConfigCache = async (shouldStartCache) => {
        // since we are caching managed device results
        // we should verify after using the cache
        const shouldStart = await handleManagedConfig();
        if (shouldStartCache && !shouldStart) {
            this.setManagedConfig(false);
            mattermostManaged.quitApp();
            return;
        }

        this.setManagedConfig(true);
    };

    launchApp = async () => {
        const shouldStartCache = await this.getManagedConfig();
        if (shouldStartCache) {
            this.startApp();
            this.verifyManagedConfigCache(shouldStartCache);
            return;
        }

        const shouldStart = await handleManagedConfig();
        if (shouldStart) {
            this.setManagedConfig(shouldStart);
            this.startApp();
        }
    };

    startApp = () => {
        // TODO: should we check if entryComponent exists?

        if (!this.appStarted) {
            const {dispatch, getState} = store;
            const {entities} = getState();

            let screen = 'SelectServer';
            if (entities) {
                const {credentials} = entities.general;

                if (credentials.token && credentials.url) {
                    screen = 'Channel';
                    tracker.initialLoad = Date.now();
                    loadMe()(dispatch, getState);
                }
            }

            switch (screen) {
            case 'SelectServer':
                EventEmitter.emit(ViewTypes.LAUNCH_LOGIN, true);
                break;
            case 'Channel':
                EventEmitter.emit(ViewTypes.LAUNCH_CHANNEL, true);
                break;
            }

            this.setStartAppFromPushNotification(false);
            this.setAppStarted(true);
        }
    }
}
