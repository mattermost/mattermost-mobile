// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {getCurrentUserId, getUser} from '@mm-redux/selectors/entities/users';
import {getChannelByName} from '@mm-redux/selectors/entities/channels';
import {getTeamByName} from '@mm-redux/selectors/entities/teams';
import {GlobalState} from '@mm-redux/types/store';
import {Channel} from '@mm-redux/types/channels';

const getOtherUserIdForDm = createSelector(
    (state:GlobalState, channel: Channel) => channel,
    getCurrentUserId,
    (channel, currentUserId) => {
        if (!channel) {
            return '';
        }

        return channel.name.split('__').find((m) => m !== currentUserId) || currentUserId;
    },
);

export const getChannelMembersForDm = createSelector(
    (state: GlobalState, channel: Channel) => getUser(state, getOtherUserIdForDm(state, channel)),
    (otherUser) => {
        if (!otherUser) {
            return [];
        }

        return [otherUser];
    },
);

export const getChannelNameForSearchAutocomplete = createSelector(
    (state: GlobalState, channelId: string) => state.entities.channels.channels[channelId],
    (channel) => {
        if (channel && channel.display_name) {
            return channel.display_name;
        }
        return '';
    },
);

const getTeam = (state: GlobalState, channelName: string, teamName: string) => getTeamByName(state, teamName);
const getChannel = (state: GlobalState, channelName: string) => getChannelByName(state, channelName);

export const getChannelReachable = createSelector(
    getTeam,
    getChannel,
    (team, channel) => team && channel,
);
