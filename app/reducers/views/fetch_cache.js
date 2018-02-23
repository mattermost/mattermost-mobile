// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';

export default function fetchCache(state = {}, action) {
    switch (action.type) {
    case ViewTypes.ADD_FILE_TO_FETCH_CACHE:
        return {
            ...state,
            [action.url]: true,
        };
    default:
        return state;
    }
}
