// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@utils/key_mirror';
const ManageOptions = keyMirror({
    REMOVE_USER: null,
    MAKE_CHANNEL_ADMIN: null,
    MAKE_CHANNEL_MEMBER: null,
});

export type ManageOptionsTypes = keyof typeof ManageOptions

export default {
    ManageOptions,
};

