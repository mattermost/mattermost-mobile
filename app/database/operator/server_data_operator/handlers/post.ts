// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {ActionType} from '@constants';
import {MM_TABLES} from '@constants/database';
import {buildDraftKey} from '@database/operator/server_data_operator/comparators';
import {
    transformDraftRecord,
    transformFileRecord,
    transformPostRecord,
} from '@database/operator/server_data_operator/transformers/post';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {createPostsChain} from '@database/operator/utils/post';

import type Database from '@nozbe/watermelondb/Database';
import type Model from '@nozbe/watermelondb/Model';
import type {HandleDraftArgs, HandleFilesArgs, HandlePostsArgs, ProcessRecordResults} from '@typings/database/database';
import type DraftModel from '@typings/database/models/servers/draft';
import type FileModel from '@typings/database/models/servers/file';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';
import type ReactionModel from '@typings/database/models/servers/reaction';

const {
    DRAFT,
    FILE,
    POST,
} = MM_TABLES.SERVER;

export interface PostHandlerMix {
    handleDraft: ({drafts, prepareRecordsOnly}: HandleDraftArgs) => Promise<DraftModel[]>;
    handleFiles: ({files, prepareRecordsOnly}: HandleFilesArgs) => Promise<FileModel[]>;
    handlePosts: ({actionType, order, posts, previousPostId, prepareRecordsOnly}: HandlePostsArgs) => Promise<Model[]>;
    handlePostsInChannel: (posts: Post[]) => Promise<void>;
    handlePostsInThread: (rootPosts: PostsInThread[]) => Promise<void>;
}

const PostHandler = (superclass: any) => class extends superclass {
    /**
     * handleDraft: Handler responsible for the Create/Update operations occurring the Draft table from the 'Server' schema
     * @param {HandleDraftArgs} draftsArgs
     * @param {RawDraft[]} draftsArgs.drafts
     * @param {boolean} draftsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Promise<DraftModel[]>}
     */
    handleDraft = async ({drafts, prepareRecordsOnly = true}: HandleDraftArgs): Promise<DraftModel[]> => {
        if (!drafts?.length) {
            // eslint-disable-next-line no-console
            console.warn(
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
        });
    };

    /**
     * handlePosts: Handler responsible for the Create/Update operations occurring on the Post table from the 'Server' schema
     * @param {HandlePostsArgs} handlePosts
     * @param {string} handlePosts.actionType
     * @param {string[]} handlePosts.orders
     * @param {RawPost[]} handlePosts.values
     * @param {string | undefined} handlePosts.previousPostId
     * @param {boolean | undefined} handlePosts.prepareRecordsOnly
     * @returns {Promise<void>}
     */
    handlePosts = async ({actionType, order, posts, previousPostId = '', prepareRecordsOnly = false}: HandlePostsArgs): Promise<Model[]> => {
        const tableName = POST;

        // We rely on the posts array; if it is empty, we stop processing
        if (!posts?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "posts" array has been passed to the handlePosts method',
            );
            return [];
        }

        const emojis: CustomEmoji[] = [];
        const files: FileInfo[] = [];
        const postsReactions: ReactionsPerPost[] = [];
        const pendingPostsToDelete: Post[] = [];
        const postsInThread: Record<string, Post[]> = {};

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
                const data = post.metadata;

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

        if (deletedPostIds.size) {
            const database: Database = this.database;
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
        })) as ProcessRecordResults;

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
            await this.batchRecords(batch);
        }

        return batch;
    };

    /**
     * handleFiles: Handler responsible for the Create/Update operations occurring on the File table from the 'Server' schema
     * @param {HandleFilesArgs} handleFiles
     * @param {RawFile[]} handleFiles.files
     * @param {boolean} handleFiles.prepareRecordsOnly
     * @returns {Promise<FileModel[]>}
     */
    handleFiles = async ({files, prepareRecordsOnly}: HandleFilesArgs): Promise<FileModel[]> => {
        if (!files?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "files" array has been passed to the handleFiles method',
            );
            return [];
        }

        const processedFiles = (await this.processRecords({
            createOrUpdateRawValues: files,
            tableName: FILE,
            fieldName: 'id',
        })) as ProcessRecordResults;

        const postFiles = await this.prepareRecords({
            createRaws: processedFiles.createRaws,
            updateRaws: processedFiles.updateRaws,
            transformer: transformFileRecord,
            tableName: FILE,
        });

        if (prepareRecordsOnly) {
            return postFiles;
        }

        if (postFiles?.length) {
            await this.batchRecords(postFiles);
        }

        return postFiles;
    };

    /**
     * handlePostsInThread: Handler responsible for the Create/Update operations occurring on the PostsInThread table from the 'Server' schema
     * @param {PostsInThread[]} rootPosts
     * @returns {Promise<void>}
     */
    handlePostsInThread = async (postsMap: Record<string, Post[]>, actionType: never, prepareRecordsOnly = false): Promise<PostsInThreadModel[]> => {
        if (!postsMap || !Object.keys(postsMap).length) {
            // eslint-disable-next-line no-console
            console.warn(
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
     * @returns {Promise<void>}
     */
    handlePostsInChannel = async (posts: Post[], actionType: never, prepareRecordsOnly = false): Promise<PostsInChannelModel[]> => {
        // At this point, the parameter 'posts' is already a chain of posts.  Now, we have to figure out how to plug it
        // into existing chains in the PostsInChannel table

        const permittedActions = Object.values(ActionType.POSTS);

        if (!posts.length || !permittedActions.includes(actionType)) {
            // eslint-disable-next-line no-console
            console.warn(
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
                return this.handleReceivedPostForChannel(posts, prepareRecordsOnly) as Promise<PostsInChannelModel[]>;
        }

        return [];
    };
};

export default PostHandler;
