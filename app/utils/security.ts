// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CookieManager, {type Cookie} from '@react-native-cookies/cookies';
import base64 from 'base-64';
import {Platform} from 'react-native';

export async function getCSRFFromCookie(url: string) {
    const cookies = await CookieManager.get(url, false);
    return cookies.MMCSRF?.value;
}

export async function clearCookies(serverUrl: string, webKit: boolean) {
    try {
        const cookies = await CookieManager.get(serverUrl, webKit);
        const values = Object.values(cookies);
        values.forEach((cookie: Cookie) => {
            CookieManager.clearByName(serverUrl, cookie.name, webKit);
        });
    } catch (error) {
        // Nothing to clear
    }
}

export async function clearCookiesForServer(serverUrl: string) {
    if (Platform.OS === 'ios') {
        clearCookies(serverUrl, false);
        clearCookies(serverUrl, true);
    } else if (Platform.OS === 'android') {
        CookieManager.flush();
    }
}

export const urlSafeBase64Encode = (str: string): string => {
    return base64.encode(str).replace(/\+/g, '-').replace(/\//g, '_');
};
