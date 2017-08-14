// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import LocalAuth from 'react-native-local-auth';
import JailMonkey from 'jail-monkey';

export default {
    addEventListener: (name, callback) => {
        if (callback && typeof callback === 'function') {
            callback(null);
        }
    },
    authenticate: LocalAuth.authenticate,
    blurAppScreen: () => true,
    getConfig: () => null,
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
    quitApp: () => true
};
