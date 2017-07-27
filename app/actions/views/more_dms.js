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

        getProfilesByIds([otherUserId])(dispatch, getState);
        getStatusesByIds([otherUserId])(dispatch, getState);

        let result;
        let channel = Object.values(channels).find((c) => c.name === channelName);
        if (channel && myMembers[channel.id]) {
            result = {data: channel};

            toggleDMChannel(otherUserId, 'true')(dispatch, getState);
        } else {
            result = await createDirectChannel(currentUserId, otherUserId)(dispatch, getState);
            channel = result.data;
        }

        if (channel) {
            handleSelectChannel(channel.id)(dispatch, getState);
        }

        return result;
    };
}

export function makeGroupChannel(otherUserIds) {
    return async (dispatch, getState) => {
        const state = getState();
        const {currentUserId} = state.entities.users;

        getProfilesByIds(otherUserIds)(dispatch, getState);
        getStatusesByIds(otherUserIds)(dispatch, getState);

        const result = await createGroupChannel([currentUserId, ...otherUserIds])(dispatch, getState);
        const channel = result.data;

        if (channel) {
            toggleGMChannel(channel.id, 'true')(dispatch, getState);
            handleSelectChannel(channel.id)(dispatch, getState);
        }

        return result;
    };
}
