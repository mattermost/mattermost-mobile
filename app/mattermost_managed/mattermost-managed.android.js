// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {BackHandler, NativeModules, DeviceEventEmitter} from 'react-native';
import LocalAuth from 'react-native-local-auth';
import JailMonkey from 'jail-monkey';

const {MattermostManaged} = NativeModules;

export default {
    addEventListener: (name, callback) => {
        DeviceEventEmitter.addListener(name, (config) => {
            if (callback && typeof callback === 'function') {
                callback(config);
            }
        });
    },
    authenticate: LocalAuth.authenticate,
    blurAppScreen: MattermostManaged.blurAppScreen,
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
    quitApp: BackHandler.exitApp
};
