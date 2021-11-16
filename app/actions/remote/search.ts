// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@app/constants/database';
import {ActionType} from '@constants';
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

    let data;

    try {
        const currentUser = await queryCurrentUser(operator.database);
        if (!currentUser) {
            return {
                posts: [],
                order: [],
            };
        }
        const terms = currentUser.mentionKeys.map(({key}) => key).join(' ').trim() + ' ';
        data = await client.searchPosts(terms, true);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }

    const {posts, order} = await processPostsFetched(serverUrl, ActionType.SEARCH.RECEIVED_MENTIONS, data);

    const mentions: IdValue = {
        id: SYSTEM_IDENTIFIERS.RECENT_MENTIONS,
        value: JSON.stringify(order),
    };

    await operator.handleSystem({
        systems: [mentions],
        prepareRecordsOnly: false,
    });

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
        data = await client.searchPosts(params.terms, params.is_or_search);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }

    return processPostsFetched(serverUrl, ActionType.SEARCH.RECEIVED_POSTS, data);
};

const processPostsFetched = async (serverUrl: string, actionType: string, data: {order: string[]; posts: Post[]}, fetchOnly = false) => {
    const order = data.order;
    const posts = Object.values(data.posts) as Post[];

    if (!fetchOnly) {
        const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        if (operator) {
            await operator.handlePosts({
                actionType,
                order: [],
                posts,
                previousPostId: undefined,
            });
        }
    }

    return {
        posts,
        order,
    };
};
