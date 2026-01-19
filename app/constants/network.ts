// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toMilliseconds} from '@utils/datetime';
import keyMirror from '@utils/key_mirror';

export const CERTIFICATE_ERRORS = keyMirror({
    CLIENT_CERTIFICATE_IMPORT_ERROR: null,
    CLIENT_CERTIFICATE_MISSING: null,
    SERVER_INVALID_CERTIFICATE: null,
});

export const DOWNLOAD_TIMEOUT = toMilliseconds({minutes: 10});

// iOS NSURLError codes (from Foundation framework)
export const IOS_NSURL_ERROR = {
    NOT_CONNECTED_TO_INTERNET: -1009,
    NETWORK_CONNECTION_LOST: -1005,
} as const;

// Android exception class names (from java.net package)
export const ANDROID_NET_EXCEPTION = {
    UNKNOWN_HOST: 'java.net.UnknownHostException',
    SOCKET_EXCEPTION: 'java.net.SocketException',
    SOCKET_TIMEOUT: 'java.net.SocketTimeoutException',
} as const;

export default {
    CERTIFICATE_ERRORS,
    DOWNLOAD_TIMEOUT,
    IOS_NSURL_ERROR,
    ANDROID_NET_EXCEPTION,
};
