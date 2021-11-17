// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAppBindings, fetchThreadAppBindings} from '@mm-redux/actions/apps';
import {getThreadAppsBindingsChannelId} from '@mm-redux/selectors/entities/apps';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/common';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {ActionResult, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';
import {appsEnabled} from '@utils/apps';

export function handleRefreshAppsBindings() {
    return (dispatch: DispatchFunc, getState: GetStateFunc): ActionResult => {
        const state = getState();
        if (!appsEnabled(state)) {
            return {data: true};
        }

        dispatch(fetchAppBindings(getCurrentUserId(state), getCurrentChannelId(state)));

        const threadChannelID = getThreadAppsBindingsChannelId(state);
        if (threadChannelID) {
            dispatch(fetchThreadAppBindings(getCurrentUserId(state), threadChannelID));
        }

        return {data: true};
    };
}
