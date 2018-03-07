// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {handleSelectChannel, setChannelDisplayName} from './channel';
import {createChannel} from 'mattermost-redux/actions/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {cleanUpUrlable} from 'mattermost-redux/utils/channel_utils';

export function handleCreateChannel(displayName, purpose, header, type) {
    return async (dispatch, getState) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);
        const teamId = getCurrentTeamId(state);
        const channel = {
            team_id: teamId,
            name: cleanUpUrlable(displayName),
            display_name: displayName,
            purpose,
            header,
            type,
        };

        const {data} = await createChannel(channel, currentUserId)(dispatch, getState);
        if (data && data.id) {
            dispatch(setChannelDisplayName(displayName));
            handleSelectChannel(data.id)(dispatch, getState);
        }
    };
}
