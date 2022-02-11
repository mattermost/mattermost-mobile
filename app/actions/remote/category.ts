// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeCategories} from '@actions/local/category';
import NetworkManager from '@init/network_manager';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';

export type CategoriesRequest = {
     categories?: CategoryWithChannels[];
     error?: unknown;
 }

export const fetchCategories = async (serverUrl: string, teamId: string, fetchOnly = false): Promise<CategoriesRequest> => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const {categories} = await client.getCategories('me', teamId);

        if (!fetchOnly) {
            storeCategories(serverUrl, categories);
        }

        return {categories};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
