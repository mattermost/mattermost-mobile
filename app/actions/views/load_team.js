// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';

export function initialize() {
    return async (dispatch, getState) => {
        setTimeout(() => {
            dispatch({
                type: ViewTypes.APPLICATION_INITIALIZED
            }, getState);
        }, 400);
    };
}
