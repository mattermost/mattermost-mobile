// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'service/utils/key_mirror';

const ViewTypes = keyMirror({
    SERVER_URL_CHANGED: null,

    LOGIN_ID_CHANGED: null,
    PASSWORD_CHANGED: null
});

export default ViewTypes;
