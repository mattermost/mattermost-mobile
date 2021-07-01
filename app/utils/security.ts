// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CookieManager from '@react-native-cookies/cookies';

export async function getCSRFFromCookie(url: string) {
    const cookies = await CookieManager.get(url, false);
    return cookies.MMCSRF?.value;
}

export const hashCode = (str: string): string => {
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
