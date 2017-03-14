// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {addChannelMember} from 'mattermost-redux/actions/channels';

export function handleAddChannelMembers(teamId, channelId, members) {
    return async (dispatch, getState) => {
        try {
            const requests = members.map((m) => dispatch(addChannelMember(teamId, channelId, m, getState)));

            await Promise.all(requests);
        } catch (error) {
            // should be handled by global error handling
        }
    };
}
