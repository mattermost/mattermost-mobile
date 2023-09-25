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

export default {
    CERTIFICATE_ERRORS,
    DOWNLOAD_TIMEOUT,
};
