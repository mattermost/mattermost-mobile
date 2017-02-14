// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {getDirectChannelName} from 'service/utils/channel_utils';
import {createDirectChannel} from 'service/actions/channels';
import {getTeamMember} from 'service/actions/teams';
import {handleSelectChannel, toggleDMChannel} from 'app/actions/views/channel';

export function makeDirectChannel(otherUserId) {
    return async (dispatch, getState) => {
        const state = getState();
        const {currentId} = state.entities.users;
        const channelName = getDirectChannelName(currentId, otherUserId);
        const {channels, myMembers} = state.entities.channels;
        const channel = Object.values(channels).find((c) => c.name === channelName);
        const teamId = state.entities.teams.currentId;

        await getTeamMember(teamId, otherUserId)(dispatch, getState);

        if (channel && myMembers[channel.id]) {
            await toggleDMChannel(otherUserId, 'true')(dispatch, getState);
            handleSelectChannel(channel.id)(dispatch, getState);
        } else {
            const created = await createDirectChannel(teamId, currentId, otherUserId)(dispatch, getState);
            if (created) {
                await toggleDMChannel(otherUserId, 'true')(dispatch, getState);
                handleSelectChannel(created.id)(dispatch, getState);
            }
        }
    };
}
