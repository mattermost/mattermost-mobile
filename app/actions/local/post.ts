// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database, type Model} from '@nozbe/watermelondb';

import {fetchPostAuthors} from '@actions/remote/post';
import {ActionType, Post} from '@constants';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {countUsersFromMentions, getPostById, prepareDeletePost, queryPostsById} from '@queries/servers/post';
import {getCurrentUserId} from '@queries/servers/system';
import {getIsCRTEnabled, prepareThreadsFromReceivedPosts} from '@queries/servers/thread';
import {generateId} from '@utils/general';
import {safeParseJSON} from '@utils/helpers';
import {logError} from '@utils/log';
import {getLastFetchedAtFromPosts} from '@utils/post';
import {getPostIdsForCombinedUserActivityPost} from '@utils/post_list';

import {updateLastPostAt, updateMyChannelLastFetchedAt} from './channel';

import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {DRAFT, FILE, MY_CHANNEL, POST, POSTS_IN_CHANNEL, POSTS_IN_THREAD, REACTION, THREAD, THREAD_PARTICIPANT, THREADS_IN_TEAM}} = MM_TABLES;

export const sendAddToChannelEphemeralPost = async (serverUrl: string, user: UserModel, addedUsernames: string[], messages: string[], channeId: string, postRootId = '') => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const timestamp = Date.now();
        const posts = addedUsernames.map((addedUsername, index) => {
            const message = messages[index];
            return {
                id: generateId(),
                user_id: user.id,
                channel_id: channeId,
                message,
                type: Post.POST_TYPES.EPHEMERAL_ADD_TO_CHANNEL as PostType,
                create_at: timestamp,
                edit_at: 0,
                update_at: timestamp,
                delete_at: 0,
                is_pinned: false,
                original_id: '',
                hashtags: '',
                pending_post_id: '',
                reply_count: 0,
                metadata: {},
                root_id: postRootId,
                props: {
                    username: user.username,
                    addedUsername,
                },
            } as Post;
        });

        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: posts.map((p) => p.id),
            posts,
        });

        return {posts};
    } catch (error) {
        logError('Failed sendAddToChannelEphemeralPost', error);
        return {error};
    }
};

export const sendEphemeralPost = async (serverUrl: string, message: string, channeId: string, rootId = '', userId?: string) => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (!channeId) {
            throw new Error('channel Id not defined');
        }

        let authorId = userId;
        if (!authorId) {
            authorId = await getCurrentUserId(database);
        }

        const timestamp = Date.now();
        const post = {
            id: generateId(),
            user_id: authorId,
            channel_id: channeId,
            message,
            type: Post.POST_TYPES.EPHEMERAL as PostType,
            create_at: timestamp,
            edit_at: 0,
            update_at: timestamp,
            delete_at: 0,
            is_pinned: false,
            original_id: '',
            hashtags: '',
            pending_post_id: '',
            reply_count: 0,
            metadata: {},
            participants: null,
            root_id: rootId,
            props: {},
        } as Post;

        await fetchPostAuthors(serverUrl, [post], false);
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: [post.id],
            posts: [post],
        });

        return {post};
    } catch (error) {
        logError('Failed sendEphemeralPost', error);
        return {error};
    }
};

/**
 * Helper function to prepare deletion models for a single post
 */
async function preparePostDeletion(database: Database, post: PostModel | Post) {
    const removeModels: Model[] = [];

    if (post.type === Post.POST_TYPES.COMBINED_USER_ACTIVITY) {
        const systemPostIds = getPostIdsForCombinedUserActivityPost(post.id);
        for await (const id of systemPostIds) {
            const postModel = await getPostById(database, id);
            if (postModel) {
                const preparedPost = await prepareDeletePost(postModel);
                removeModels.push(...preparedPost);
            }
        }
    } else {
        const postModel = await getPostById(database, post.id);
        if (postModel) {
            const preparedPost = await prepareDeletePost(postModel);
            removeModels.push(...preparedPost);
        }
    }

    return removeModels;
}

export async function removePost(serverUrl: string, post: PostModel | Post) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const removeModels = await preparePostDeletion(database, post);

        if (removeModels.length) {
            await operator.batchRecords(removeModels, 'removePost');
        }

        return {post};
    } catch (error) {
        logError('Failed removePost', error);
        return {error};
    }
}

export async function removePosts(serverUrl: string, posts: Array<PostModel | Post>) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Prepare all post deletions in parallel
        const allModels = await Promise.all(
            posts.map((post) => preparePostDeletion(database, post)),
        );

        // Flatten the array of arrays into a single array
        const removeModels = allModels.flat();

        if (removeModels.length) {
            await operator.batchRecords(removeModels, 'removePosts');
        }

        return {posts};
    } catch (error) {
        logError('Failed removePosts', error);
        return {error};
    }
}

export async function markPostAsDeleted(serverUrl: string, post: Post, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const dbPost = await getPostById(database, post.id);
        if (!dbPost) {
            throw new Error('Post not found');
        }

        const model = dbPost.prepareUpdate((p) => {
            p.deleteAt = Date.now();
            p.message = '';
            p.messageSource = '';
            p.metadata = null;
            p.props = null;
        });

        if (!prepareRecordsOnly) {
            await operator.batchRecords([dbPost], 'markPostAsDeleted');
        }
        return {model};
    } catch (error) {
        logError('Failed markPostAsDeleted', error);
        return {error};
    }
}

/**
 * Prepare the models related to the posts of a channel.
 * @param {string} serverUrl the server URL for this channel
 * @param {string} channelId the channel id
 * @param {Post[]} posts the posts in the channel
 * @param {string} actionType the action type for posts if it's `NEW`, `RECEIVED_IN_CHANNEL`, `RECEIVED_IN_THREAD`, etc.
 * @param {string[]} order the order of the posts
 * @param {string} previousPostId the previous post id
 * @param {UserProfile[]} authors the authors of the posts
 * @param {boolean} isCRTEnabled whether CRT is enabled for this channel
 * @returns {Promise<Model[]>} the models
 */
export async function prepareModelsForChannelPosts(
    serverUrl: string,
    channelId: string,
    posts: Post[],
    actionType: string,
    order: string[],
    previousPostId: string,
    authors: UserProfile[],
    isCRTEnabled: boolean,
): Promise<Model[]> {
    const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const models = [];

    const postModels = await operator.handlePosts({
        actionType,
        order,
        posts,
        previousPostId,
        prepareRecordsOnly: true,
    });
    models.push(...postModels);

    if (authors.length) {
        const userModels = await operator.handleUsers({users: authors, prepareRecordsOnly: true});
        models.push(...userModels);
    }

    const lastFetchedAt = getLastFetchedAtFromPosts(posts);
    let myChannelModel: MyChannelModel | undefined;
    if (lastFetchedAt) {
        const {member} = await updateMyChannelLastFetchedAt(serverUrl, channelId, lastFetchedAt, true);
        myChannelModel = member;
    }

    let lastPostAt = 0;
    for (const post of posts) {
        const isCrtReply = isCRTEnabled && post.root_id !== '';
        if (!isCrtReply) {
            lastPostAt = post.create_at > lastPostAt ? post.create_at : lastPostAt;
        }
    }

    if (lastPostAt) {
        const {member} = await updateLastPostAt(serverUrl, channelId, lastPostAt, true);
        if (member) {
            myChannelModel = member;
        }
    }

    if (myChannelModel) {
        models.push(myChannelModel);
    }

    if (isCRTEnabled) {
        const threadModels = await prepareThreadsFromReceivedPosts(operator, posts, false);
        if (threadModels?.length) {
            models.push(...threadModels);
        }
    }

    return models;
}

export async function storePostsForChannel(
    serverUrl: string, channelId: string, posts: Post[], order: string[], previousPostId: string,
    actionType: string, authors: UserProfile[], prepareRecordsOnly = false,
) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const isCRTEnabled = await getIsCRTEnabled(database);

        const models = await prepareModelsForChannelPosts(
            serverUrl,
            channelId,
            posts,
            actionType,
            order,
            previousPostId,
            authors,
            isCRTEnabled,
        );

        if (models.length && !prepareRecordsOnly) {
            await operator.batchRecords(models, 'storePostsForChannel');
        }

        return {models};
    } catch (error) {
        logError('storePostsForChannel', error);
        return {error};
    }
}

export async function getPosts(serverUrl: string, ids: string[], sort?: Q.SortOrder) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        return queryPostsById(database, ids, sort).fetch();
    } catch (error) {
        return [];
    }
}

export async function addPostAcknowledgement(serverUrl: string, postId: string, userId: string, acknowledgedAt: number, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const post = await getPostById(database, postId);
        if (!post) {
            throw new Error('Post not found');
        }

        // Check if the post has already been acknowledged by the user
        const isAckd = post.metadata?.acknowledgements?.find((a) => a.user_id === userId);
        if (isAckd) {
            return {error: false};
        }

        const acknowledgements = [...(post.metadata?.acknowledgements || []), {
            user_id: userId,
            acknowledged_at: acknowledgedAt,
            post_id: postId,
        }];

        const model = post.prepareUpdate((p) => {
            p.metadata = {
                ...p.metadata,
                acknowledgements,
            };
        });

        if (!prepareRecordsOnly) {
            await operator.batchRecords([model], 'addPostAcknowledgement');
        }

        return {model};
    } catch (error) {
        logError('Failed addPostAcknowledgement', error);
        return {error};
    }
}

export async function removePostAcknowledgement(serverUrl: string, postId: string, userId: string, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const post = await getPostById(database, postId);
        if (!post) {
            throw new Error('Post not found');
        }

        const model = post.prepareUpdate((record) => {
            record.metadata = {
                ...post.metadata,
                acknowledgements: post.metadata?.acknowledgements?.filter(
                    (a) => a.user_id !== userId,
                ) || [],
            };
        });

        if (!prepareRecordsOnly) {
            await operator.batchRecords([model], 'removePostAcknowledgement');
        }

        return {model};
    } catch (error) {
        logError('Failed removePostAcknowledgement', error);
        return {error};
    }
}

export async function deletePosts(serverUrl: string, postIds: string[]) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const placeholders = postIds.map(() => '?').join(',');

        await database.write(() => {
            return database.adapter.unsafeExecute({
                sqls: [
                    [`DELETE FROM ${POST} where id IN (${placeholders})`, postIds],
                    [`DELETE FROM ${REACTION} where post_id IN (${placeholders})`, postIds],
                    [`DELETE FROM ${FILE} where post_id IN (${placeholders})`, postIds],
                    [`DELETE FROM ${DRAFT} where root_id IN (${placeholders})`, postIds],

                    [`DELETE FROM ${POSTS_IN_THREAD} where root_id IN (${placeholders})`, postIds],

                    [`DELETE FROM ${THREAD} where id IN (${placeholders})`, postIds],
                    [`DELETE FROM ${THREAD_PARTICIPANT} where thread_id IN (${placeholders})`, postIds],
                    [`DELETE FROM ${THREADS_IN_TEAM} where thread_id IN (${placeholders})`, postIds],
                ],
            });
        });
        return {error: false};
    } catch (error) {
        return {error};
    }
}

export async function deletePostsInChannelsByCutoff(
    serverUrl: string,
    channelIds: string[],
    cutoff: number,
    excludedPostIds: Set<string> = new Set(),
): Promise<{error: unknown}> {
    if (channelIds.length === 0) {
        return {error: undefined};
    }

    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const channelPlaceholders = channelIds.map(() => '?').join(',');
        const excludedIds = [...excludedPostIds];
        const exclusionClause = excludedIds.length > 0 ? ` AND id NOT IN (${excludedIds.map(() => '?').join(',')})` : '';

        // A thread with a reply on or after the cutoff is alive even if its root is older;
        // keep the root so the surviving reply's root_id never dangles.
        const hasActiveReply = `EXISTS (SELECT 1 FROM ${POSTS_IN_THREAD} WHERE ${POSTS_IN_THREAD}.root_id = ${POST}.id AND ${POSTS_IN_THREAD}.latest >= ${cutoff})`;

        // Keep the root so a draft reply's root_id never dangles.
        const hasDraft = `EXISTS (SELECT 1 FROM ${DRAFT} WHERE ${DRAFT}.root_id = ${POST}.id)`;

        const postCondition = `channel_id IN (${channelPlaceholders}) AND create_at < ${cutoff} AND NOT ${hasActiveReply} AND NOT ${hasDraft}${exclusionClause}`;
        const postConditionArgs = [...channelIds, ...excludedIds];
        const postSubquery = `SELECT id FROM ${POST} WHERE ${postCondition}`;

        // Scopes PostsInThread trimming to roots in these channels.
        const rootInChannelsExists = `EXISTS (SELECT 1 FROM ${POST} WHERE ${POST}.id = ${POSTS_IN_THREAD}.root_id AND ${POST}.channel_id IN (${channelPlaceholders}))`;

        await database.write(() => {
            return database.adapter.unsafeExecute({
                sqls: [
                    [`DELETE FROM ${REACTION} WHERE post_id IN (${postSubquery})`, postConditionArgs],
                    [`DELETE FROM ${FILE} WHERE post_id IN (${postSubquery})`, postConditionArgs],

                    // PostsInThread bookkeeping, delete or update values depending on replies left in the thread after the cutoff
                    [`DELETE FROM ${POSTS_IN_THREAD} WHERE latest < ${cutoff} AND ${rootInChannelsExists}`, channelIds],
                    [`UPDATE ${POSTS_IN_THREAD} SET earliest = ${cutoff} WHERE earliest < ${cutoff} AND ${rootInChannelsExists}`, channelIds],

                    [`DELETE FROM ${THREAD} WHERE id IN (${postSubquery})`, postConditionArgs],
                    [`DELETE FROM ${THREAD_PARTICIPANT} WHERE thread_id IN (${postSubquery})`, postConditionArgs],
                    [`DELETE FROM ${THREADS_IN_TEAM} WHERE thread_id IN (${postSubquery})`, postConditionArgs],
                    [`DELETE FROM ${POST} WHERE ${postCondition}`, postConditionArgs],

                    // PostsInChannel bookkeeping, delete or update values depending on posts left in the channel after the cutoff
                    [`DELETE FROM ${POSTS_IN_CHANNEL} WHERE channel_id IN (${channelPlaceholders}) AND latest < ${cutoff}`, channelIds],
                    [`UPDATE ${POSTS_IN_CHANNEL} SET earliest = ${cutoff} WHERE channel_id IN (${channelPlaceholders}) AND earliest < ${cutoff}`, channelIds],

                    // MyChannel bookkeeping, reset last_fetched_at for channels that have no posts left after the cutoff
                    [`UPDATE ${MY_CHANNEL} SET last_fetched_at = 0 WHERE id IN (${channelPlaceholders}) AND last_fetched_at > 0 AND NOT EXISTS (SELECT 1 FROM ${POSTS_IN_CHANNEL} WHERE channel_id = ${MY_CHANNEL}.id)`, channelIds],
                ],
            });
        });

        // Re-apply the raw-SQL bookkeeping through the model layer so cached rows and
        // mounted observers reflect it too - unsafeExecute writes bypass both.
        const channelIdFilter = Q.oneOf(channelIds);
        const picRows = await database.get<PostsInChannelModel>(POSTS_IN_CHANNEL).query(Q.where('channel_id', channelIdFilter)).fetch();
        const pitRows = await database.get<PostsInThreadModel>(POSTS_IN_THREAD).query(Q.on(POST, Q.where('channel_id', channelIdFilter))).fetch();
        const myChannelRows = await database.get<MyChannelModel>(MY_CHANNEL).query(Q.where('id', channelIdFilter)).fetch();
        const channelsWithSurvivingPosts = new Set(picRows.map((row) => row.channelId));

        const prepared: Model[] = [
            ...picRows.
                filter((row) => row.earliest < cutoff).
                map((row) => row.prepareUpdate((r) => {
                    r.earliest = cutoff;
                })),
            ...pitRows.
                filter((row) => row.earliest < cutoff).
                map((row) => row.prepareUpdate((r) => {
                    r.earliest = cutoff;
                })),
            ...myChannelRows.
                filter((row) => row.lastFetchedAt > 0 && !channelsWithSurvivingPosts.has(row.id)).
                map((row) => row.prepareUpdate((r) => {
                    r.lastFetchedAt = 0;
                })),
        ];
        if (prepared.length > 0) {
            await operator.batchRecords(prepared, 'deletePostsInChannelsByCutoff.reconcile');
        }

        return {error: undefined};
    } catch (error) {
        return {error};
    }
}

export function getUsersCountFromMentions(serverUrl: string, mentions: string[]): Promise<number> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        return countUsersFromMentions(database, mentions);
    } catch (error) {
        return Promise.resolve(0);
    }
}

export const updatePostTranslation = async (serverUrl: string, postId: string, language: string, translation: PostTranslation) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const post = await getPostById(database, postId);
        if (!post) {
            return {error: 'Post not found'};
        }
        await database.write(async () => {
            post.update((v) => {
                // At this point, the metadata is a string, so we need to parse it
                let metadata: PostMetadata = safeParseJSON(v.metadata as string) as PostMetadata;
                if (!metadata) {
                    metadata = {};
                }
                if (!metadata.translations) {
                    metadata.translations = {};
                }
                metadata.translations[language] = translation;
                v.metadata = JSON.stringify(metadata) as any;
            });
        });
        return {error: undefined};
    } catch (error) {
        logError('Failed updatePostTranslation', error);
        return {error};
    }
};
