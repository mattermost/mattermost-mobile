// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model from '@nozbe/watermelondb/Model';

import {processPostsFetched} from '@actions/local/post';
import {prepareMissingChannelsForAllTeams} from '@app/queries/servers/channel';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryCurrentUser} from '@queries/servers/user';

import {fetchPostAuthors, getMissingChannelsFromPosts} from './post';
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

    let posts: Record<string, Post> = {};
    let postsArray: Post[] = [];
    let order: string[] = [];

    try {
        const currentUser = await queryCurrentUser(operator.database);
        if (!currentUser) {
            return {
                posts: [],
                order: [],
            };
        }
        const terms = currentUser.userMentionKeys.map(({key}) => key).join(' ').trim() + ' ';
        const data = await client.searchPosts('', terms, true);

        posts = data.posts || {};
        order = data.order || [];

        const models: Model[] = [];
        let postModels: Model[] = [];
        let userModels: Model[] = [];
        let channelModelsArray: Model[][] = [[]];

        postsArray = order.map((id) => posts[id]);

        if (postsArray.length) {
            const {authors} = await fetchPostAuthors(serverUrl, postsArray, true);
            const {channels, channelMemberships} = await getMissingChannelsFromPosts(serverUrl, postsArray, true) as {channels: Channel[]; channelMemberships: ChannelMembership[]};

            if (authors?.length) {
                userModels = await operator.handleUsers({
                    users: authors,
                    prepareRecordsOnly: true,
                });
            }

            if (channels?.length && channelMemberships?.length) {
                const promises = prepareMissingChannelsForAllTeams(operator, channels, channelMemberships) as Array<Promise<Model[]>>;
                channelModelsArray = await Promise.all(promises);
            }

            postModels = await operator.handlePosts({
                actionType: '',
                order: [],
                posts: postsArray,
                previousPostId: '',
                prepareRecordsOnly: true,
            });
        }

        const mentions: IdValue = {
            id: SYSTEM_IDENTIFIERS.RECENT_MENTIONS,
            value: JSON.stringify(order),
        };

        const mentionModels = await operator.handleSystem({
            systems: [mentions],
            prepareRecordsOnly: true,
        });

        models.push(...userModels);
        models.push(...postModels);
        models.push(...channelModelsArray.flat());
        models.push(...mentionModels);

        if (models.length) {
            await operator.batchRecords(models);
        }
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }

    return {
        order,
        posts: postsArray,
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
