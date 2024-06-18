// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

/* eslint-disable max-lines */

import {markChannelAsUnread, updateLastPostAt} from '@actions/local/channel';
import {addPostAcknowledgement, removePost, removePostAcknowledgement, storePostsForChannel} from '@actions/local/post';
import {addRecentReaction} from '@actions/local/reactions';
import {createThreadFromNewPost} from '@actions/local/thread';
import {ActionType, General, Post, ServerErrors} from '@constants';
import DatabaseManager from '@database/manager';
import {filterPostsInOrderedArray} from '@helpers/api/post';
import {getNeededAtMentionedUsernames} from '@helpers/api/user';
import NetworkManager from '@managers/network_manager';
import {getMyChannel, prepareMissingChannelsForAllTeams, queryAllMyChannel} from '@queries/servers/channel';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {getPostById, getRecentPostsInChannel} from '@queries/servers/post';
import {getCurrentUserId, getCurrentChannelId} from '@queries/servers/system';
import {getIsCRTEnabled, prepareThreadsFromReceivedPosts} from '@queries/servers/thread';
import {queryAllUsers} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import {setFetchingThreadState} from '@store/fetching_thread_store';
import {getValidEmojis, matchEmoticons} from '@utils/emoji/helpers';
import {getFullErrorMessage, isServerError} from '@utils/errors';
import {logDebug, logError} from '@utils/log';
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

export async function createPost(serverUrl: string, post: Partial<Post>, files: FileInfo[] = []): Promise<{data?: boolean; error?: unknown}> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

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

    await operator.batchRecords(initialPostModels, 'createPost - initial');

    const isCRTEnabled = await getIsCRTEnabled(database);

    let created;
    try {
        created = await client.createPost({...newPost, create_at: 0});
    } catch (error) {
        logDebug('Error sending a post', getFullErrorMessage(error));
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
        if (isServerError(error) && (
            error.server_error_id === ServerErrors.DELETED_ROOT_POST_ERROR ||
            error.server_error_id === ServerErrors.TOWN_SQUARE_READ_ONLY_ERROR ||
            error.server_error_id === ServerErrors.PLUGIN_DISMISSED_POST_ERROR
        )) {
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
            await operator.batchRecords(models, 'createPost - failure');
        }

        return {data: true};
    }

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
    await operator.batchRecords(models, 'createPost - success');

    newPost = created;

    return {data: true};
}

export const retryFailedPost = async (serverUrl: string, post: PostModel) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

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
        await operator.batchRecords([post], 'retryFailedPost - first update');

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
        await operator.batchRecords(models, 'retryFailedPost - success update');
    } catch (error) {
        logDebug('error on retryFailedPost', getFullErrorMessage(error));
        if (isServerError(error) && (
            error.server_error_id === ServerErrors.DELETED_ROOT_POST_ERROR ||
            error.server_error_id === ServerErrors.TOWN_SQUARE_READ_ONLY_ERROR ||
            error.server_error_id === ServerErrors.PLUGIN_DISMISSED_POST_ERROR
        )) {
            await removePost(serverUrl, post);
        } else {
            post.prepareUpdate((p) => {
                p.props = {
                    ...p.props,
                    failed: true,
                };
            });
            await operator.batchRecords([post], 'retryFailedPost - error update');
        }

        return {error};
    }

    return {};
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
    try {
        if (!fetchOnly) {
            EphemeralStore.addLoadingMessagesForChannel(serverUrl, channelId);
        }
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let postAction: Promise<PostsRequest>|undefined;
        let actionType: string|undefined;
        const myChannel = await getMyChannel(database, channelId);
        const postsInChannel = await getRecentPostsInChannel(database, channelId);
        const since = myChannel?.lastFetchedAt || postsInChannel?.[0]?.createAt || 0;
        if (since) {
            postAction = fetchPostsSince(serverUrl, channelId, since, true);
            actionType = ActionType.POSTS.RECEIVED_SINCE;
        } else {
            postAction = fetchPosts(serverUrl, channelId, 0, General.POST_CHUNK_SIZE, true);
            actionType = ActionType.POSTS.RECEIVED_IN_CHANNEL;
        }

        const data = await postAction;
        if (data.error) {
            throw data.error;
        }
        let authors: UserProfile[] = [];
        if (data.posts?.length && data.order?.length) {
            const {authors: fetchedAuthors} = await fetchPostAuthors(serverUrl, data.posts, true);
            authors = fetchedAuthors || [];

            if (!fetchOnly) {
                await storePostsForChannel(
                    serverUrl, channelId,
                    data.posts, data.order, data.previousPostId ?? '',
                    actionType, authors,
                );
            }
        }

        return {posts: data.posts, order: data.order, authors, actionType, previousPostId: data.previousPostId};
    } catch (error) {
        logDebug('error on fetchPostsForChannel', getFullErrorMessage(error));
        return {error};
    } finally {
        if (!fetchOnly) {
            EphemeralStore.stopLoadingMessagesForChannel(serverUrl, channelId);
        }
    }
}

export const fetchPostsForUnreadChannels = async (serverUrl: string, channels: Channel[], memberships: ChannelMembership[], excludeChannelId?: string) => {
    const promises = [];
    for (const member of memberships) {
        const channel = channels.find((c) => c.id === member.channel_id);
        if (channel && !channel.delete_at && (channel.total_msg_count - member.msg_count) > 0 && channel.id !== excludeChannelId) {
            promises.push(fetchPostsForChannel(serverUrl, channel.id));
        }
    }
    await Promise.all(promises);
};

export async function fetchPosts(serverUrl: string, channelId: string, page = 0, perPage = General.POST_CHUNK_SIZE, fetchOnly = false): Promise<PostsRequest> {
    try {
        if (!fetchOnly) {
            EphemeralStore.addLoadingMessagesForChannel(serverUrl, channelId);
        }
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);
        const isCRTEnabled = await getIsCRTEnabled(database);
        const data = await client.getPosts(channelId, page, perPage, isCRTEnabled, isCRTEnabled);
        const result = processPostsFetched(data);
        if (!fetchOnly && result.posts.length) {
            const models = await operator.handlePosts({
                ...result,
                actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
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
                const threadModels = await prepareThreadsFromReceivedPosts(operator, result.posts, false);
                if (threadModels?.length) {
                    models.push(...threadModels);
                }
            }

            if (models.length) {
                await operator.batchRecords(models, 'fetchPosts');
            }
        }
        return result;
    } catch (error) {
        logDebug('error on fetchPosts', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    } finally {
        if (!fetchOnly) {
            EphemeralStore.stopLoadingMessagesForChannel(serverUrl, channelId);
        }
    }
}

export async function fetchPostsBefore(serverUrl: string, channelId: string, postId: string, perPage = General.POST_CHUNK_SIZE, fetchOnly = false) {
    try {
        if (!fetchOnly) {
            EphemeralStore.addLoadingMessagesForChannel(serverUrl, channelId);
        }
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const isCRTEnabled = await getIsCRTEnabled(database);
        const data = await client.getPostsBefore(channelId, postId, 0, perPage, isCRTEnabled, isCRTEnabled);
        const result = processPostsFetched(data);

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
                    const threadModels = await prepareThreadsFromReceivedPosts(operator, result.posts, false);
                    if (threadModels?.length) {
                        models.push(...threadModels);
                    }
                }

                await operator.batchRecords(models, 'fetchPostsBefore');
            } catch (error) {
                logError('FETCH POSTS BEFORE ERROR', error);
            }
        }
        return result;
    } catch (error) {
        logDebug('error on fetchPostsBefore', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    } finally {
        if (!fetchOnly) {
            EphemeralStore.stopLoadingMessagesForChannel(serverUrl, channelId);
        }
    }
}

export async function fetchPostsSince(serverUrl: string, channelId: string, since: number, fetchOnly = false): Promise<PostsRequest> {
    try {
        if (!fetchOnly) {
            EphemeralStore.addLoadingMessagesForChannel(serverUrl, channelId);
        }
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const isCRTEnabled = await getIsCRTEnabled(database);
        const data = await client.getPostsSince(channelId, since, isCRTEnabled, isCRTEnabled);
        const result = await processPostsFetched(data);
        if (!fetchOnly) {
            const models = await operator.handlePosts({
                ...result,
                actionType: ActionType.POSTS.RECEIVED_SINCE,
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
                const threadModels = await prepareThreadsFromReceivedPosts(operator, result.posts, false);
                if (threadModels?.length) {
                    models.push(...threadModels);
                }
            }
            await operator.batchRecords(models, 'fetchPostsSince');
        }
        return result;
    } catch (error) {
        logDebug('error on fetchPostsSince', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    } finally {
        if (!fetchOnly) {
            EphemeralStore.stopLoadingMessagesForChannel(serverUrl, channelId);
        }
    }
}

export const fetchPostAuthors = async (serverUrl: string, posts: Post[], fetchOnly = false): Promise<AuthorsRequest> => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);

        const currentUserId = await getCurrentUserId(database);
        const users = await queryAllUsers(database).fetch();
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
        for (const p of posts) {
            const {user_id} = p;
            if (user_id !== currentUserId) {
                userIdsToLoad.add(user_id);
            }
        }
        const promises: Array<Promise<UserProfile[]>> = [];
        if (userIdsToLoad.size) {
            promises.push(client.getProfilesByIds(Array.from(userIdsToLoad)));
        }

        if (usernamesToLoad.size) {
            promises.push(client.getProfilesByUsernames(Array.from(usernamesToLoad)));
        }

        if (promises.length) {
            const authorsResult = await Promise.allSettled(promises);
            const result = authorsResult.reduce<UserProfile[][]>((acc, item) => {
                if (item.status === 'fulfilled') {
                    acc.push(item.value);
                }
                return acc;
            }, []);

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
        logDebug('error on fetchPostAuthors', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export async function fetchPostThread(serverUrl: string, postId: string, options?: FetchPaginatedThreadOptions, fetchOnly = false) {
    try {
        setFetchingThreadState(postId, true);
        const client = NetworkManager.getClient(serverUrl);

        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const isCRTEnabled = await getIsCRTEnabled(database);

        // Not doing any version check as server versions below 6.7 will ignore the additional params from the client.
        const data = await client.getPostThread(postId, {
            collapsedThreads: isCRTEnabled,
            collapsedThreadsExtended: isCRTEnabled,
            ...options,
        });
        const result = processPostsFetched(data);
        let posts: Model[] = [];
        if (result.posts.length && !fetchOnly) {
            const models: Model[] = [];
            posts = await operator.handlePosts({
                ...result,
                actionType: ActionType.POSTS.RECEIVED_IN_THREAD,
                prepareRecordsOnly: true,
            });
            models.push(...posts);

            const {authors} = await fetchPostAuthors(serverUrl, result.posts, true);
            if (authors?.length) {
                const userModels = await operator.handleUsers({
                    users: authors,
                    prepareRecordsOnly: true,
                });
                models.push(...userModels);
            }

            if (isCRTEnabled) {
                const threadModels = await prepareThreadsFromReceivedPosts(operator, result.posts, true);
                if (threadModels?.length) {
                    models.push(...threadModels);
                }
            }
            await operator.batchRecords(models, 'fetchPostThread');
        }
        setFetchingThreadState(postId, false);
        return {posts: result.posts};
    } catch (error) {
        logDebug('error on fetchPostThread', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        setFetchingThreadState(postId, false);
        return {error};
    }
}

export async function fetchPostsAround(serverUrl: string, channelId: string, postId: string, perPage = General.POST_AROUND_CHUNK_SIZE, isCRTEnabled = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const [after, post, before] = await Promise.all<PostsObjectsRequest>([
            client.getPostsAfter(channelId, postId, 0, perPage, isCRTEnabled, isCRTEnabled),
            client.getPostThread(postId, {
                collapsedThreads: isCRTEnabled,
                collapsedThreadsExtended: isCRTEnabled,
                fetchAll: true,
            }),
            client.getPostsBefore(channelId, postId, 0, perPage, isCRTEnabled, isCRTEnabled),
        ]);

        const preData: PostResponse = {
            posts: {
                ...filterPostsInOrderedArray(after.posts, after.order),
                [postId]: post.posts![postId],
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
                logError('FETCH AUTHORS ERROR', error);
            }

            posts = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_AROUND,
                ...data,
                prepareRecordsOnly: true,
            });

            models.push(...posts);

            if (isCRTEnabled) {
                const threadModels = await prepareThreadsFromReceivedPosts(operator, data.posts, false);
                if (threadModels?.length) {
                    models.push(...threadModels);
                }
            }
            await operator.batchRecords(models, 'fetchPostsAround');
        }

        return {posts: data.posts};
    } catch (error) {
        logDebug('error on fetchPostsAround', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchMissingChannelsFromPosts(serverUrl: string, posts: Post[], fetchOnly = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const channelIds = new Set(await queryAllMyChannel(database).fetchIds());
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
            const isCRTEnabled = await getIsCRTEnabled(database);
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
                        await operator.batchRecords(models, 'fetchMissingChannelsFromPosts');
                    }
                }
            }
        }

        return {
            channels,
            channelMemberships,
        };
    } catch (error) {
        logDebug('error on fetchMissingChannelsFromPosts', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchPostById(serverUrl: string, postId: string, fetchOnly = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
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
                    prepareRecordsOnly: true,
                });
                models.push(...users);
            }

            const isCRTEnabled = await getIsCRTEnabled(database);
            if (isCRTEnabled) {
                const threadModels = await prepareThreadsFromReceivedPosts(operator, [post], false);
                if (threadModels?.length) {
                    models.push(...threadModels);
                }
            }

            await operator.batchRecords(models, 'fetchPostById');
        }

        return {post};
    } catch (error) {
        logDebug('error on fetchPostById', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export const togglePinPost = async (serverUrl: string, postId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

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
        logDebug('error on togglePinPost', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const deletePost = async (serverUrl: string, postToDelete: PostModel | Post) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
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
        logDebug('error on deletePost', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const markPostAsUnread = async (serverUrl: string, postId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

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
                return {post};
            }
        }
        return {post};
    } catch (error) {
        logDebug('error on markPostAsUnread', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const editPost = async (serverUrl: string, postId: string, postMessage: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const post = await getPostById(database, postId);
        if (post) {
            const {update_at, edit_at, message: updatedMessage, message_source} = await client.patchPost({message: postMessage, id: postId});
            await database.write(async () => {
                await post.update((p) => {
                    p.updateAt = update_at;
                    p.editAt = edit_at;
                    p.message = updatedMessage;
                    p.messageSource = message_source || '';
                });
            });
        }
        return {post};
    } catch (error) {
        logDebug('error on editPost', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export async function fetchSavedPosts(serverUrl: string, teamId?: string, channelId?: string, page?: number, perPage?: number) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const userId = await getCurrentUserId(database);
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
            const isCRTEnabled = await getIsCRTEnabled(database);
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

        const isCRTEnabled = await getIsCRTEnabled(database);
        if (isCRTEnabled) {
            promises.push(prepareThreadsFromReceivedPosts(operator, postsArray, false));
        }

        const modelArrays = await Promise.all(promises);
        const models = modelArrays.flatMap((mdls) => {
            if (!mdls || !mdls.length) {
                return [];
            }
            return mdls;
        });

        await operator.batchRecords(models, 'fetchSavedPosts');

        return {
            order,
            posts: postsArray,
        };
    } catch (error) {
        logDebug('error on fetchSavedPosts', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchPinnedPosts(serverUrl: string, channelId: string) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

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
            promises.push(prepareThreadsFromReceivedPosts(operator, postsArray, false));
        }

        const modelArrays = await Promise.all(promises);
        const models = modelArrays.flatMap((mdls) => {
            if (!mdls || !mdls.length) {
                return [];
            }
            return mdls;
        });

        await operator.batchRecords(models, 'fetchPinnedPosts');

        return {
            order,
            posts: postsArray,
        };
    } catch (error) {
        logDebug('error on fetchPinnedPosts', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function acknowledgePost(serverUrl: string, postId: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);
        EphemeralStore.setAcknowledgingPost(postId);

        const userId = await getCurrentUserId(database);
        const {acknowledged_at: acknowledgedAt} = await client.acknowledgePost(postId, userId);

        return addPostAcknowledgement(serverUrl, postId, userId, acknowledgedAt, false);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    } finally {
        EphemeralStore.unsetAcknowledgingPost(postId);
    }
}

export async function unacknowledgePost(serverUrl: string, postId: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);
        EphemeralStore.setUnacknowledgingPost(postId);
        const userId = await getCurrentUserId(database);
        await client.unacknowledgePost(postId, userId);

        return removePostAcknowledgement(serverUrl, postId, userId, false);
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    } finally {
        EphemeralStore.unsetUnacknowledgingPost(postId);
    }
}
