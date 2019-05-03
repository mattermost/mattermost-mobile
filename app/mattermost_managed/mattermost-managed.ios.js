// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {NativeModules, NativeEventEmitter} from 'react-native';
import LocalAuth from 'react-native-local-auth';
import JailMonkey from 'jail-monkey';

const {BlurAppScreen, MattermostManaged} = NativeModules;
const mattermostManagedEmitter = new NativeEventEmitter(MattermostManaged);

const listeners = [];
let cachedConfig = {};

export default {
    addEventListener: (name, callback) => {
        const listener = mattermostManagedEmitter.addListener(name, (config) => {
            cachedConfig = config;
            if (callback && typeof callback === 'function') {
                callback(config);
            }
        });

        listeners.push(listener);
        return listener;
    },
    clearListeners: () => {
        listeners.forEach((listener) => {
            listener.remove();
        });
    },
    removeEventListener: (listenerId) => {
        const index = listeners.findIndex((listener) => listener === listenerId);
        if (index !== -1) {
            listenerId.remove();
            listeners.splice(index, 1);
        }
    },
    authenticate: LocalAuth.authenticate,
    blurAppScreen: BlurAppScreen.enabled,
    getConfig: async () => {
        try {
            cachedConfig = await MattermostManaged.getConfig();
        } catch (error) {
            // do nothing...
        }

        return cachedConfig;
    },
    getCachedConfig: () => {
        return cachedConfig;
    },
    hasSafeAreaInsets: MattermostManaged.hasSafeAreaInsets,
    isDeviceSecure: async () => {
        try {
            return await LocalAuth.isDeviceSecure();
        } catch (err) {
            return false;
        }
    },
    isTrustedDevice: () => {
        if (__DEV__) {
            return true;
        }

        return JailMonkey.trustFall();
    },
    quitApp: MattermostManaged.quitApp,
};
