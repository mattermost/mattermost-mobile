// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ChannelTypes} from 'constants';
import {batchActions} from 'redux-batched-actions';
import Client from 'client';

export function fetchMyChannelsAndMembers(teamId) {
    return async (dispatch, getState) => {
        try {
            const channels = Client.getChannels(teamId);
            const channelMembers = Client.getMyChannelMembers(teamId);

            dispatch(batchActions([
                {
                    type: ChannelTypes.CHANNELS_REQUEST
                },
                {
                    type: ChannelTypes.CHANNEL_MEMBERS_REQUEST
                }
            ]), getState);

            dispatch(batchActions([
                {
                    type: ChannelTypes.RECEIVED_CHANNELS,
                    teamId,
                    channels: await channels
                },
                {
                    type: ChannelTypes.CHANNELS_SUCCESS
                },
                {
                    type: ChannelTypes.RECEIVED_MY_CHANNNEL_MEMBERS,
                    teamId,
                    channelMembers: await channelMembers
                },
                {
                    type: ChannelTypes.CHANNEL_MEMBERS_SUCCESS
                }
            ]), getState);
        } catch (error) {
            // console.error(err); // eslint-disable-line no-console
            dispatch(batchActions([
                {
                    type: ChannelTypes.CHANNELS_FAILURE,
                    error
                },
                {
                    type: ChannelTypes.CHANNEL_MEMBERS_FAILURE,
                    error
                }
            ]), getState);
        }
    };
}
