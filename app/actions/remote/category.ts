// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {storeCategories} from '@actions/local/category';
import {Client} from '@app/client/rest';
import NetworkManager from '@init/network_manager';

import {forceLogoutIfNecessary} from './session';

export type MyCategoriesRequest = {
    categories?: CategoryWithChannels[];
    error?: unknown;
}

export const fetchMyCategories = async (serverUrl: string, teamId: string, fetchOnly = false): Promise<MyCategoriesRequest> => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const categories = await client.getCategories('me', teamId);

        if (!fetchOnly) {
            storeCategories(serverUrl, categories.categories);
        }

        return {categories: categories.categories};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
