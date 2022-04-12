// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';

import {Client} from '@client/rest';

export const getGroupsForAutocomplete = async (serverUrl: string, channelId: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return [];
    }

    return client.getAllGroupsAssociatedToChannel(channelId, true);
};
