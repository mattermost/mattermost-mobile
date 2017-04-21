// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

export function isValidUrl(url) {
    const regex = /^https?:\/\//i;
    return regex.test(url);
}

export function stripTrailingSlashes(url) {
    return url.replace(/\/+$/, '').trim();
}
