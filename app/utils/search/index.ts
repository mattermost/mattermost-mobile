// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@utils/key_mirror';
export const TabTypes = keyMirror({
    MESSAGES: null,
    FILES: null,
});

export type TabType = keyof typeof TabTypes;
