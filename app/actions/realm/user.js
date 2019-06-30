// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';
import {UserTypes} from 'mattermost-redux/action_types';

export function getMe() {
    return async (dispatch) => {
        try {
            const user = await Client4.getMe();
            const status = await Client4.getStatus(user.id);
            dispatch({
                type: UserTypes.RECEIVED_ME,
                data: {
                    ...user,
                    status: status.status,
                },
            });
        } catch (e) {
            // handle logout here
        }
    };
}
