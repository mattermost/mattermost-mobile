// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CookieManager from '@react-native-cookies/cookies';
import base64 from 'base-64';

export async function getCSRFFromCookie(url: string) {
    const cookies = await CookieManager.get(url, false);
    return cookies.MMCSRF?.value;
}

export const urlSafeBase64Encode = (str: string): string => {
    return base64.encode(str).replace(/\+/g, '-').replace(/\//g, '_');
};
