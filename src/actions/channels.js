// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindClientFunc} from './helpers.js';
import Client from 'client/client_instance';
import {ChannelsTypes} from 'constants';

export function selectChannel(channel) {
    return {
        type: ChannelsTypes.SELECT_CHANNEL,
        channelId: channel.id
    };
}

export function fetchChannels() {
    return bindClientFunc(
        Client.fetchChannels,
        ChannelsTypes.FETCH_CHANNELS_REQUEST,
        ChannelsTypes.FETCH_CHANNELS_SUCCESS,
        ChannelsTypes.FETCH_CHANNELS_FAILURE
    );
}
