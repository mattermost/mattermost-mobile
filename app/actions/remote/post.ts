// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

/* eslint-disable max-lines */

import {DeviceEventEmitter} from 'react-native';

import {markChannelAsUnread, updateLastPostAt} from '@actions/local/channel';
import {removePost} from '@actions/local/post';
import {addRecentReaction} from '@actions/local/reactions';
import {createThreadFromNewPost} from '@actions/local/thread';
import {ActionType, Events, General, Post, ServerErrors} from '@constants';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {filterPostsInOrderedArray} from '@helpers/api/post';
import {getNeededAtMentionedUsernames} from '@helpers/api/user';
import {extractRecordsForTable} from '@helpers/database';
import NetworkManager from '@managers/network_manager';
import {prepareMissingChannelsForAllTeams, queryAllMyChannel} from '@queries/servers/channel';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {getPostById, getRecentPostsInChannel} from '@queries/servers/post';
import {getCurrentUserId, getCurrentChannelId} from '@queries/servers/system';
import {getIsCRTEnabled, prepareThreadsFromReceivedPosts} from '@queries/servers/thread';
import {queryAllUsers} from '@queries/servers/user';
import {getValidEmojis, matchEmoticons} from '@utils/emoji/helpers';
import {processPostsFetched} from '@utils/post';
import {getPostIdsForCombinedUserActivityPost} from '@utils/post_list';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type Model from '@nozbe/watermelondb/Model';
import type PostModel from '@typings/database/models/servers/post';

type PostsRequest = {
    error?: unknown;
    order?: string[];
    posts?: Post[];
    previousPostId?: string;
}

type PostsObjectsRequest = {
    error?: unknown;
    order?: string[];
    posts?: IDMappedObjects<Post>;
    previousPostId?: string;
}

type AuthorsRequest = {
    authors?: UserProfile[];
    error?: unknown;
}

export async function createPost(serverUrl: string, post: Partial<Post>, files: FileInfo[] = []): Promise<{data?: boolean; error?: any}> {
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

    const {database} = operator;

    const currentUserId = await getCurrentUserId(database);
    const timestamp = Date.now();
    const pendingPostId = post.pending_post_id || `${currentUserId}:${timestamp}`;

    const existing = await getPostById(database, pendingPostId);
    if (existing && !existing.props.failed) {
        return {data: false};
    }

    let newPost = {
        ...post,
        id: '',
        pending_post_id: pendingPostId,
        create_at: timestamp,
        update_at: timestamp,
        delete_at: 0,
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

    if (files.length) {
        for (const f of files) {
            // Set the pending post Id
            f.post_id = pendingPostId;
        }
        const filesModels = await operator.handleFiles({files, prepareRecordsOnly: true});
        initialPostModels.push(...filesModels);
    }

    const postModels = await operator.handlePosts({
        actionType: ActionType.POSTS.RECEIVED_NEW,
        order: [databasePost.id],
        posts: [databasePost],
        prepareRecordsOnly: true,
    });
    initialPostModels.push(...postModels);

    const customEmojis = await queryAllCustomEmojis(database).fetch();
    const emojisInMessage = matchEmoticons(newPost.message);
    const reactionModels = await addRecentReaction(serverUrl, getValidEmojis(emojisInMessage, customEmojis), true);
    if (!('error' in reactionModels) && reactionModels.length) {
        initialPostModels.push(...reactionModels);
    }

    await operator.batchRecords(initialPostModels);

    const isCRTEnabled = await getIsCRTEnabled(database);

    try {
        const created = await client.createPost(newPost);
        const models = await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: [created.id],
            posts: [created],
            prepareRecordsOnly: true,
        });
        const isCrtReply = isCRTEnabled && created.root_id !== '';
        if (!isCrtReply) {
            const {member} = await updateLastPostAt(serverUrl, created.channel_id, created.create_at, true);
            if (member) {
                models.push(member);
            }
        }
        if (isCRTEnabled) {
            const {models: threadModels} = await createThreadFromNewPost(serverUrl, created, true);
            if (threadModels?.length) {
                models.push(...threadModels);
            }
        }
        await operator.batchRecords(models);

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
            const models = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: [errorPost.id],
                posts: [errorPost],
                prepareRecordsOnly: true,
            });
            if (isCRTEnabled) {
                const {models: threadModels} = await createThreadFromNewPost(serverUrl, errorPost, true);
                if (threadModels?.length) {
                    models.push(...threadModels);
                }
            }
            await operator.batchRecords(models);
        }
    }

    return {data: true};
}

export const retryFailedPost = async (serverUrl: string, post: PostModel) => {
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

    const {database} = operator;
    const isCRTEnabled = await getIsCRTEnabled(database);

    try {
        const timestamp = Date.now();
        const apiPost = await post.toApi();
        const newPost = {
            ...apiPost,
            props: {
                ...apiPost.props,
                failed: false,
            },
            id: '',
            create_at: timestamp,
            update_at: timestamp,
            delete_at: 0,
        } as Post;

        // Update the local post to reflect the pending state in the UI
        // timestamps will remain the same as the initial attempt for createAt
        // but updateAt will be use for the optimistic post UI
        post.prepareUpdate((p) => {
            p.props = newPost.props;
            p.updateAt = timestamp;
        });
        await operator.batchRecords([post]);

        const created = await client.createPost(newPost);
        const models = await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: [created.id],
            posts: [created],
            prepareRecordsOnly: true,
        });
        const isCrtReply = isCRTEnabled && created.root_id !== '';
        if (!isCrtReply) {
            const {member} = await updateLastPostAt(serverUrl, created.channel_id, created.create_at, true);
            if (member) {
                models.push(member);
            }
        }
        await operator.batchRecords(models);
    } catch (error: any) {
        if (error.server_error_id === ServerErrors.DELETED_ROOT_POST_ERROR ||
            error.server_error_id === ServerErrors.TOWN_SQUARE_READ_ONLY_ERROR ||
            error.server_error_id === ServerErrors.PLUGIN_DISMISSED_POST_ERROR
        ) {
            await removePost(serverUrl, post);
        } else {
            post.prepareUpdate((p) => {
                p.props = {
                    ...p.props,
                    failed: true,
                };
            });
            await operator.batchRecords([post]);
        }

        return {error};
    }

    return {error: undefined};
};

export const fetchPostsForCurrentChannel = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const currentChannelId = await getCurrentChannelId(database);
    return fetchPostsForChannel(serverUrl, currentChannelId);
};

export async function fetchPostsForChannel(serverUrl: string, channelId: string, fetchOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let postAction: Promise<PostsRequest>|undefined;
    let actionType: string|undefined;
    const postsInChannel = await getRecentPostsInChannel(operator.database, channelId);
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
            const isCRTEnabled = await getIsCRTEnabled(operator.database);

            const models = [];
            const postModels = await operator.handlePosts({
                actionType,
                order: data.order,
                posts: data.posts,
                previousPostId: data.previousPostId,
                prepareRecordsOnly: true,
            });
            models.push(...postModels);

            if (authors.length) {
                const userModels = await operator.handleUsers({users: authors, prepareRecordsOnly: true});
                models.push(...userModels);
            }

            let lastPostAt = 0;
            for (const post of data.posts) {
                const isCrtReply = isCRTEnabled && post.root_id !== '';
                if (!isCrtReply) {
                    lastPostAt = post.create_at > lastPostAt ? post.create_at : lastPostAt;
                }
            }

            if (lastPostAt) {
                const {member: memberModel} = await updateLastPostAt(serverUrl, channelId, lastPostAt, true);
                if (memberModel) {
                    models.push(memberModel);
                }
            }

            if (isCRTEnabled) {
                const threadModels = await prepareThreadsFromReceivedPosts(operator, data.posts);
                if (threadModels?.length) {
                    models.push(...threadModels);
                }
            }

            if (models.length) {
                await operator.batchRecords(models);
            }
        }
    }

    return {posts: data.posts, order: data.order, authors, actionType, previousPostId: data.previousPostId};
}

export const fetchPostsForUnreadChannels = async (serverUrl: string, channels: Channel[], memberships: ChannelMembership[], excludeChannelId?: string, emitEvent = false) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const promises = [];
        if (emitEvent) {
            DeviceEventEmitter.emit(Events.FETCHING_POSTS, true);
        }
        for (const member of memberships) {
            const channel = channels.find((c) => c.id === member.channel_id);
            if (channel && (channel.total_msg_count - member.msg_count) > 0 && channel.id !== excludeChannelId) {
                promises.push(fetchPostsForChannel(serverUrl, channel.id));
            }
        }
        await Promise.all(promises);
        if (emitEvent) {
            DeviceEventEmitter.emit(Events.FETCHING_POSTS, false);
        }
    } catch (error) {
        return {error};
    }

    return {error: undefined};
};

export async function fetchPosts(serverUrl: string, channelId: string, page = 0, perPage = General.POST_CHUNK_SIZE, fetchOnly = false): Promise<PostsRequest> {
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
        const isCRTEnabled = await getIsCRTEnabled(operator.database);
        const data = await client.getPosts(channelId, page, perPage, isCRTEnabled, isCRTEnabled);
        const result = await processPostsFetched(data);
        if (!fetchOnly) {
            const models = await operator.handlePosts({
                ...result,
                actionType: ActionType.POSTS.RECEIVED_SINCE,
                prepareRecordsOnly: true,
            });
            if (isCRTEnabled) {
                const threadModels = await prepareThreadsFromReceivedPosts(operator, result.posts);
                if (threadModels?.length) {
                    models.push(...threadModels);
                }
            }
            await operator.batchRecords(models);
        }
        return result;
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}

export async function fetchPostsBefore(serverUrl: string, channelId: string, postId: string, perPage = General.POST_CHUNK_SIZE, fetchOnly = false) {
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
        const isCRTEnabled = await getIsCRTEnabled(operator.database);
        const data = await client.getPostsBefore(channelId, postId, 0, perPage, isCRTEnabled, isCRTEnabled);
        const result = processPostsFetched(data);

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

                if (isCRTEnabled) {
                    const threadModels = await prepareThreadsFromReceivedPosts(operator, result.posts);
                    if (threadModels?.length) {
                        models.push(...threadModels);
                    }
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
}

export async function fetchPostsSince(serverUrl: string, channelId: string, since: number, fetchOnly = false): Promise<PostsRequest> {
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
        const isCRTEnabled = await getIsCRTEnabled(operator.database);
        const data = await client.getPostsSince(channelId, since, isCRTEnabled, isCRTEnabled);
        const result = await processPostsFetched(data);
        if (!fetchOnly) {
            const models = await operator.handlePosts({
                ...result,
                actionType: ActionType.POSTS.RECEIVED_SINCE,
                prepareRecordsOnly: true,
            });
            if (isCRTEnabled) {
                const threadModels = await prepareThreadsFromReceivedPosts(operator, result.posts);
                if (threadModels?.length) {
                    models.push(...threadModels);
                }
            }
            await operator.batchRecords(models);
        }
        return result;
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}

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

    const currentUserId = await getCurrentUserId(operator.database);
    const users = await queryAllUsers(operator.database).fetch();
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

export async function fetchPostThread(serverUrl: string, postId: string, fetchOnly = false): Promise<PostsRequest> {
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
        const isCRTEnabled = await getIsCRTEnabled(operator.database);
        const data = await client.getPostThread(postId, isCRTEnabled, isCRTEnabled);
        const result = processPostsFetched(data);
        if (!fetchOnly) {
            const models = await operator.handlePosts({
                ...result,
                actionType: ActionType.POSTS.RECEIVED_IN_THREAD,
                prepareRecordsOnly: true,
            });
            if (isCRTEnabled) {
                const threadModels = await prepareThreadsFromReceivedPosts(operator, result.posts);
                if (threadModels?.length) {
                    models.push(...threadModels);
                }
            }
            await operator.batchRecords(models);
        }
        return result;
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}

export async function fetchPostsAround(serverUrl: string, channelId: string, postId: string, perPage = General.POST_AROUND_CHUNK_SIZE, isCRTEnabled = false) {
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
        const [after, post, before] = await Promise.all<PostsObjectsRequest>([
            client.getPostsAfter(channelId, postId, 0, perPage, isCRTEnabled, isCRTEnabled),
            client.getPostThread(postId, isCRTEnabled, isCRTEnabled),
            client.getPostsBefore(channelId, postId, 0, perPage, isCRTEnabled, isCRTEnabled),
        ]);

        const preData: PostResponse = {
            posts: {
                ...filterPostsInOrderedArray(after.posts, after.order),
                postId: post.posts![postId],
                ...filterPostsInOrderedArray(before.posts, before.order),
            },
            order: [],
        };

        const data = processPostsFetched(preData);

        let posts: Model[] = [];
        const models: Model[] = [];
        if (data.posts?.length) {
            try {
                const {authors} = await fetchPostAuthors(serverUrl, data.posts, true);
                if (authors?.length) {
                    const userModels = await operator.handleUsers({
                        users: authors,
                        prepareRecordsOnly: true,
                    });
                    models.push(...userModels);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('FETCH AUTHORS ERROR', error);
            }

            posts = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_AROUND,
                ...data,
                prepareRecordsOnly: true,
            });

            models.push(...posts);

            if (isCRTEnabled) {
                const threadModels = await prepareThreadsFromReceivedPosts(operator, data.posts);
                if (threadModels?.length) {
                    models.push(...threadModels);
                }
            }
            await operator.batchRecords(models);
        }

        return {posts: extractRecordsForTable<PostModel>(posts, MM_TABLES.SERVER.POST)};
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('FETCH POSTS AROUND ERROR', error);
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}

export async function fetchMissingChannelsFromPosts(serverUrl: string, posts: Post[], fetchOnly = false) {
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
        const channelIds = new Set(await queryAllMyChannel(operator.database).fetchIds());
        const channelPromises: Array<Promise<Channel>> = [];
        const userPromises: Array<Promise<ChannelMembership>> = [];

        posts.forEach((post) => {
            const id = post.channel_id;

            if (!channelIds.has(id)) {
                channelPromises.push(client.getChannel(id));
                userPromises.push(client.getMyChannelMember(id));
            }
        });

        const channels = await Promise.all(channelPromises);
        const channelMemberships = await Promise.all(userPromises);

        if (!fetchOnly && channels.length && channelMemberships.length) {
            const isCRTEnabled = await getIsCRTEnabled(operator.database);
            const modelPromises = prepareMissingChannelsForAllTeams(operator, channels, channelMemberships, isCRTEnabled);
            if (modelPromises.length) {
                const channelModelsArray = await Promise.all(modelPromises);
                if (channelModelsArray.length) {
                    const models = channelModelsArray.flatMap((mdls) => {
                        if (!mdls || mdls.length) {
                            return [];
                        }
                        return mdls;
                    });
                    if (models.length) {
                        await operator.batchRecords(models);
                    }
                }
            }
        }

        return {
            channels,
            channelMemberships,
        };
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}

export async function fetchPostById(serverUrl: string, postId: string, fetchOnly = false) {
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
            const models: Model[] = [];
            const {authors} = await fetchPostAuthors(serverUrl, [post], true);
            const posts = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: [post.id],
                posts: [post],
                prepareRecordsOnly: true,
            });
            models.push(...posts);

            if (authors?.length) {
                const users = await operator.handleUsers({
                    users: authors,
                    prepareRecordsOnly: false,
                });
                models.push(...users);
            }

            const isCRTEnabled = await getIsCRTEnabled(operator.database);
            if (isCRTEnabled) {
                const threadModels = await prepareThreadsFromReceivedPosts(operator, [post]);
                if (threadModels?.length) {
                    models.push(...threadModels);
                }
            }

            await operator.batchRecords(models);
        }

        return {post};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}

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
        const post = await getPostById(database, postId);
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

export const deletePost = async (serverUrl: string, postToDelete: PostModel | Post) => {
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
        if (postToDelete.type === Post.POST_TYPES.COMBINED_USER_ACTIVITY && postToDelete.props?.system_post_ids) {
            const systemPostIds = getPostIdsForCombinedUserActivityPost(postToDelete.id);
            const promises = systemPostIds.map((id) => client.deletePost(id));
            await Promise.all(promises);
        } else {
            await client.deletePost(postToDelete.id);
        }

        const post = await removePost(serverUrl, postToDelete);
        return {post};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const markPostAsUnread = async (serverUrl: string, postId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const [userId, post] = await Promise.all([getCurrentUserId(database), getPostById(database, postId)]);
        if (post && userId) {
            await client.markPostAsUnread(userId, postId);
            const {channelId} = post;

            const [channel, channelMember] = await Promise.all([
                client.getChannel(channelId),
                client.getChannelMember(channelId, userId),
            ]);
            if (channel && channelMember) {
                const isCRTEnabled = await getIsCRTEnabled(database);
                let totalMessages = channel.total_msg_count;
                let messages = channelMember.msg_count;
                let mentionCount = channelMember.mention_count;

                if (isCRTEnabled) {
                    totalMessages = channel.total_msg_count_root!;
                    messages = channelMember.msg_count_root!;
                    mentionCount = channelMember.mention_count_root!;
                }

                const messageCount = totalMessages - messages;
                await markChannelAsUnread(serverUrl, channelId, messageCount, mentionCount, post.createAt);
                return {
                    post,
                };
            }
        }
        return {
            post,
        };
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export const editPost = async (serverUrl: string, postId: string, postMessage: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const post = await getPostById(database, postId);
        if (post) {
            const {update_at, edit_at, message: updatedMessage} = await client.patchPost({message: postMessage, id: postId});
            await database.write(async () => {
                await post.update((p) => {
                    p.updateAt = update_at;
                    p.editAt = edit_at;
                    p.message = updatedMessage;
                });
            });
        }
        return {
            post,
        };
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};

export async function fetchSavedPosts(serverUrl: string, teamId?: string, channelId?: string, page?: number, perPage?: number) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const userId = await getCurrentUserId(operator.database);
        const data = await client.getSavedPosts(userId, channelId, teamId, page, perPage);
        const posts = data.posts || {};
        const order = data.order || [];
        const postsArray = order.map((id) => posts[id]);

        if (!postsArray.length) {
            return {
                order,
                posts: postsArray,
            };
        }

        const promises: Array<Promise<Model[]>> = [];

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
            const isCRTEnabled = await getIsCRTEnabled(operator.database);
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

        const isCRTEnabled = await getIsCRTEnabled(operator.database);
        if (isCRTEnabled) {
            promises.push(prepareThreadsFromReceivedPosts(operator, postsArray));
        }

        const modelArrays = await Promise.all(promises);
        const models = modelArrays.flatMap((mdls) => {
            if (!mdls || !mdls.length) {
                return [];
            }
            return mdls;
        });

        await operator.batchRecords(models);

        return {
            order,
            posts: postsArray,
        };
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}

export async function fetchPinnedPosts(serverUrl: string, channelId: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const data = await client.getPinnedPosts(channelId);
        const posts = data.posts || {};
        const order = data.order || [];
        const postsArray = order.map((id) => posts[id]);

        if (!postsArray.length) {
            return {
                order,
                posts: postsArray,
            };
        }

        const promises: Array<Promise<Model[]>> = [];
        const {database} = operator;
        const isCRTEnabled = await getIsCRTEnabled(database);

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

        if (isCRTEnabled) {
            promises.push(prepareThreadsFromReceivedPosts(operator, postsArray));
        }

        const modelArrays = await Promise.all(promises);
        const models = modelArrays.flatMap((mdls) => {
            if (!mdls || !mdls.length) {
                return [];
            }
            return mdls;
        });

        await operator.batchRecords(models);

        return {
            order,
            posts: postsArray,
        };
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
}
