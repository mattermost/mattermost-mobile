// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {AsyncStorage} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {loadMe} from 'mattermost-redux/actions/users';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {ViewTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';
import tracker from 'app/utils/time_tracker';

import {store, handleManagedConfig} from './app';

const lazyLoadLocalization = () => {
    const IntlProvider = require('react-intl').IntlProvider;
    const getTranslations = require('app/i18n').getTranslations;

    return {
        IntlProvider,
        getTranslations
    };
};

const DEVICE_SECURE_CACHE_KEY = 'DEVICE_SECURE_CACHE_KEY';

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

        // Usage utils/push_notifications.js
        this.replyNotificationData = null;
        this.deviceToken = null;
    }

    getIntl = () => {
        if (this.intl) {
            return this.intl;
        }
        const {
            IntlProvider,
            getTranslations
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

    setManagedConfig = (shouldStart) => {
        AsyncStorage.setItem(DEVICE_SECURE_CACHE_KEY, shouldStart.toString());
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
