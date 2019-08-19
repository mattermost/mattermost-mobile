// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';
import CookieManager from 'react-native-cookies';

let mfaPreflightDone = false;

export function setMfaPreflightDone(state) {
    mfaPreflightDone = state;
}

export function getMfaPreflightDone() {
    return mfaPreflightDone;
}

export function setCSRFFromCookie(url) {
    return new Promise((resolve) => {
        CookieManager.get(url, false).then((res) => {
            const token = res.MMCSRF;
            if (token) {
                Client4.setCSRF(token?.value || token);
            }
            resolve();
        });
    });
}
