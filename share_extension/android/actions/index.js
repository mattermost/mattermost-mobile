// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getRedirectChannelForTeam} from '@mm-redux/selectors/entities/channels';

import {getMyChannelsAndMembersForTeam} from '@actions/channels';
import {ViewTypes} from 'app/constants';

export function getDefaultChannelForTeam(teamId) {
    return async (dispatch, getState) => {
        await dispatch(getMyChannelsAndMembersForTeam(teamId));

        const state = getState();
        const redirectChannel = getRedirectChannelForTeam(state, teamId);

        return redirectChannel;
    };
}

export function extensionSelectTeamId(teamId) {
    return {
        type: ViewTypes.EXTENSION_SELECTED_TEAM_ID,
        data: teamId,
    };
}
