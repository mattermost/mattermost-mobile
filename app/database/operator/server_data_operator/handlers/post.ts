// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {isRecordDraftEqualToRaw, isRecordPostEqualToRaw} from '@database/operator/server_data_operator/comparators';
import {
    transformDraftRecord,
    transformFileRecord,
    transformPostInThreadRecord,
    transformPostMetadataRecord,
    transformPostRecord,
    transformPostsInChannelRecord,
} from '@database/operator/server_data_operator/transformers/post';
import {getRawRecordPairs, getUniqueRawsBy, retrieveRecords} from '@database/operator/utils/general';
import {createPostsChain, sanitizePosts} from '@database/operator/utils/post';

import type {HandleDraftArgs, HandleFilesArgs, HandlePostMetadataArgs, HandlePostsArgs, RecordPair} from '@typings/database/database';
import type DraftModel from '@typings/database/models/servers/draft';
import type FileModel from '@typings/database/models/servers/file';
import type PostModel from '@typings/database/models/servers/post';
import type PostMetadataModel from '@typings/database/models/servers/post_metadata';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';
import type ReactionModel from '@typings/database/models/servers/reaction';

const {
    DRAFT,
    FILE,
    POST,
    POSTS_IN_CHANNEL,
    POSTS_IN_THREAD,
    POST_METADATA,
} = MM_TABLES.SERVER;

export interface PostHandlerMix {
    handleDraft: ({drafts, prepareRecordsOnly}: HandleDraftArgs) => Promise<DraftModel[]>;
    handleFiles: ({files, prepareRecordsOnly}: HandleFilesArgs) => Promise<FileModel[]>;
    handlePostMetadata: ({metadatas, prepareRecordsOnly}: HandlePostMetadataArgs) => Promise<PostMetadataModel[]>;
    handlePosts: ({orders, values, previousPostId}: HandlePostsArgs) => Promise<void>;
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
    handleDraft = ({drafts, prepareRecordsOnly = true}: HandleDraftArgs): Promise<DraftModel[]> => {
        if (!drafts.length) {
            throw new DataOperatorException(
                'An empty "drafts" array has been passed to the handleDraft method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: drafts, key: 'channel_id'});

        return this.handleRecords({
            fieldName: 'channel_id',
            findMatchingRecordBy: isRecordDraftEqualToRaw,
            transformer: transformDraftRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: DRAFT,
        });
    };

    /**
     * handlePosts: Handler responsible for the Create/Update operations occurring on the Post table from the 'Server' schema
     * @param {HandlePostsArgs} handlePosts
     * @param {string[]} handlePosts.orders
     * @param {RawPost[]} handlePosts.values
     * @param {string | undefined} handlePosts.previousPostId
     * @returns {Promise<void>}
     */
    handlePosts = async ({orders, values, previousPostId}: HandlePostsArgs): Promise<void> => {
        const tableName = POST;

        // We rely on the order array; if it is empty, we stop processing
        if (!orders.length) {
            throw new DataOperatorException(
                'An empty "order" array has been passed to the handlePosts method',
            );
        }

        const rawValues = getUniqueRawsBy({
            raws: values,
            key: 'id',
        }) as Post[];

        // By sanitizing the values, we are separating 'posts' that needs updating ( i.e. un-ordered posts ) from those that need to be created in our database
        const {postsOrdered, postsUnordered} = sanitizePosts({
            posts: rawValues,
            orders,
        });

        // Here we verify in our database that the postsOrdered truly need 'CREATION'
        const futureEntries = await this.processRecords({
            createOrUpdateRawValues: postsOrdered,
            tableName,
            findMatchingRecordBy: isRecordPostEqualToRaw,
            fieldName: 'id',
        });

        if (futureEntries.createRaws?.length) {
            let batch: Model[] = [];
            const files: FileInfo[] = [];
            const postsInThread = [];
            const reactions: Reaction[] = [];
            const emojis: CustomEmoji[] = [];
            const metadatas: Metadata[] = [];

            // We create the 'chain of posts' by linking each posts' previousId to the post before it in the order array
            const linkedRawPosts: RecordPair[] = createPostsChain({
                orders,
                previousPostId: previousPostId || '',
                rawPosts: postsOrdered,
            });

            // Prepares records for batch processing onto the 'Post' table for the server schema
            const posts = (await this.prepareRecords({
                createRaws: linkedRawPosts,
                transformer: transformPostRecord,
                tableName,
            })) as PostModel[];

            // Appends the processed records into the final batch array
            batch = batch.concat(posts);

            // Starts extracting information from each post to build up for related tables' data
            for (const post of postsOrdered) {
                // PostInThread handler: checks for id === root_id , if so, then call PostsInThread operator
                if (!post.root_id) {
                    postsInThread.push({
                        earliest: post.create_at,
                        post_id: post.id,
                    });
                }

                if (post?.metadata && Object.keys(post?.metadata).length > 0) {
                    const data = post.metadata;

                    // Extracts reaction from post's metadata
                    if (data.reactions) {
                        reactions.push(...data.reactions);
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

                    metadatas.push({
                        data,
                        post_id: post.id,
                    });
                }
            }

            if (reactions.length) {
                // calls handler for Reactions
                const postReactions = (await this.handleReactions({reactions, prepareRecordsOnly: true})) as ReactionModel[];
                batch = batch.concat(postReactions);
            }

            if (files.length) {
                // calls handler for Files
                const postFiles = await this.handleFiles({files, prepareRecordsOnly: true});
                batch = batch.concat(postFiles);
            }

            if (metadatas.length) {
                // calls handler for postMetadata ( embeds and images )
                const postMetadata = await this.handlePostMetadata({
                    metadatas,
                    prepareRecordsOnly: true,
                });

                batch = batch.concat(postMetadata);
            }

            if (batch.length) {
                await this.batchRecords(batch);
            }

            // LAST: calls handler for CustomEmojis, PostsInThread, PostsInChannel
            if (emojis.length) {
                await this.handleCustomEmojis({
                    emojis,
                    prepareRecordsOnly: false,
                });
            }

            if (postsInThread.length) {
                await this.handlePostsInThread(postsInThread);
            }

            if (postsOrdered.length) {
                await this.handlePostsInChannel(postsOrdered);
            }
        }

        if (postsUnordered.length) {
            // Truly update those posts that have a different update_at value
            await this.handleRecords({
                findMatchingRecordBy: isRecordPostEqualToRaw,
                fieldName: 'id',
                trasformer: transformPostRecord,
                createOrUpdateRawValues: postsUnordered,
                tableName: POST,
                prepareRecordsOnly: false,
            });
        }
    };

    /**
     * handleFiles: Handler responsible for the Create/Update operations occurring on the File table from the 'Server' schema
     * @param {HandleFilesArgs} handleFiles
     * @param {RawFile[]} handleFiles.files
     * @param {boolean} handleFiles.prepareRecordsOnly
     * @returns {Promise<FileModel[]>}
     */
    handleFiles = async ({files, prepareRecordsOnly}: HandleFilesArgs): Promise<FileModel[]> => {
        if (!files.length) {
            return [];
        }

        const postFiles = await this.prepareRecords({
            createRaws: getRawRecordPairs(files),
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
     * handlePostMetadata: Handler responsible for the Create/Update operations occurring on the PostMetadata table from the 'Server' schema
     * @param {HandlePostMetadataArgs} handlePostMetadata
     * @param {{embed: RawEmbed[], postId: string}[] | undefined} handlePostMetadata.embeds
     * @param {{images: Dictionary<PostImage>, postId: string}[] | undefined} handlePostMetadata.images
     * @param {boolean} handlePostMetadata.prepareRecordsOnly
     * @returns {Promise<PostMetadataModel[]>}
     */
    handlePostMetadata = async ({metadatas, prepareRecordsOnly}: HandlePostMetadataArgs): Promise<PostMetadataModel[]> => {
        const postMetas = await this.prepareRecords({
            createRaws: getRawRecordPairs([metadatas]),
            transformer: transformPostMetadataRecord,
            tableName: POST_METADATA,
        });

        if (prepareRecordsOnly) {
            return postMetas;
        }

        if (postMetas?.length) {
            await this.batchRecords(postMetas);
        }

        return postMetas;
    };

    /**
     * handlePostsInThread: Handler responsible for the Create/Update operations occurring on the PostsInThread table from the 'Server' schema
     * @param {PostsInThread[]} rootPosts
     * @returns {Promise<void>}
     */
    handlePostsInThread = async (rootPosts: PostsInThread[]): Promise<void> => {
        if (!rootPosts.length) {
            return;
        }

        const postIds = rootPosts.map((postThread) => postThread.post_id);
        const rawPostsInThreads: PostsInThread[] = [];

        // Retrieves all threads whereby their root_id can be one of the element in the postIds array
        const threads = (await this.database.collections.
            get(POST).
            query(Q.where('root_id', Q.oneOf(postIds))).
            fetch()) as PostModel[];

        // The aim here is to find the last reply in that thread; hence the latest create_at value
        rootPosts.forEach((rootPost) => {
            const maxCreateAt: number = threads.reduce((max: number, thread: PostModel) => {
                return thread.createAt > max ? thread.createAt : maxCreateAt;
            }, 0);

            // Collects all 'raw' postInThreads objects that will be sent to the operatePostsInThread function
            rawPostsInThreads.push({...rootPost, latest: maxCreateAt});
        });

        if (rawPostsInThreads.length) {
            const postInThreadRecords = (await this.prepareRecords({
                createRaws: getRawRecordPairs(rawPostsInThreads),
                transformer: transformPostInThreadRecord,
                tableName: POSTS_IN_THREAD,
            })) as PostsInThreadModel[];

            if (postInThreadRecords?.length) {
                await this.batchRecords(postInThreadRecords);
            }
        }
    };

    /**
     * handlePostsInChannel: Handler responsible for the Create/Update operations occurring on the PostsInChannel table from the 'Server' schema
     * @param {Post[]} posts
     * @returns {Promise<void>}
     */
    handlePostsInChannel = async (posts: Post[]): Promise<void> => {
        // At this point, the parameter 'posts' is already a chain of posts.  Now, we have to figure out how to plug it
        // into existing chains in the PostsInChannel table

        if (!posts.length) {
            return;
        }

        // Sort a clone of 'posts' array by create_at
        const sortedPosts = [...posts].sort((a, b) => {
            return a.create_at - b.create_at;
        });

        // The first element (beginning of chain)
        const tipOfChain: Post = sortedPosts[0];

        // Channel Id for this chain of posts
        const channelId = tipOfChain.channel_id;

        // Find smallest 'create_at' value in chain
        const earliest = tipOfChain.create_at;

        // Find highest 'create_at' value in chain; -1 means we are dealing with one item in the posts array
        const latest = sortedPosts[sortedPosts.length - 1].create_at;

        // Find the records in the PostsInChannel table that have a matching channel_id
        // const chunks = (await database.collections.get(POSTS_IN_CHANNEL).query(Q.where('channel_id', channelId)).fetch()) as PostsInChannel[];
        const chunks = (await retrieveRecords({
            database: this.database,
            tableName: POSTS_IN_CHANNEL,
            condition: Q.where('channel_id', channelId),
        })) as PostsInChannelModel[];

        const createPostsInChannelRecord = async () => {
            await this.execute({
                createRaws: [{record: undefined, raw: {channel_id: channelId, earliest, latest}}],
                tableName: POSTS_IN_CHANNEL,
                transformer: transformPostsInChannelRecord,
            });
        };

        // chunk length 0; then it's a new chunk to be added to the PostsInChannel table
        if (chunks.length === 0) {
            await createPostsInChannelRecord();
            return;
        }

        // Sort chunks (in-place) by earliest field  ( oldest to newest )
        chunks.sort((a, b) => {
            return a.earliest - b.earliest;
        });

        let found = false;
        let targetChunk: PostsInChannelModel;

        for (const chunk of chunks) {
        // find if we should plug the chain before
            if (earliest < chunk.earliest) {
                found = true;
                targetChunk = chunk;
            }

            if (found) {
                break;
            }
        }

        if (found) {
        // We have a potential chunk to plug nearby
            const potentialPosts = (await retrieveRecords({
                database: this.database,
                tableName: POST,
                condition: Q.where('create_at', earliest),
            })) as PostModel[];

            if (potentialPosts?.length > 0) {
                const targetPost = potentialPosts[0];

                // now we decide if we need to operate on the targetChunk or just create a new chunk
                const isChainable = tipOfChain.prev_post_id === targetPost.previousPostId;

                if (isChainable) {
                    // Update this chunk's data in PostsInChannel table.  earliest comes from tipOfChain while latest comes from chunk
                    await this.database.action(async () => {
                        await targetChunk.update((postInChannel) => {
                            postInChannel.earliest = earliest;
                        });
                    });
                } else {
                    await createPostsInChannelRecord();
                }
            }
        } else {
            await createPostsInChannelRecord();
        }
    };
};

export default PostHandler;
