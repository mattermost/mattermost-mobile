// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {GlobalState} from '@mm-redux/types/store';
import {PluginIntegration} from '@mm-redux/types/plugins';
export function getPluginIntegrations(state: GlobalState, location?: string): PluginIntegration[] {
    if (location) {
        return state.entities.plugins.mobilePluginIntegrations.filter((p) => {
            return p.location === location;
        });
    }
    return state.entities.plugins.mobilePluginIntegrations;
}
