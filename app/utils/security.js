// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';
import CookieManager from 'react-native-cookies';
import urlParse from 'url-parse';

export function setCSRFFromCookie(url) {
    return new Promise((resolve) => {
        CookieManager.get(urlParse(url).origin, false).then((res) => {
            const token = res.MMCSRF;
            if (token) {
                Client4.setCSRF(token?.value || token);
            }
            resolve();
        });
    });
}
