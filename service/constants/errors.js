// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'service/utils/key_mirror';

const ErrorTypes = keyMirror({
    DISMISS_ERROR: null,
    LOG_ERROR: null,
    CLEAR_ERRORS: null
});

export default ErrorTypes;
