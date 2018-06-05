// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ViewTypes} from 'app/constants';
import {UserTypes} from 'mattermost-redux/action_types';

export default function search(state = '', action) {
    switch (action.type) {
    case ViewTypes.SEARCH_DRAFT_CHANGED: {
        return action.text;
    }
    case UserTypes.LOGOUT_SUCCESS:
        return '';

    default:
        return state;
    }
}
