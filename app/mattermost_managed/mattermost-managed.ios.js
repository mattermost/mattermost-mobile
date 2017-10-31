// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import {NativeModules, DeviceEventEmitter} from 'react-native';
import LocalAuth from 'react-native-local-auth';
import JailMonkey from 'jail-monkey';

const {BlurAppScreen, MattermostManaged} = NativeModules;

const listeners = [];
let localConfig;

export default {
    addEventListener: (name, callback) => {
        const listener = DeviceEventEmitter.addListener(name, (config) => {
            localConfig = config;
            if (callback && typeof callback === 'function') {
                callback(config);
            }
        });

        listeners.push(listener);
    },
    clearListeners: () => {
        listeners.forEach((listener) => {
            listener.remove();
        });
    },
    authenticate: LocalAuth.authenticate,
    blurAppScreen: BlurAppScreen.enabled,
    getConfig: MattermostManaged.getConfig,
    getLocalConfig: async () => {
        if (!localConfig) {
            try {
                localConfig = await MattermostManaged.getConfig();
            } catch (error) {
                // do nothing...
            }
        }

        return localConfig || {};
    },
    isDeviceSecure: async () => {
        try {
            return await LocalAuth.isDeviceSecure();
        } catch (err) {
            return false;
        }
    },
    isTrustedDevice: () => {
        if (__DEV__) { //eslint-disable-line no-undef
            return true;
        }

        return JailMonkey.trustFall();
    },
    quitApp: MattermostManaged.quitApp
};
