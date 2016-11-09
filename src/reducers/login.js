// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {LoginTypes, LogoutTypes} from 'constants';

export const initState = {
    status: 'not fetched',
    error: null
};

export default function reduceLogin(state = initState, action) {
    switch (action.type) {

    case LoginTypes.LOGIN_REQUEST:
        return {...state,
            status: 'fetching',
            error: null
        };
    case LoginTypes.LOGIN_SUCCESS:
        return {...state,
            status: 'fetched'
        };
    case LoginTypes.LOGIN_FAILURE:
        return {...state,
            status: 'failed',
            error: action.error
        };

    case LogoutTypes.LOGOUT_SUCCESS:
        return initState;
    default:
        return state;
    }
}
