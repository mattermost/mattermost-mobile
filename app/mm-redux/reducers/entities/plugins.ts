// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {combineReducers} from 'redux';
import {PluginTypes} from '@mm-redux/action_types';
import {PluginTrigger, PluginsState} from '@mm-redux/types/plugins';
import {GenericAction} from '@mm-redux/types/actions';

function mobilePlugins(state: PluginTrigger[] = [], action: GenericAction): PluginTrigger[] {
    switch (action.type) {
    case PluginTypes.RECEIVED_MOBILE_PLUGINS: {
        return action.data
    }
    default:
        return state;
    }
}

export default (combineReducers({
    mobilePlugins,
}) as (b: PluginsState, a: GenericAction) => PluginsState);