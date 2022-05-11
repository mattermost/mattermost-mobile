// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client} from '@client/rest';
import NetworkManager from '@managers/network_manager';

export const getGroupsForAutocomplete = async (serverUrl: string, query: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return [];
    }

    return client.getGroups(query);
};
