// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@utils/key_mirror';

export const CERTIFICATE_ERRORS = keyMirror({
    CLIENT_CERTIFICATE_IMPORT_ERROR: null,
    CLIENT_CERTIFICATE_MISSING: null,
});

export const DOWNLOAD_TIMEOUT = (1000 * 60) * 10; // 10 mins

export default {
    CERTIFICATE_ERRORS,
    DOWNLOAD_TIMEOUT,
};
