// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';

export default function notification(state = null, action) {
    switch (action.type) {
    case ViewTypes.NOTIFICATION_CHANGED:
        return action.data;
    default:
        return state;
    }
}
