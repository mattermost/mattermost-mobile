// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Buffer} from 'buffer';

import CookieManager, {type Cookie} from '@preeternal/react-native-cookie-manager';
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

/** URL-safe base64 for cache keys and ids. UTF-8 safe (URLs may contain non-Latin1 characters). */
export const urlSafeBase64Encode = (str: string): string => {
    const encoded = Buffer.from(str, 'utf8').toString('base64');
    return encoded.replace(/\+/g, '-').replace(/\//g, '_');
};
