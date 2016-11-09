// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {LogoutTypes} from 'constants';

export const initState = {
    status: 'not fetched',
    error: null
};

export default function reduceLogout(state = initState, action) {
    switch (action.type) {
    case LogoutTypes.LOGOUT_REQUEST:
        return {...state,
            status: 'fetching',
            error: null
        };
    case LogoutTypes.LOGOUT_SUCCESS:
        return {...state,
            status: 'fetched'
        };
    case LogoutTypes.LOGOUT_FAILURE:
        return {...state,
            status: 'failed',
            error: action.error
        };

    default:
        return state;
    }
}
