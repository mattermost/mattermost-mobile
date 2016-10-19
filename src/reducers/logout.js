// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {LogoutTypes as types} from 'constants';

export const initState = {
    status: 'not fetched',
    error: null
};

export default function reduceLogout(state = initState, action) {
    switch (action.type) {
    case types.LOGOUT_REQUEST:
        return {...state,
            status: 'fetching',
            error: null
        };
    case types.LOGOUT_SUCCESS:
        return {...state,
            status: 'fetched'
        };
    case types.LOGOUT_FAILURE:
        return {...state,
            status: 'failed',
            error: action.error
        };

    default:
        return state;
    }
}
