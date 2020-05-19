// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@mm-redux/client';
import CookieManager from '@react-native-community/cookies';

let mfaPreflightDone = false;

export function setMfaPreflightDone(state) {
    mfaPreflightDone = state;
}

export function getMfaPreflightDone() {
    return mfaPreflightDone;
}

export function setCSRFFromCookie(url) {
    return new Promise((resolve) => {
        CookieManager.get(url, false).then((cookies) => {
            const token = cookies.MMCSRF;
            if (token) {
                let value = null;
                if (typeof token === 'object' && Object.prototype.hasOwnProperty.call(token, 'value')) {
                    value = token.value;
                } else {
                    value = token;
                }

                Client4.setCSRF(value);
            }
            resolve();
        });
    });
}
