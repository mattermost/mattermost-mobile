// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindClientFunc} from './helpers.js';
import Client from 'client/client_instance';
import {ChannelsTypes as types} from 'constants';

export function selectChannel(channel) {
    return {
        type: types.SELECT_CHANNEL,
        channelId: channel.id
    };
}

export function fetchChannels() {
    return bindClientFunc(
        Client.fetchChannels,
        types.FETCH_CHANNELS_REQUEST,
        types.FETCH_CHANNELS_SUCCESS,
        types.FETCH_CHANNELS_FAILURE
    );
}
