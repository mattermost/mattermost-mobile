// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model from '@nozbe/watermelondb/Model';

import {processPostsFetched} from '@actions/local/post';
import {SYSTEM_IDENTIFIERS} from '@app/constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryCurrentUser} from '@queries/servers/user';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';

type PostSearchRequest = {
    error?: unknown;
    order?: string[];
    posts?: Post[];
}

export async function getRecentMentions(serverUrl: string): Promise<PostSearchRequest> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;

    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    let posts = [];
    let order = [];

    try {
        const currentUser = await queryCurrentUser(operator.database);
        if (!currentUser) {
            return {
                posts: [],
                order: [],
            };
        }
        const terms = currentUser.mentionKeys.map(({key}) => key).join(' ').trim() + ' ';
        const data = await client.searchPosts('', terms, true);
        posts = data.posts;
        order = data.order;

        const models: Model[] = [];

        const postModels = await operator.handlePosts({
            actionType: '',
            order: [],
            posts,
            previousPostId: '',
            prepareRecordsOnly: true,
        });

        const mentions: IdValue = {
            id: SYSTEM_IDENTIFIERS.RECENT_MENTIONS,
            value: JSON.stringify(order),
        };

        const mentionModels = await operator.handleSystem({
            systems: [mentions],
            prepareRecordsOnly: true,
        });

        models.push(...mentionModels);

        if (postModels) {
            models.push(...postModels);
        }

        if (models.length) {
            await operator.batchRecords(models);
        }
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }

    return {
        order,
        posts,
    };
}

export const searchPosts = async (serverUrl: string, params: PostSearchParams): Promise<PostSearchRequest> => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    let data;
    try {
        data = await client.searchPosts('', params.terms, params.is_or_search);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }

    return processPostsFetched(serverUrl, '', data, false);
};
