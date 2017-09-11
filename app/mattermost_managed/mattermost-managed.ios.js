// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import {NativeModules, NativeEventEmitter} from 'react-native';
import LocalAuth from 'react-native-local-auth';
import JailMonkey from 'jail-monkey';

const {BlurAppScreen, MattermostManaged} = NativeModules;
const MattermostManagedEvents = new NativeEventEmitter(MattermostManaged);

const listeners = [];

export default {
    addEventListener: (name, callback) => {
        const listener = MattermostManagedEvents.addListener(name, (config) => {
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
