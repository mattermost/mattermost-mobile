// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {LoginTypes as types} from 'constants';

export const initState = {
    status: 'not fetched',
    error: null
};

export default function reduceLogin(state = initState, action) {
    switch (action.type) {

    case types.LOGIN_REQUEST:
        return {...state,
            status: 'fetching',
            error: null
        };
    case types.LOGIN_SUCCESS:
        return {...state,
            status: 'fetched'
        };
    case types.LOGIN_FAILURE:
        return {...state,
            status: 'failed',
            error: action.error
        };

    default:
        return state;
    }
}
