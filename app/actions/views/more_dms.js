// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {getDirectChannelName} from 'mattermost-redux/utils/channel_utils';
import {createDirectChannel} from 'mattermost-redux/actions/channels';
import {getProfilesByIds, getStatusesByIds} from 'mattermost-redux/actions/users';
import {handleSelectChannel, toggleDMChannel} from 'app/actions/views/channel';

export function makeDirectChannel(otherUserId) {
    return async (dispatch, getState) => {
        const state = getState();
        const {currentUserId} = state.entities.users;
        const channelName = getDirectChannelName(currentUserId, otherUserId);
        const {channels, myMembers} = state.entities.channels;
        const channel = Object.values(channels).find((c) => c.name === channelName);
        const {currentTeamId} = state.entities.teams;

        getProfilesByIds([otherUserId])(dispatch, getState);
        getStatusesByIds([otherUserId])(dispatch, getState);

        if (channel && myMembers[channel.id]) {
            await toggleDMChannel(otherUserId, 'true')(dispatch, getState);
            handleSelectChannel(channel.id)(dispatch, getState);
        } else {
            const created = await createDirectChannel(currentTeamId, currentUserId, otherUserId)(dispatch, getState);
            if (created) {
                await toggleDMChannel(otherUserId, 'true')(dispatch, getState);
                handleSelectChannel(created.id)(dispatch, getState);
            }
        }
    };
}
