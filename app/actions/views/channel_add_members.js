// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {addChannelMember} from '@mm-redux/actions/channels';

export function handleAddChannelMembers(channelId, members) {
    return async (dispatch) => {
        try {
            const requests = members.map((m) => dispatch(addChannelMember(channelId, m)));

            return await Promise.all(requests);
        } catch (error) {
            return error;
        }
    };
}
