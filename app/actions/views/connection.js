// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';

export function connection(isOnline) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.CONNECTION_CHANGED,
            data: isOnline
        }, getState);
    };
}
