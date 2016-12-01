// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Client from 'client';
import {UsersTypes} from 'constants';
const HTTP_UNAUTHORIZED = 401;

export function profilesToSet(state, action) {
    const nextState = {...state};
    if (action.offset != null && action.count != null) {
        nextState.offset = action.offset + action.count;
        nextState.count += action.count;
    }
    Object.keys(action.data).forEach((key) => {
        if (!nextState.items.has(key)) {
            nextState.items.add(key);
        }
    });
    return nextState;
}

export async function forceLogoutIfNecessary(err, dispatch) {
    if (err.status_code === HTTP_UNAUTHORIZED && err.url.indexOf('/login') === -1) {
        await Client.logout();
        dispatch({type: UsersTypes.LOGOUT_SUCCESS});
    }
}
