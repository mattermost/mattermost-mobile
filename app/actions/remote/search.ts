// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {prepareMissingChannelsForAllTeams} from '@queries/servers/channel';
import {getIsCRTEnabled, prepareThreadsFromReceivedPosts} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import {processPostsFetched} from '@utils/post';

import {fetchPostAuthors, fetchMissingChannelsFromPosts} from './post';
import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type Model from '@nozbe/watermelondb/Model';

type PostSearchRequest = {
    error?: unknown;
    order?: string[];
    posts?: Post[];
}

export async function fetchRecentMentions(serverUrl: string): Promise<PostSearchRequest> {
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
        const currentUser = await getCurrentUser(operator.database);
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

        const promises: Array<Promise<Model[]>> = [];
        postsArray = order.map((id) => posts[id]);

        const mentions: IdValue = {
            id: SYSTEM_IDENTIFIERS.RECENT_MENTIONS,
            value: JSON.stringify(order),
        };

        promises.push(operator.handleSystem({
            systems: [mentions],
            prepareRecordsOnly: true,
        }));

        if (postsArray.length) {
            const isCRTEnabled = await getIsCRTEnabled(operator.database);
            if (isCRTEnabled) {
                promises.push(prepareThreadsFromReceivedPosts(operator, postsArray));
            }

            const {authors} = await fetchPostAuthors(serverUrl, postsArray, true);
            const {channels, channelMemberships} = await fetchMissingChannelsFromPosts(serverUrl, postsArray, true);

            if (authors?.length) {
                promises.push(
                    operator.handleUsers({
                        users: authors,
                        prepareRecordsOnly: true,
                    }),
                );
            }

            if (channels?.length && channelMemberships?.length) {
                const channelPromises = prepareMissingChannelsForAllTeams(operator, channels, channelMemberships, isCRTEnabled);
                if (channelPromises.length) {
                    promises.push(...channelPromises);
                }
            }

            promises.push(
                operator.handlePosts({
                    actionType: '',
                    order: [],
                    posts: postsArray,
                    previousPostId: '',
                    prepareRecordsOnly: true,
                }),
            );
        }

        const modelArrays = await Promise.all(promises);
        const models = modelArrays.flatMap((mdls) => {
            if (!mdls || !mdls.length) {
                return [];
            }
            return mdls;
        });

        await operator.batchRecords(models);
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
        data = await client.searchPosts('', params.terms, params.is_or_search);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }

    const result = processPostsFetched(data);
    await operator.handlePosts({
        ...result,
        actionType: '',
    });

    return result;
};
