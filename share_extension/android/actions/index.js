// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {fetchMyChannelsAndMembers} from 'mattermost-redux/actions/channels';

import {ViewTypes} from 'app/constants';
import {getDefaultChannelForTeam} from 'share_extension/android/selectors';

export function getTeamChannels(teamId) {
    return async (dispatch, getState) => {
        let defaultChannel = getDefaultChannelForTeam(getState(), teamId);

        if (!defaultChannel) {
            await fetchMyChannelsAndMembers(teamId)(dispatch, getState);
            defaultChannel = getDefaultChannelForTeam(getState(), teamId);
        }

        return defaultChannel.id;
    };
}

export function extensionSelectTeamId(teamId) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.EXTENSION_SELECTED_TEAM_ID,
            data: teamId,
        }, getState);
    };
}
