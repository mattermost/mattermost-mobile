// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keymirror from 'keymirror';

const ChannelTypes = keymirror({
    CHANNELS_REQUEST: null,
    CHANNELS_SUCCESS: null,
    CHANNELS_FAILURE: null,
    CHANNEL_MEMBERS_REQUEST: null,
    CHANNEL_MEMBERS_SUCCESS: null,
    CHANNEL_MEMBERS_FAILURE: null,

    SELECTED_CHANNEL: null,
    RECEIVED_CHANNEL: null,
    RECEIVED_CHANNELS: null,
    RECEIVED_MY_CHANNNEL_MEMBERS: null,
    RECEIVED_MY_CHANNEL_MEMBER: null,
    RECEIVED_MORE_CHANNLES: null,
    RECEIVED_CHANNEL_STATS: null
});

export default ChannelTypes;
