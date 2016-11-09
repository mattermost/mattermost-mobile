// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ChannelTypes} from 'constants';
import {batchActions} from 'redux-batched-actions';
import Client from 'client/client_instance.js';

export function fetchMyChannelsAndMembers(teamId) {
    return async (dispatch, getState) => {
        try {
            const channels = Client.getChannels(teamId);
            const channelMembers = Client.getMyChannelMembers(teamId);

            dispatch(batchActions([
                {
                    type: ChannelTypes.CHANNELS_RECEIVED,
                    teamId,
                    channels: await channels
                },
                {
                    type: ChannelTypes.CHANNEL_MEMBERS_RECEIVED,
                    teamId,
                    channelMembers: await channelMembers
                }
            ]), getState);
        } catch (err) {
            console.error(err); // eslint-disable-line no-console
        }
    };
}
