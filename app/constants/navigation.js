// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'mattermost-redux/utils/key_mirror';

const NavigationTypes = keyMirror({
    NAVIGATION_RESET: null,
    NAVIGATION_CLOSE_MODAL: null,
    NAVIGATION_NO_TEAMS: null,
    RESTART_APP: null,
});

export default NavigationTypes;
