// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Client4} from '@mm-redux/client';
import {resetToChannel} from '@actions/navigation';

const RESET_TO_CHANNEL = 'RESET_TO_CHANNEL';

export async function doPluginAction(pluginId, requestURL, body) {
    const response = await Client4.executePluginIntegration(pluginId, requestURL, body);
    if (response.action === RESET_TO_CHANNEL) {
        resetToChannel();
    }
}