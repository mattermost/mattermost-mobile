// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AppsTypes from '@mm-redux/action_types/apps';
import {fetchAppBindings, fetchThreadAppBindings} from '@mm-redux/actions/apps';
import {getThreadAppsBindingsChannelId} from '@mm-redux/selectors/entities/apps';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/common';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {ActionResult, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';

export function handleRefreshAppsBindings() {
    return (dispatch: DispatchFunc, getState: GetStateFunc): ActionResult => {
        const state = getState();
        dispatch(fetchAppBindings(getCurrentUserId(state), getCurrentChannelId(state)));

        const threadChannelID = getThreadAppsBindingsChannelId(state);
        if (threadChannelID) {
            dispatch(fetchThreadAppBindings(getCurrentUserId(state), threadChannelID));
        }

        return {data: true};
    };
}

export function handleAppsPluginEnabled() {
    return (dispatch: DispatchFunc, getState: GetStateFunc): ActionResult => {
        dispatch({
            type: AppsTypes.APPS_PLUGIN_ENABLED,
        });

        const state = getState();
        dispatch(fetchAppBindings(getCurrentUserId(state), getCurrentChannelId(state)));

        return {data: true};
    };
}

export function handleAppsPluginDisabled() {
    return {
        type: AppsTypes.APPS_PLUGIN_DISABLED,
    };
}
