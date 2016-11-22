// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {SelectServerActions} from 'constants/view_actions.js';

export function handleServerUrlChanged(serverUrl) {
    return async (dispatch, getState) => {
        dispatch({
            type: SelectServerActions.SERVER_URL_CHANGED,
            serverUrl
        }, getState);
    };
}

export default {
    handleServerUrlChanged
};
