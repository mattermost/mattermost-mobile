// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {makeDirectChannel} from 'app/actions/views/more_dms';

export function handleSendMessage(otherUserId) {
    return async (dispatch, getState) => {
        await makeDirectChannel(otherUserId)(dispatch, getState);
    };
}
