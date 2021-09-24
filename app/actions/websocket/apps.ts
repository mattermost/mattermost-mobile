// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import AppsTypes from '@mm-redux/action_types/apps';
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

export function pingAppsPlugin() {
    return async (dispatch: DispatchFunc) => {
        try {
            await Client4.pingAppsPlugin();
        } catch (err) {
            dispatch({type: AppsTypes.APPS_PLUGIN_DISABLED});
            return {error: err};
        }

        dispatch({type: AppsTypes.APPS_PLUGIN_ENABLED});
        return {data: true};
    };
}
