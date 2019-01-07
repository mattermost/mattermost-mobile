// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {UserTypes} from 'mattermost-redux/action_types';
import {getStatus, getStatusesByIds, startPeriodicStatusUpdates} from 'mattermost-redux/actions/users';
import {General} from 'mattermost-redux/constants';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

export function setCurrentUserStatus(isOnline) {
    return (dispatch, getState) => {
        const currentUserId = getCurrentUserId(getState());

        if (isOnline) {
            return dispatch(getStatus(currentUserId));
        }

        return dispatch({
            type: UserTypes.RECEIVED_STATUS,
            data: {
                user_id: currentUserId,
                status: General.OFFLINE,
            },
        });
    };
}

export function initUserStatuses() {
    return (dispatch, getState) => {
        const {statuses} = getState().entities.users || {};
        const userIds = Object.keys(statuses);

        if (userIds.length) {
            dispatch(getStatusesByIds(userIds));
        }

        dispatch(startPeriodicStatusUpdates());
    };
}
