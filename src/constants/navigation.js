// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keymirror from 'keymirror';

const NavigationTypes = keymirror({
    NAVIGATION_PUSH: null,
    NAVIGATION_POP: null,
    NAVIGATION_JUMP: null,
    NAVIGATION_JUMP_TO_INDEX: null,
    NAVIGATION_RESET: null
});

export default NavigationTypes;
