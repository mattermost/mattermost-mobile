// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import keyMirror from '@mm-redux/utils/key_mirror';

export default keyMirror({
    RECEIVED_CALLS: null,
    RECEIVED_CALL_STARTED: null,
    RECEIVED_CALL_FINISHED: null,
    RECEIVED_CHANNEL_CALL_ENABLED: null,
    RECEIVED_CHANNEL_CALL_DISABLED: null,
    RECEIVED_CHANNEL_CALL_SCREEN_ON: null,
    RECEIVED_CHANNEL_CALL_SCREEN_OFF: null,
    RECEIVED_JOINED_CALL: null,
    RECEIVED_LEFT_CALL: null,
    RECEIVED_MYSELF_JOINED_CALL: null,
    RECEIVED_MYSELF_LEFT_CALL: null,
    RECEIVED_MUTE_USER_CALL: null,
    RECEIVED_UNMUTE_USER_CALL: null,
    RECEIVED_VOICE_ON_USER_CALL: null,
    RECEIVED_VOICE_OFF_USER_CALL: null,
    RECEIVED_RAISE_HAND_CALL: null,
    RECEIVED_UNRAISE_HAND_CALL: null,
    SET_SCREENSHARE_URL: null,
});
