// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {handleSelectChannel, setChannelDisplayName} from './channel';
import {createChannel} from 'mattermost-redux/actions/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {cleanUpUrlable} from 'mattermost-redux/utils/channel_utils';
import {generateId} from 'mattermost-redux/utils/helpers';

export function generateChannelNameFromDisplayName(displayName) {
    let name = cleanUpUrlable(displayName);

    if (name === '') {
        name = generateId();
    }

    return name;
}

export function handleCreateChannel(displayName, purpose, header, type) {
    return async (dispatch, getState) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);
        const teamId = getCurrentTeamId(state);
        const channel = {
            team_id: teamId,
            name: generateChannelNameFromDisplayName(displayName),
            display_name: displayName,
            purpose,
            header,
            type,
        };

        const {data} = await dispatch(createChannel(channel, currentUserId));
        if (data && data.id) {
            dispatch(setChannelDisplayName(displayName));
            dispatch(handleSelectChannel(data.id));
        }
    };
}
