// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'service/utils/key_mirror';

const NavigationTypes = keyMirror({
    NAVIGATION_PUSH: null,
    NAVIGATION_POP: null,
    NAVIGATION_JUMP: null,
    NAVIGATION_JUMP_TO_INDEX: null,
    NAVIGATION_RESET: null
});

export default NavigationTypes;
