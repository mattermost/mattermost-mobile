// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {ActionType} from '@constants';
import {MM_TABLES} from '@constants/database';
import {buildDraftKey} from '@database/operator/server_data_operator/comparators';
import {
    transformDraftRecord,
    transformPostInThreadRecord,
    transformPostRecord,
    transformPostsInChannelRecord,
    transformSchedulePostsRecord,
} from '@database/operator/server_data_operator/transformers/post';
import {getRawRecordPairs, getUniqueRawsBy, getValidRecordsForUpdate} from '@database/operator/utils/general';
import {createPostsChain, getPostListEdges} from '@database/operator/utils/post';
import {queryScheduledPostsForTeam} from '@queries/servers/scheduled_post';
import {getCurrentTeamId} from '@queries/servers/system';
import FileModel from '@typings/database/models/servers/file';
import ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import {safeParseJSON} from '@utils/helpers';
import {logWarning} from '@utils/log';

import {shouldUpdateScheduledPostRecord} from '../comparators/scheduled_post';

import type ServerDataOperatorBase from '.';
import type Database from '@nozbe/watermelondb/Database';
import type Model from '@nozbe/watermelondb/Model';
import type {HandleDraftArgs, HandleFilesArgs, HandlePostsArgs, HandleScheduledPostErrorCodeArgs, HandleScheduledPostsArgs, RecordPair} from '@typings/database/database';
import type DraftModel from '@typings/database/models/servers/draft';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';
import type ReactionModel from '@typings/database/models/servers/reaction';

const {
    DRAFT,
    POST,
    POSTS_IN_CHANNEL,
    POSTS_IN_THREAD,
    SCHEDULED_POST,
} = MM_TABLES.SERVER;

type PostActionType = keyof typeof ActionType.POSTS;

export interface PostHandlerMix {
    handleScheduledPosts: ({actionType, scheduledPosts, includeDirectChannelPosts, prepareRecordsOnly}: HandleScheduledPostsArgs) => Promise<ScheduledPostModel[]>;
    handleUpdateScheduledPostErrorCode: ({scheduledPostId, errorCode, prepareRecordsOnly}: HandleScheduledPostErrorCodeArgs) => Promise<ScheduledPostModel>;
    handleDraft: ({drafts, prepareRecordsOnly}: HandleDraftArgs) => Promise<DraftModel[]>;
    handleFiles: ({files, prepareRecordsOnly}: HandleFilesArgs) => Promise<FileModel[]>;
    handlePosts: ({actionType, order, posts, previousPostId, prepareRecordsOnly}: HandlePostsArgs) => Promise<Model[]>;
    handlePostsInChannel: (posts: Post[]) => Promise<void>;
    handlePostsInThread: (rootPosts: PostsInThread[]) => Promise<void>;

    handleReceivedPostsInChannel: (posts: Post[], prepareRecordsOnly?: boolean) => Promise<PostsInChannelModel[]>;
    handleReceivedPostsInChannelSince: (posts: Post[], prepareRecordsOnly?: boolean) => Promise<PostsInChannelModel[]>;
    handleReceivedPostsInChannelBefore: (posts: Post[], prepareRecordsOnly?: boolean) => Promise<PostsInChannelModel[]>;
    handleReceivedPostsInChannelAfter: (posts: Post[], prepareRecordsOnly?: boolean) => Promise<PostsInChannelModel[]>;
    handleReceivedPostForChannel: (post: Post, prepareRecordsOnly?: boolean) => Promise<PostsInChannelModel[]>;

    handleReceivedPostsInThread: (postsMap: Record<string, Post[]>, prepareRecordsOnly?: boolean) => Promise<PostsInThreadModel[]>;
}

const mergePostInChannelChunks = async (newChunk: PostsInChannelModel, existingChunks: PostsInChannelModel[]) => {
    let newChunkUpdated = false;
    const result: PostsInChannelModel[] = [];
    for (const chunk of existingChunks) {
        // Exit early if there is no possibility of any other intersection
        if (chunk.latest < newChunk.earliest) {
            break;
        }

        // omit the current chunk
        if (chunk.id === newChunk.id) {
            continue;
        }

        // delete contained chunks
        if (newChunk.earliest <= chunk.earliest && newChunk.latest >= chunk.latest) {
            result.push(chunk.prepareDestroyPermanently());
            continue;
        }

        // fuse with any other chunk it intersect with
        if (
            (newChunk.earliest <= chunk.earliest && newChunk.latest >= chunk.earliest) ||
            (newChunk.latest >= chunk.latest && newChunk.earliest >= chunk.earliest)
        ) {
            newChunkUpdated = true;

            // We may be updating this record several times, but our patches in the WatermelonDB library
            // should handle that gracefully.
            newChunk.prepareUpdate((r) => {
                r.earliest = Math.min(r.earliest, chunk.earliest);
                r.latest = Math.max(r.latest, chunk.latest);
            });
            result.push(chunk.prepareDestroyPermanently());
        }
    }

    if (newChunkUpdated) {
        // We may be adding this record twice in the caller if prepareRecordsOnly is true, but our patches in
        // the WatermelonDB library should handle that gracefully.
        result.push(newChunk);
    }

    return result;
};

export const exportedForTest = {
    mergePostInChannelChunks,
};

const PostHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {
    /**
     * handleScheduledPosts: Handler responsible for the Create/Update operations occurring the SchedulePost table from the 'Server' schema
     * @param {HandleScheduledPostsArgs} ScheduledPostsArgs
     * @returns {Promise<ScheduledPostModel[]>}
     */
    handleScheduledPosts = async ({actionType, scheduledPosts, includeDirectChannelPosts, prepareRecordsOnly}: HandleScheduledPostsArgs): Promise<ScheduledPostModel[]> => {
        const database: Database = this.database;
        const scheduledPostsToDelete: ScheduledPostModel[] = [];
        const scheduledPostsToCreateAndUpdate: ScheduledPostModel[] = [];

        const currentTeamId = await getCurrentTeamId(database);

        switch (actionType) {
            case ActionType.SCHEDULED_POSTS.DELETE_SCHEDULED_POST: {
                const toDeleteIds = scheduledPosts?.map((post) => post.id) || [];
                if (toDeleteIds.length > 0) {
                    scheduledPostsToDelete.push(...await this._deleteScheduledPostByIds(toDeleteIds, true));
                }
                break;
            }

            case ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST: {
                const createOrUpdateRawValues = getUniqueRawsBy({raws: scheduledPosts ?? [], key: 'id'}) as ScheduledPost[];
                scheduledPostsToCreateAndUpdate.push(...await this._createOrUpdateScheduledPost(createOrUpdateRawValues, true));
                break;
            }

            case ActionType.SCHEDULED_POSTS.RECEIVED_ALL_SCHEDULED_POSTS: {
                const idsFromServer = new Set(scheduledPosts?.map((post) => post.id) || []);
                const existingScheduledPosts = await queryScheduledPostsForTeam(database, currentTeamId, includeDirectChannelPosts).fetch();
                const deletedScheduledPostIds = existingScheduledPosts.
                    filter((post) => !idsFromServer.has(post.id)).
                    map((post) => post.id);

                if (deletedScheduledPostIds.length > 0) {
                    scheduledPostsToDelete.push(...await this._deleteScheduledPostByIds(deletedScheduledPostIds, true));
                }

                if (scheduledPosts?.length) {
                    const createOrUpdateRawValues = getUniqueRawsBy({raws: scheduledPosts ?? [], key: 'id'}) as ScheduledPost[];
                    scheduledPostsToCreateAndUpdate.push(...await this._createOrUpdateScheduledPost(createOrUpdateRawValues, true));
                }
                break;
            }
        }

        const batch: ScheduledPostModel[] = [...scheduledPostsToDelete, ...scheduledPostsToCreateAndUpdate];
        if (!prepareRecordsOnly && batch.length) {
            await this.batchRecords(batch, 'handleScheduledPosts');
        }

        return batch;
    };

    handleUpdateScheduledPostErrorCode = async ({scheduledPostId, errorCode, prepareRecordsOnly}: HandleScheduledPostErrorCodeArgs) => {
        const database: Database = this.database;
        const scheduledPost = await database.get<ScheduledPostModel>(SCHEDULED_POST).find(scheduledPostId);

        if (!scheduledPost) {
            logWarning(
                `Scheduled Post with id ${scheduledPostId} not found in the database`,
            );
            return null;
        }

        const updatedScheduledPost = scheduledPost.prepareUpdate((record) => {
            record.errorCode = errorCode;
            record.updateAt = scheduledPost.updateAt; // We don't want to update the updateAt field as prepareUpdate will do it if it is not set
        });

        if (!prepareRecordsOnly) {
            await this.batchRecords([updatedScheduledPost], 'handleScheduledPostErrorCode');
        }

        return updatedScheduledPost;
    };

    _createOrUpdateScheduledPost = async (scheduledPosts: ScheduledPost[], prepareRecordsOnly = false): Promise<ScheduledPostModel[]> => {
        const processedScheduledPosts = await this.processRecords({
            createOrUpdateRawValues: scheduledPosts,
            deleteRawValues: [],
            tableName: SCHEDULED_POST,
            fieldName: 'id',
            shouldUpdate: shouldUpdateScheduledPostRecord,
        });

        const preparedScheduledPosts = await this.prepareRecords({
            createRaws: processedScheduledPosts.createRaws,
            updateRaws: processedScheduledPosts.updateRaws,
            deleteRaws: processedScheduledPosts.deleteRaws,
            transformer: transformSchedulePostsRecord,
            tableName: SCHEDULED_POST,
        }) as ScheduledPostModel[];

        if (preparedScheduledPosts.length && !prepareRecordsOnly) {
            await this.batchRecords(preparedScheduledPosts, 'handleScheduledPosts');
        }

        return preparedScheduledPosts;
    };

    _deleteScheduledPostByIds = async (scheduledPostIds: string[], prepareRecordsOnly = false): Promise<ScheduledPostModel[]> => {
        const database: Database = this.database;
        const scheduledPostsToDelete = await database.get<ScheduledPostModel>(SCHEDULED_POST).query(Q.where('id', Q.oneOf(scheduledPostIds))).fetch();

        const preparedScheduledPosts = await this.prepareRecords({
            deleteRaws: scheduledPostsToDelete,
            transformer: transformSchedulePostsRecord,
            tableName: SCHEDULED_POST,
        }) as ScheduledPostModel[];

        if (preparedScheduledPosts.length && !prepareRecordsOnly) {
            await this.batchRecords(preparedScheduledPosts, '_deleteScheduledPostByIds');
        }

        return preparedScheduledPosts;
    };

    /**
     * handleDraft: Handler responsible for the Create/Update operations occurring the Draft table from the 'Server' schema
     * @param {HandleDraftArgs} draftsArgs
     * @param {RawDraft[]} draftsArgs.drafts
     * @param {boolean} draftsArgs.prepareRecordsOnly
     * @returns {Promise<DraftModel[]>}
     */
    handleDraft = async ({drafts, prepareRecordsOnly = true}: HandleDraftArgs): Promise<DraftModel[]> => {
        if (!drafts?.length) {
            logWarning(
                'An empty or undefined "drafts" array has been passed to the handleDraft method',
            );
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: drafts, key: 'channel_id'});

        return this.handleRecords({
            fieldName: 'channel_id',
            buildKeyRecordBy: buildDraftKey,
            transformer: transformDraftRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: DRAFT,
        }, 'handleDraft');
    };

    /**
     * handlePosts: Handler responsible for the Create/Update operations occurring on the Post table from the 'Server' schema
     * @param {HandlePostsArgs} handlePosts
     * @param {string} handlePosts.actionType
     * @param {string[]} handlePosts.order
     * @param {RawPost[]} handlePosts.posts
     * @param {string | undefined} handlePosts.previousPostId
     * @param {boolean | undefined} handlePosts.prepareRecordsOnly
     * @returns {Promise<Model[]>}
     */
    handlePosts = async ({actionType, order, posts, previousPostId = '', prepareRecordsOnly = false}: HandlePostsArgs): Promise<Model[]> => {
        const tableName = POST;

        // We rely on the posts array; if it is empty, we stop processing
        if (!posts?.length) {
            logWarning(
                'An empty or undefined "posts" array has been passed to the handlePosts method',
            );
            return [];
        }

        const emojis: CustomEmoji[] = [];
        const files: FileInfo[] = [];
        const postsReactions: ReactionsPerPost[] = [];
        const pendingPostsToDelete: Post[] = [];
        const postsInThread: Record<string, Post[]> = {};
        const receivedFilesSet = new Set<string>();

        // Let's process the post data
        for (const post of posts) {
            // Find any pending posts that matches the ones received to mark for deletion
            if (post.pending_post_id && post.id !== post.pending_post_id) {
                pendingPostsToDelete.push({
                    ...post,
                    id: post.pending_post_id,
                });
            }

            if (post.root_id) {
                if (postsInThread[post.root_id]) {
                    postsInThread[post.root_id].push(post);
                } else {
                    postsInThread[post.root_id] = [post];
                }
            }

            // Process the metadata of each post
            if (post?.metadata && Object.keys(post?.metadata).length > 0) {
                // parsing into json since notifications are sending metadata as a string
                const data = safeParseJSON(post.metadata) as PostMetadata;

                // Extracts reaction from post's metadata
                if (data.reactions) {
                    postsReactions.push({post_id: post.id, reactions: data.reactions});
                    delete data.reactions;
                }

                // Extracts emojis from post's metadata
                if (data.emojis) {
                    emojis.push(...data.emojis);
                    delete data.emojis;
                }

                // Extracts files from post's metadata
                if (data.files) {
                    files.push(...data.files);
                    delete data.files;
                }

                post.metadata = data;
            }

            post.file_ids?.forEach((fileId) => receivedFilesSet.add(fileId));
        }

        // Get unique posts in case they are duplicated
        const uniquePosts = getUniqueRawsBy({
            raws: posts,
            key: 'id',
        }) as Post[];

        const deletedPostIds = uniquePosts.reduce((result, post) => {
            if (post.delete_at > 0) {
                result.add(post.id);
            }

            return result;
        }, new Set<string>());

        const database: Database = this.database;
        if (deletedPostIds.size) {
            const postsToDelete = await database.get<PostModel>(POST).query(Q.where('id', Q.oneOf(Array.from(deletedPostIds)))).fetch();
            if (postsToDelete.length) {
                await database.write(async () => {
                    const promises = postsToDelete.map((p) => p.destroyPermanently());
                    await Promise.all(promises);
                });
            }
        }

        // Process the posts to get which ones need to be created and which updated
        const processedPosts = (await this.processRecords({
            createOrUpdateRawValues: uniquePosts.filter((p) => p.delete_at === 0),
            deleteRawValues: pendingPostsToDelete,
            tableName,
            fieldName: 'id',
            shouldUpdate: (e: PostModel, n: Post) => n.update_at > e.updateAt,
        }));

        const preparedPosts = (await this.prepareRecords({
            createRaws: processedPosts.createRaws,
            updateRaws: processedPosts.updateRaws,
            deleteRaws: processedPosts.deleteRaws,
            transformer: transformPostRecord,
            tableName,
        })) as PostModel[];

        // Add the models to be batched here
        const batch: Model[] = [...preparedPosts];

        if (postsReactions.length) {
            // calls handler for Reactions
            const postReactions = (await this.handleReactions({postsReactions, prepareRecordsOnly: true})) as ReactionModel[];
            batch.push(...postReactions);
        }

        if (files.length) {
            // calls handler for Files
            const postFiles = await this.handleFiles({files, prepareRecordsOnly: true});
            batch.push(...postFiles);
        }

        const allFiles = await database.get<FileModel>(MM_TABLES.SERVER.FILE).query(Q.where('post_id', Q.oneOf(uniquePosts.map((p) => p.id)))).fetch();
        allFiles.forEach((f) => {
            if (!receivedFilesSet.has(f.id)) {
                batch.push(f.prepareDestroyPermanently());
            }
        });

        if (emojis.length) {
            const postEmojis = await this.handleCustomEmojis({emojis, prepareRecordsOnly: true});
            batch.push(...postEmojis);
        }

        if (actionType !== ActionType.POSTS.RECEIVED_IN_THREAD) {
            // link the newly received posts
            const linkedPosts = createPostsChain({order, posts, previousPostId});
            if (linkedPosts.length) {
                const postsInChannel = await this.handlePostsInChannel(linkedPosts, actionType as never, true);
                if (postsInChannel.length) {
                    batch.push(...postsInChannel);
                }
            }
        }

        if (Object.keys(postsInThread).length) {
            const postsInThreads = await this.handlePostsInThread(postsInThread, actionType as never, true);
            if (postsInThreads.length) {
                batch.push(...postsInThreads);
            }
        }

        if (batch.length && !prepareRecordsOnly) {
            await this.batchRecords(batch, 'handlePosts');
        }

        return batch;
    };

    /**
     * handlePostsInThread: Handler responsible for the Create/Update operations occurring on the PostsInThread table from the 'Server' schema
     * @param {Record<string, Post[]>} postsMap
     * @param {PostActionType} actionType
     * @param {boolean} prepareRecordsOnly
     * @returns {Promise<void>}
     */
    handlePostsInThread = async (postsMap: Record<string, Post[]>, actionType: PostActionType, prepareRecordsOnly = false): Promise<PostsInThreadModel[]> => {
        if (!postsMap || !Object.keys(postsMap).length) {
            logWarning(
                'An empty or undefined "postsMap" object has been passed to the handlePostsInThread method',
            );
            return [];
        }
        switch (actionType) {
            case ActionType.POSTS.RECEIVED_IN_CHANNEL:
            case ActionType.POSTS.RECEIVED_IN_THREAD:
            case ActionType.POSTS.RECEIVED_SINCE:
            case ActionType.POSTS.RECEIVED_AFTER:
            case ActionType.POSTS.RECEIVED_BEFORE:
            case ActionType.POSTS.RECEIVED_NEW:
                return this.handleReceivedPostsInThread(postsMap, prepareRecordsOnly) as Promise<PostsInThreadModel[]>;
        }

        return [];
    };

    /**
     * handlePostsInChannel: Handler responsible for the Create/Update operations occurring on the PostsInChannel table from the 'Server' schema
     * @param {Post[]} posts
     * @param {PostActionType} actionType
     * @param {boolean} prepareRecordsOnly
     * @returns {Promise<void>}
     */
    handlePostsInChannel = async (posts: Post[], actionType: PostActionType, prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        // At this point, the parameter 'posts' is already a chain of posts.  Now, we have to figure out how to plug it
        // into existing chains in the PostsInChannel table

        const permittedActions = Object.values(ActionType.POSTS);

        if (!posts.length || !permittedActions.includes(actionType)) {
            logWarning(
                'An empty or undefined "posts" array or an non-supported actionType has been passed to the handlePostsInChannel method',
            );
            return [];
        }

        switch (actionType) {
            case ActionType.POSTS.RECEIVED_IN_CHANNEL:
                return this.handleReceivedPostsInChannel(posts, prepareRecordsOnly) as Promise<PostsInChannelModel[]>;
            case ActionType.POSTS.RECEIVED_SINCE:
                return this.handleReceivedPostsInChannelSince(posts, prepareRecordsOnly) as Promise<PostsInChannelModel[]>;
            case ActionType.POSTS.RECEIVED_AFTER:
                return this.handleReceivedPostsInChannelAfter(posts, prepareRecordsOnly) as Promise<PostsInChannelModel[]>;
            case ActionType.POSTS.RECEIVED_BEFORE:
                return this.handleReceivedPostsInChannelBefore(posts, prepareRecordsOnly) as Promise<PostsInChannelModel[]>;
            case ActionType.POSTS.RECEIVED_NEW:
                return this.handleReceivedNewPostForChannel(posts, prepareRecordsOnly) as Promise<PostsInChannelModel[]>;
        }

        return [];
    };

    // ========================
    // POST IN CHANNEL
    // ========================

    _createPostsInChannelRecord = async (channelId: string, earliest: number, latest: number, prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        const models = await this.prepareRecords({
            tableName: POSTS_IN_CHANNEL,
            createRaws: [{record: undefined, raw: {channel_id: channelId, earliest, latest}}],
            transformer: transformPostsInChannelRecord,
        });

        if (!prepareRecordsOnly) {
            await this.batchRecords(models, '_createPostsInChannelRecord');
        }

        return models;
    };

    _mergePostInChannelChunks = async (newChunk: PostsInChannelModel, existingChunks: PostsInChannelModel[], prepareRecordsOnly = false) => {
        const result = await mergePostInChannelChunks(newChunk, existingChunks);
        if (result.length && !prepareRecordsOnly) {
            await this.batchRecords(result, '_mergePostInChannelChunks');
        }

        return result;
    };

    handleReceivedPostsInChannel = async (posts?: Post[], prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        if (!posts?.length) {
            logWarning(
                'An empty or undefined "posts" array has been passed to the handleReceivedPostsInChannel method',
            );
            return [];
        }

        const {firstPost, lastPost} = getPostListEdges(posts);
        const channelId = firstPost.channel_id;
        const earliest = firstPost.create_at;
        const latest = lastPost.create_at;

        // Find the records in the PostsInChannel table that have a matching channel_id
        const chunks = (await this.database.get(POSTS_IN_CHANNEL).query(
            Q.where('channel_id', channelId),
            Q.sortBy('latest', Q.desc),
        ).fetch()) as PostsInChannelModel[];

        // chunk length 0; then it's a new chunk to be added to the PostsInChannel table
        if (!chunks.length) {
            return this._createPostsInChannelRecord(channelId, earliest, latest, prepareRecordsOnly);
        }

        let targetChunk: PostsInChannelModel|undefined;

        for (const chunk of chunks) {
            // find if we should plug the chain along an existing chunk
            if (
                (earliest >= chunk.earliest && earliest <= chunk.latest) ||
                (latest <= chunk.latest && latest >= chunk.earliest)
            ) {
                targetChunk = chunk;
                break;
            }
        }

        if (!targetChunk) {
            // Create a new chunk and merge them if needed
            const models = [];
            models.push(...await this._createPostsInChannelRecord(channelId, earliest, latest, prepareRecordsOnly));
            models.push(...await this._mergePostInChannelChunks(models[0], chunks, prepareRecordsOnly));
            return models;
        }

        // Check if the new chunk is contained by the existing chunk
        if (
            targetChunk.earliest <= earliest &&
            targetChunk.latest >= latest
        ) {
            return [];
        }

        const models = [];

        // If the chunk was found, Update the chunk and return
        models.push(targetChunk.prepareUpdate((record) => {
            record.earliest = Math.min(record.earliest, earliest);
            record.latest = Math.max(record.latest, latest);
        }));
        models.push(...await this._mergePostInChannelChunks(targetChunk, chunks, prepareRecordsOnly));

        if (!prepareRecordsOnly) {
            this.batchRecords(models, 'handleReceivedPostsInChannel');
        }

        return models;
    };

    handleReceivedPostsInChannelSince = async (posts: Post[], prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        if (!posts?.length) {
            logWarning(
                'An empty or undefined "posts" array has been passed to the handleReceivedPostsInChannelSince method',
            );
            return [];
        }

        const {firstPost, lastPost} = getPostListEdges(posts);
        const channelId = firstPost.channel_id;
        const latest = lastPost.create_at;

        const chunks = (await this.database.get(POSTS_IN_CHANNEL).query(
            Q.where('channel_id', channelId),
            Q.sortBy('latest', Q.desc),
        ).fetch()) as PostsInChannelModel[];

        if (!chunks.length) {
            // Create a new chunk in case somehow the chunks got deleted for this channel
            const earliest = firstPost.create_at;
            return this._createPostsInChannelRecord(channelId, earliest, latest, prepareRecordsOnly);
        }

        const targetChunk = chunks[0];

        if (targetChunk.latest >= latest) {
            return [];
        }

        // We've got new posts that belong to this chunk
        const models = [targetChunk.prepareUpdate((record) => {
            record.latest = Math.max(record.latest, latest);
        })];

        if (!prepareRecordsOnly) {
            this.batchRecords(models, 'handleReceivedPostsInChannelSince');
        }

        return models;
    };

    handleReceivedPostsInChannelBefore = async (posts: Post[], prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        if (!posts?.length) {
            logWarning(
                'An empty or undefined "posts" array has been passed to the handleReceivedPostsInChannelBefore method',
            );
            return [];
        }

        const {firstPost, lastPost} = getPostListEdges(posts);
        const channelId = firstPost.channel_id;
        const earliest = firstPost.create_at;

        // Find the records in the PostsInChannel table that have a matching channel_id
        const chunks = (await this.database.get(POSTS_IN_CHANNEL).query(
            Q.where('channel_id', channelId),
            Q.sortBy('latest', Q.desc),
        ).fetch()) as PostsInChannelModel[];

        if (!chunks.length) {
            // Create a new chunk in case somehow the chunks got deleted for this channel
            const latest = lastPost.create_at;
            return this._createPostsInChannelRecord(channelId, earliest, latest, prepareRecordsOnly);
        }

        const targetChunk = chunks[0];
        if (targetChunk.earliest <= earliest) {
            return [];
        }

        const models = [];

        // If the chunk was found, Update the chunk and return
        models.push(targetChunk.prepareUpdate((record) => {
            record.earliest = Math.min(record.earliest, earliest);
        }));

        models.push(...(await this._mergePostInChannelChunks(targetChunk, chunks, prepareRecordsOnly)));

        if (!prepareRecordsOnly) {
            this.batchRecords(models, 'handleReceivedPostsInChannelBefore');
        }

        return models;
    };

    handleReceivedPostsInChannelAfter = async (posts: Post[], prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        throw new Error(`handleReceivedPostsInChannelAfter Not implemented yet. posts count${posts.length} prepareRecordsOnly=${prepareRecordsOnly}`);
    };

    handleReceivedNewPostForChannel = async (posts: Post[], prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        if (!posts?.length) {
            logWarning(
                'An empty or undefined "posts" array has been passed to the handleReceivedPostForChannel method',
            );
            return [];
        }

        const {firstPost, lastPost} = getPostListEdges(posts);
        const channelId = firstPost.channel_id;
        const earliest = firstPost.create_at;
        const latest = lastPost.create_at;

        // Find the records in the PostsInChannel table that have a matching channel_id
        const chunks = (await this.database.get(POSTS_IN_CHANNEL).query(
            Q.where('channel_id', channelId),
            Q.sortBy('latest', Q.desc),
        ).fetch()) as PostsInChannelModel[];

        // chunk length 0; then it's a new chunk to be added to the PostsInChannel table
        if (chunks.length === 0) {
            return this._createPostsInChannelRecord(channelId, earliest, latest, prepareRecordsOnly);
        }

        const targetChunk = chunks[0];
        if (targetChunk.latest >= latest) {
            return [];
        }

        // If the chunk was found, Update the chunk and return
        targetChunk.prepareUpdate((record) => {
            record.latest = Math.max(record.latest, latest);
        });

        if (!prepareRecordsOnly) {
            this.batchRecords([targetChunk], 'handleReceivedNewPostForChannel');
        }
        return [targetChunk];
    };

    // ========================
    // POST IN THREAD
    // ========================

    handleReceivedPostsInThread = async (postsMap: Record<string, Post[]>, prepareRecordsOnly = false): Promise<PostsInThreadModel[]> => {
        if (!postsMap || !Object.keys(postsMap).length) {
            logWarning(
                'An empty or undefined "postsMap" object has been passed to the handleReceivedPostsInThread method',
            );
            return [];
        }

        const update: Array<RecordPair<PostsInThreadModel, PostsInThread>> = [];
        const create: PostsInThread[] = [];
        const ids = Object.keys(postsMap);
        for await (const rootId of ids) {
            const {firstPost, lastPost} = getPostListEdges(postsMap[rootId]);
            const chunks = (await this.database.get<PostsInThreadModel>(POSTS_IN_THREAD).query(
                Q.where('root_id', rootId),
                Q.sortBy('latest', Q.desc),
            ).fetch());

            if (chunks.length) {
                const chunk = chunks[0];
                const newValue = {
                    root_id: rootId,
                    earliest: Math.min(chunk.earliest, firstPost.create_at),
                    latest: Math.max(chunk.latest, lastPost.create_at),
                };
                update.push(getValidRecordsForUpdate({
                    tableName: POSTS_IN_THREAD,
                    newValue,
                    existingRecord: chunk,
                }));
            } else {
                // create chunk
                create.push({
                    root_id: rootId,
                    earliest: firstPost.create_at,
                    latest: lastPost.create_at,
                });
            }
        }

        const postInThreadRecords = await this.prepareRecords<PostsInThreadModel, PostsInThread>({
            createRaws: getRawRecordPairs(create),
            updateRaws: update,
            transformer: transformPostInThreadRecord,
            tableName: POSTS_IN_THREAD,
        });

        if (postInThreadRecords?.length && !prepareRecordsOnly) {
            await this.batchRecords(postInThreadRecords, 'handleReceivedPostsInThread');
        }

        return postInThreadRecords;
    };
};

export default PostHandler;
