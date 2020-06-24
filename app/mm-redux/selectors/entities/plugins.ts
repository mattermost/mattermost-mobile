// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {GlobalState} from '@mm-redux/types/store';
import {PluginTrigger} from '@mm-redux/types/plugins';
export function getAllPlugins(state: GlobalState): PluginTrigger[] {
    return state.entities.plugins.mobilePlugins;
}
