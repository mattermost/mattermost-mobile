// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import {NativeModules, NativeEventEmitter} from 'react-native';
import LocalAuth from 'react-native-local-auth';
import JailMonkey from 'jail-monkey';

const {BlurAppScreen, MattermostManaged} = NativeModules;
const MattermostManagedEvents = new NativeEventEmitter(MattermostManaged);

export default {
    addEventListener: (name, callback) => {
        MattermostManagedEvents.addListener(name, (config) => {
            if (callback && typeof callback === 'function') {
                callback(config);
            }
        });
    },
    authenticate: LocalAuth.authenticate,
    blurAppScreen: BlurAppScreen.enabled,
    getConfig: MattermostManaged.getConfig,
    hasTouchID: async () => {
        try {
            await LocalAuth.hasTouchID();
            return true;
        } catch (err) {
            return false;
        }
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
