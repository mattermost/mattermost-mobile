// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {getDirectChannelName} from 'mattermost-redux/utils/channel_utils';
import {createDirectChannel, createGroupChannel} from 'mattermost-redux/actions/channels';
import {getProfilesByIds, getStatusesByIds} from 'mattermost-redux/actions/users';
import {handleSelectChannel, toggleDMChannel, toggleGMChannel} from 'app/actions/views/channel';

export function makeDirectChannel(otherUserId) {
    return async (dispatch, getState) => {
        const state = getState();
        const {currentUserId} = state.entities.users;
        const channelName = getDirectChannelName(currentUserId, otherUserId);
        const {channels, myMembers} = state.entities.channels;

        dispatch(getProfilesByIds([otherUserId]));
        dispatch(getStatusesByIds([otherUserId]));

        let result;
        let channel = Object.values(channels).find((c) => c.name === channelName);
        if (channel && myMembers[channel.id]) {
            result = {data: channel};

            dispatch(toggleDMChannel(otherUserId, 'true', channel.id));
        } else {
            result = await createDirectChannel(currentUserId, otherUserId)(dispatch, getState);
            channel = result.data;
        }

        if (channel) {
            dispatch(handleSelectChannel(channel.id));
        }

        return result;
    };
}

export function makeGroupChannel(otherUserIds) {
    return async (dispatch, getState) => {
        const state = getState();
        const {currentUserId} = state.entities.users;

        dispatch(getProfilesByIds(otherUserIds));
        dispatch(getStatusesByIds(otherUserIds));

        const result = await createGroupChannel([currentUserId, ...otherUserIds])(dispatch, getState);
        const channel = result.data;

        if (channel) {
            dispatch(toggleGMChannel(channel.id, 'true'));
            dispatch(handleSelectChannel(channel.id));
        }

        return result;
    };
}
