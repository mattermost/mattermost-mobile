// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannelsAndMembers} from 'mattermost-redux/actions/channels';

import {loadProfilesAndTeamMembersForDMSidebar} from 'app/actions/views/channel';
import {ViewTypes} from 'app/constants';
import {getDefaultChannelForTeam} from 'share_extension/common/selectors';

export function getTeamChannels(teamId) {
    return async (dispatch, getState) => {
        await dispatch(fetchMyChannelsAndMembers(teamId));
        dispatch(loadProfilesAndTeamMembersForDMSidebar(teamId));
        const defaultChannel = getDefaultChannelForTeam(getState(), teamId);

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
