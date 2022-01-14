// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import AppsTypes from '@mm-redux/action_types/apps';
import {refreshAppBindings} from '@mm-redux/actions/apps';
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

        dispatch(refreshAppBindings(getCurrentUserId(state), getCurrentChannelId(state)));
        return {data: true};
    };
}

export function handleAppsPluginEnabled() {
    return {
        type: AppsTypes.APPS_PLUGIN_ENABLED,
    };
}

export function handleAppsPluginDisabled() {
    return {
        type: AppsTypes.APPS_PLUGIN_DISABLED,
    };
}
