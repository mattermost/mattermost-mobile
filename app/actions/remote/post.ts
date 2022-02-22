// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import {DeviceEventEmitter} from 'react-native';

import {updateLastPostAt} from '@actions/local/channel';
import {processPostsFetched, removePost} from '@actions/local/post';
import {addRecentReaction} from '@actions/local/reactions';
import {ActionType, Events, General, ServerErrors} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getNeededAtMentionedUsernames} from '@helpers/api/user';
import NetworkManager from '@init/network_manager';
import {prepareMissingChannelsForAllTeams, queryAllMyChannelIds} from '@queries/servers/channel';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {queryPostById, queryRecentPostsInChannel} from '@queries/servers/post';
import {queryCurrentUserId, queryCurrentChannelId} from '@queries/servers/system';
import {queryAllUsers} from '@queries/servers/user';
import {getValidEmojis, matchEmoticons} from '@utils/emoji/helpers';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type Model from '@nozbe/watermelondb/Model';

type PostsRequest = {
    error?: unknown;
    order?: string[];
    posts?: Post[];
    previousPostId?: string;
}

type AuthorsRequest = {
    authors?: UserProfile[];
    error?: unknown;
}

export const createPost = async (serverUrl: string, post: Partial<Post>, files: FileInfo[] = []): Promise<{data?: boolean; error?: any}> => {
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

    const currentUserId = queryCurrentUserId(operator.database);
    const timestamp = Date.now();
    const pendingPostId = post.pending_post_id || `${currentUserId}:${timestamp}`;

    const existing = await queryPostById(operator.database, pendingPostId);
    if (existing && !existing.props.failed) {
        return {data: false};
    }

    let newPost = {
        ...post,
        id: '',
        pending_post_id: pendingPostId,
        create_at: timestamp,
        update_at: timestamp,
    } as Post;

    if (files.length) {
        const fileIds = files.map((file) => file.id);

        newPost = {
            ...newPost,
            file_ids: fileIds,
        };
    }

    const databasePost = {
        ...newPost,
        id: pendingPostId,
    };

    const initialPostModels: Model[] = [];

    const filesModels = await operator.handleFiles({files, prepareRecordsOnly: true});
    if (filesModels.length) {
        initialPostModels.push(...filesModels);
    }

    const postModels = await operator.handlePosts({
        actionType: ActionType.POSTS.RECEIVED_NEW,
        order: [databasePost.id],
        posts: [databasePost],
        prepareRecordsOnly: true,
    });
    if (postModels.length) {
        initialPostModels.push(...postModels);
    }

    const customEmojis = await queryAllCustomEmojis(operator.database);
    const emojisInMessage = matchEmoticons(newPost.message);
    const reactionModels = await addRecentReaction(serverUrl, getValidEmojis(emojisInMessage, customEmojis), true);
    if (!('error' in reactionModels) && reactionModels.length) {
        initialPostModels.push(...reactionModels);
    }

    operator.batchRecords(initialPostModels);

    try {
        const created = await client.createPost(newPost);
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: [created.id],
            posts: [created],
        });
        newPost = created;
    } catch (error: any) {
        const errorPost = {
            ...newPost,
            id: pendingPostId,
            props: {
                ...newPost.props,
                failed: true,
            },
            update_at: Date.now(),
        };

        // If the failure was because: the root post was deleted or
        // TownSquareIsReadOnly=true then remove the post
        if (error.server_error_id === ServerErrors.DELETED_ROOT_POST_ERROR ||
            error.server_error_id === ServerErrors.TOWN_SQUARE_READ_ONLY_ERROR ||
            error.server_error_id === ServerErrors.PLUGIN_DISMISSED_POST_ERROR
        ) {
            await removePost(serverUrl, databasePost);
        } else {
            await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: [errorPost.id],
                posts: [errorPost],
            });
        }
    }

    return {data: true};
};

export const fetchPostsForCurrentChannel = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const currentChannelId = await queryCurrentChannelId(database);
    return fetchPostsForChannel(serverUrl, currentChannelId);
};

export const fetchPostsForChannel = async (serverUrl: string, channelId: string, fetchOnly = false) => {
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

    let authors: UserProfile[] = [];
    if (data.posts?.length && data.order?.length) {
        try {
            const {authors: fetchedAuthors} = await fetchPostAuthors(serverUrl, data.posts, true);
            authors = fetchedAuthors || [];
        } catch (error) {
            // eslint-disable-next-line no-console
            console.log('FETCH AUTHORS ERROR', error);
        }

        if (!fetchOnly) {
            const models = [];
            const postModels = await operator.handlePosts({
                actionType,
                order: data.order,
                posts: data.posts,
                previousPostId: data.previousPostId,
                prepareRecordsOnly: true,
            });
            if (postModels) {
                models.push(...postModels);
            }
            if (authors.length) {
                const userModels = await operator.handleUsers({users: authors, prepareRecordsOnly: true});
                if (userModels.length) {
                    models.push(...userModels);
                }
            }

            let lastPostAt = 0;
            for (const post of data.posts) {
                lastPostAt = post.create_at > lastPostAt ? post.create_at : lastPostAt;
            }
            const {member: memberModel} = await updateLastPostAt(serverUrl, channelId, lastPostAt, true);
            if (memberModel) {
                models.push(memberModel);
            }

            if (models.length) {
                await operator.batchRecords(models);
            }
        }
    }

    return {posts: data.posts, order: data.order, authors, actionType, previousPostId: data.previousPostId};
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
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const fetchPostsBefore = async (serverUrl: string, channelId: string, postId: string, perPage = General.POST_CHUNK_SIZE, fetchOnly = false) => {
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

    const activeServerUrl = await DatabaseManager.getActiveServerUrl();

    try {
        if (activeServerUrl === serverUrl) {
            DeviceEventEmitter.emit(Events.LOADING_CHANNEL_POSTS, true);
        }
        const data = await client.getPostsBefore(channelId, postId, 0, perPage);
        const result = await processPostsFetched(serverUrl, ActionType.POSTS.RECEIVED_BEFORE, data, true);

        if (activeServerUrl === serverUrl) {
            DeviceEventEmitter.emit(Events.LOADING_CHANNEL_POSTS, false);
        }

        if (result.posts.length && !fetchOnly) {
            try {
                const models = await operator.handlePosts({
                    actionType: ActionType.POSTS.RECEIVED_BEFORE,
                    ...result,
                    prepareRecordsOnly: true,
                });
                const {authors} = await fetchPostAuthors(serverUrl, result.posts, true);
                if (authors?.length) {
                    const userModels = await operator.handleUsers({
                        users: authors,
                        prepareRecordsOnly: true,
                    });
                    models.push(...userModels);
                }

                await operator.batchRecords(models);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.log('FETCH AUTHORS ERROR', error);
            }
        }

        return result;
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        if (activeServerUrl === serverUrl) {
            DeviceEventEmitter.emit(Events.LOADING_CHANNEL_POSTS, true);
        }
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
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
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
                await operator.handleUsers({
                    users: authors,
                    prepareRecordsOnly: false,
                });
            }

            return {authors};
        }

        return {authors: [] as UserProfile[]};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const postActionWithCookie = async (serverUrl: string, postId: string, actionId: string, actionCookie: string, selectedOption = '') => {
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

    try {
        const data = await client.doPostActionWithCookie(postId, actionId, actionCookie, selectedOption);
        if (data?.trigger_id) {
            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.INTEGRATION_TRIGGER_ID,
                    value: data.trigger_id,
                }],
                prepareRecordsOnly: false,
            });
        }

        return {data};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export async function getMissingChannelsFromPosts(serverUrl: string, posts: Post[], fetchOnly = false) {
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

    const channelIds = await queryAllMyChannelIds(operator.database);
    const channelPromises: Array<Promise<Channel>> = [];
    const userPromises: Array<Promise<ChannelMembership>> = [];

    posts.forEach((post) => {
        const id = post.channel_id;

        if (channelIds.indexOf(id) === -1) {
            channelPromises.push(client.getChannel(id));
            userPromises.push(client.getMyChannelMember(id));
        }
    });

    const channels = await Promise.all(channelPromises);
    const channelMemberships = await Promise.all(userPromises);

    if (!fetchOnly && channels.length && channelMemberships.length) {
        const modelPromises = prepareMissingChannelsForAllTeams(operator, channels, channelMemberships) as Array<Promise<Model[]>>;
        if (modelPromises && modelPromises.length) {
            const channelModelsArray = await Promise.all(modelPromises);
            if (channelModelsArray.length) {
                const models = channelModelsArray.flatMap((mdls) => {
                    if (!mdls || mdls.length) {
                        return [];
                    }
                    return mdls;
                });

                if (models) {
                    operator.batchRecords(models);
                }
            }
        }
    }

    return {
        channels,
        channelMemberships,
    };
}

export const fetchPostById = async (serverUrl: string, postId: string, fetchOnly = false) => {
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

    try {
        const post = await client.getPost(postId);
        if (!fetchOnly) {
            operator.handlePosts({actionType: ActionType.POSTS.RECEIVED_NEW, order: [post.id], posts: [post]});
        }

        return {post};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const togglePinPost = async (serverUrl: string, postId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const post = await queryPostById(database, postId);
        if (post) {
            const isPinned = post.isPinned;
            const request = isPinned ? client.unpinPost : client.pinPost;

            await request(postId);
            await database.write(async () => {
                await post.update((p) => {
                    p.isPinned = !isPinned;
                });
            });
        }
        return {post};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const deletePost = async (serverUrl: string, postId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        await client.deletePost(postId);
        const post = await removePost(serverUrl, {id: postId} as Post);
        return {post};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
