// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {UserTypes} from 'mattermost-redux/action_types';
import {General} from 'mattermost-redux/constants';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

export function setCurrentUserStatusOffline() {
    return (dispatch, getState) => {
        const currentUserId = getCurrentUserId(getState());

        return dispatch({
            type: UserTypes.RECEIVED_STATUS,
            data: {
                user_id: currentUserId,
                status: General.OFFLINE,
            },
        });
    };
}
