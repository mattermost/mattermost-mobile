// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

/**
 * Fetches the channel access control attributes for a specific channel
 * @param serverUrl - The server URL
 * @param channelId - The ID of the channel
 * @returns The channel access control attributes or an error
 */
export async function fetchChannelAccessControlAttributes(serverUrl: string, channelId: string) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const attributes = await client.getChannelAccessControlAttributes(channelId);
        return {attributes};
    } catch (error) {
        logDebug('error on fetchChannelAccessControlAttributes', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}
