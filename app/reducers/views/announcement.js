// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ViewTypes} from '@constants';

export default function banner(state = '', action) {
    switch (action.type) {
    case ViewTypes.ANNOUNCEMENT_BANNER:
        return action.data;
    default:
        return state;
    }
}
