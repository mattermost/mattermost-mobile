// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {removeChannelMember} from 'mattermost-redux/actions/channels';

export function handleRemoveChannelMembers(teamId, channelId, members) {
    return async (dispatch, getState) => {
        try {
            const requests = members.map((m) => dispatch(removeChannelMember(teamId, channelId, m, getState)));

            await Promise.all(requests);
        } catch (error) {
            // should be handled by global error handling
        }
    };
}
