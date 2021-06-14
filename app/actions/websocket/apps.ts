// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAppBindings} from '@mm-redux/actions/apps';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/common';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {ActionResult, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';
import {appsEnabled} from '@utils/apps';

export function handleRefreshAppsBindings() {
    return (dispatch: DispatchFunc, getState: GetStateFunc): ActionResult => {
        const state = getState();
        if (appsEnabled(state)) {
            dispatch(fetchAppBindings(getCurrentUserId(state), getCurrentChannelId(state)));
        }
        return {data: true};
    };
}
