// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {combineReducers} from 'redux';
import {PluginTypes} from '@mm-redux/action_types';
import {PluginIntegration, PluginsState} from '@mm-redux/types/plugins';
import {GenericAction} from '@mm-redux/types/actions';

function mobilePluginIntegrations(state: PluginIntegration[] = [], action: GenericAction): PluginIntegration[] {
    switch (action.type) {
    case PluginTypes.RECEIVED_PLUGIN_INTEGRATIONS: {
        return action.data;
    }
    case PluginTypes.REMOVE_PLUGIN_INTEGRATIONS: {
        return [];
    }
    default:
        return state;
    }
}

export default (combineReducers({
    mobilePluginIntegrations,
}) as (b: PluginsState, a: GenericAction) => PluginsState);
