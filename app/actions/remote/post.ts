// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType, General} from '@constants';
import DatabaseManager from '@database/manager';
import {getNeededAtMentionedUsernames} from '@helpers/api/user';
import NetworkManager from '@init/network_manager';
import {queryRecentPostsInChannel} from '@queries/servers/post';
import {queryCurrentUserId, queryCurrentChannelId} from '@queries/servers/system';
import {queryAllUsers} from '@queries/servers/user';

import type {Client} from '@client/rest';

import {forceLogoutIfNecessary} from './session';

type PostsRequest = {
    error?: never;
    order?: string[];
    posts?: Post[];
    previousPostId?: string;
}

type AuthorsRequest = {
    authors?: UserProfile[];
    error?: unknown;
}

export const fetchPostsForCurrentChannel = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const currentChannelId = await queryCurrentChannelId(database);
    return fetchPostsForChannel(serverUrl, currentChannelId);
};

export const fetchPostsForChannel = async (serverUrl: string, channelId: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let postAction: Promise<PostsRequest>|undefined;
    let actionType: string|undefined;
    const postsInChannel = await queryRecentPostsInChannel(operator.database, channelId);
    if (!postsInChannel || postsInChannel.length < General.POST_CHUNK_SIZE) {
        postAction = fetchPosts(serverUrl, channelId, 0, General.POST_CHUNK_SIZE, true);
        actionType = ActionType.POSTS.RECEIVED_IN_CHANNEL;
    } else {
        const since = postsInChannel[0]?.createAt || 0;
        postAction = fetchPostsSince(serverUrl, channelId, since, true);
        actionType = ActionType.POSTS.RECEIVED_SINCE;
    }

    const data = await postAction;
    if (data.error) {
        // Here we should emit an event that fetching posts failed.
    }

    if (data.posts?.length && data.order?.length) {
        try {
            await fetchPostAuthors(serverUrl, data.posts, false);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.log('FETCH AUTHORS ERROR', error);
        }

        operator.handlePosts({
            actionType,
            order: data.order,
            posts: data.posts,
            previousPostId: data.previousPostId,
        });
    }

    return {posts: data.posts};
};

export const fetchPostsForUnreadChannels = async (serverUrl: string, channels: Channel[], memberships: ChannelMembership[], excludeChannelId?: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        for (const member of memberships) {
            const channel = channels.find((c) => c.id === member.channel_id);
            if (channel && (channel.total_msg_count - member.msg_count) > 0 && channel.id !== excludeChannelId) {
                fetchPostsForChannel(serverUrl, channel.id);
            }
        }
    } catch (error) {
        return {error};
    }

    return {error: undefined};
};

export const fetchPosts = async (serverUrl: string, channelId: string, page = 0, perPage = General.POST_CHUNK_SIZE, fetchOnly = false): Promise<PostsRequest> => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const data = await client.getPosts(channelId, page, perPage);
        return processPostsFetched(serverUrl, ActionType.POSTS.RECEIVED_IN_CHANNEL, data, fetchOnly);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchPostsSince = async (serverUrl: string, channelId: string, since: number, fetchOnly = false): Promise<PostsRequest> => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const data = await client.getPostsSince(channelId, since);
        return processPostsFetched(serverUrl, ActionType.POSTS.RECEIVED_SINCE, data, fetchOnly);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchPostAuthors = async (serverUrl: string, posts: Post[], fetchOnly = false): Promise<AuthorsRequest> => {
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

    const currentUserId = await queryCurrentUserId(operator.database);
    const users = await queryAllUsers(operator.database);
    const existingUserIds = new Set<string>();
    const existingUserNames = new Set<string>();
    let excludeUsername;
    users.forEach((u) => {
        existingUserIds.add(u.id);
        existingUserNames.add(u.username);
        if (u.id === currentUserId) {
            excludeUsername = u.username;
        }
    });

    const usernamesToLoad = getNeededAtMentionedUsernames(existingUserNames, posts, excludeUsername);
    const userIdsToLoad = new Set<string>();
    posts.forEach((p) => {
        const userId = p.user_id;

        if (userId === currentUserId) {
            return;
        }

        if (!existingUserIds.has(userId)) {
            userIdsToLoad.add(userId);
        }
    });

    try {
        const promises: Array<Promise<UserProfile[]>> = [];
        if (userIdsToLoad.size) {
            promises.push(client.getProfilesByIds(Array.from(userIdsToLoad)));
        }

        if (usernamesToLoad.size) {
            promises.push(client.getProfilesByUsernames(Array.from(usernamesToLoad)));
        }

        if (promises.length) {
            const result = await Promise.all(promises);
            const authors = result.flat();

            if (!fetchOnly && authors.length) {
                operator.handleUsers({
                    users: authors,
                    prepareRecordsOnly: true,
                });
            }

            return {authors};
        }

        return {authors: [] as UserProfile[]};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

const processPostsFetched = (serverUrl: string, actionType: string, data: {order: string[]; posts: Post[]; prev_post_id?: string}, fetchOnly = false) => {
    const order = data.order;
    const posts = Object.values(data.posts) as Post[];
    const previousPostId = data.prev_post_id;

    if (!fetchOnly) {
        const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        if (operator) {
            operator.handlePosts({
                actionType,
                order,
                posts,
                previousPostId,
            });
        }
    }

    return {
        posts,
        order,
        previousPostId,
    };
};
