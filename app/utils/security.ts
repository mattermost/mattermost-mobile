// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CookieManager from '@react-native-cookies/cookies';
import base64 from 'base-64';

export async function getCSRFFromCookie(url: string) {
    const cookies = await CookieManager.get(url, false);
    return cookies.MMCSRF?.value;
}

// This has been deprecated and is only used for migrations
export const hashCode_DEPRECATED = (str: string): string => {
    let hash = 0;
    let i;
    let chr;
    if (!str || str.length === 0) {
        return hash.toString();
    }

    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
};

export const urlSafeBase64Encode = (str: string): string => {
    return base64.encode(str).replace(/\+/g, '-').replace(/\//g, '_');
};
