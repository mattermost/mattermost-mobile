// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@utils/key_mirror';

const Navigation = keyMirror({
    NAVIGATION_RESET: null,
    NAVIGATION_CLOSE_MODAL: null,
    NAVIGATION_NO_TEAMS: null,
    NAVIGATION_ERROR_TEAMS: null,
    NAVIGATION_SHOW_OVERLAY: null,
    NAVIGATION_DISMISS_AND_POP_TO_ROOT: null,
    CLOSE_MAIN_SIDEBAR: null,
    MAIN_SIDEBAR_DID_CLOSE: null,
    MAIN_SIDEBAR_DID_OPEN: null,
    CLOSE_SETTINGS_SIDEBAR: null,
    BLUR_POST_DRAFT: null,
});

export default Navigation;
