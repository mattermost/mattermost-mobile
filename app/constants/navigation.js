// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'service/utils/key_mirror';

const NavigationTypes = keyMirror({
    NAVIGATION_PUSH: null,
    NAVIGATION_POP: null,
    NAVIGATION_OPEN_LEFT_DRAWER: null,
    NAVIGATION_OPEN_RIGHT_DRAWER: null,
    NAVIGATION_CLOSE_DRAWERS: null,
    NAVIGATION_JUMP: null,
    NAVIGATION_JUMP_TO_INDEX: null,
    NAVIGATION_REPLACE: null,
    NAVIGATION_RESET: null
});

export default NavigationTypes;
