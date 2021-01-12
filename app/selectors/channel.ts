// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {getCurrentUserId, getUser} from '@mm-redux/selectors/entities/users';
import {getChannelByName} from '@mm-redux/selectors/entities/channels';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getTeamByName} from '@mm-redux/selectors/entities/teams';
import {GlobalState} from '@mm-redux/types/store';
import {Channel} from '@mm-redux/types/channels';
import {isArchivedChannel} from '@mm-redux/utils/channel_utils';

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
    getConfig,
    (team, channel, config) => {
        if (!(team && channel)) {
            return false;
        }
        const viewArchivedChannels = config.ExperimentalViewArchivedChannels === 'true';
        if (isArchivedChannel(channel) && !viewArchivedChannels) {
            return false;
        }
        return true;
    },
);
