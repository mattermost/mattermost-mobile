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
import {
    HandleDraftArgs,
    HandleFilesArgs,
    HandlePostMetadataArgs,
    HandlePostsArgs,
    PostImage,
    RawCustomEmoji,
    RawEmbed,
    RawFile,
    RawPost,
    RawPostMetadata,
    RawPostsInThread,
    RawReaction, RecordPair,
} from '@typings/database/database';
import Draft from '@typings/database/models/servers/draft';
import File from '@typings/database/models/servers/file';
import Post from '@typings/database/models/servers/post';
import PostMetadata from '@typings/database/models/servers/post_metadata';
import PostsInChannel from '@typings/database/models/servers/posts_in_channel';
import PostsInThread from '@typings/database/models/servers/posts_in_thread';
import Reaction from '@typings/database/models/servers/reaction';

const {
    DRAFT,
    FILE,
    POST,
    POSTS_IN_CHANNEL,
    POSTS_IN_THREAD,
    POST_METADATA,
} = MM_TABLES.SERVER;

export interface PostHandlerMix {
    handleDraft: ({drafts, prepareRecordsOnly}: HandleDraftArgs) => Draft[] | boolean;
    handleFiles: ({files, prepareRecordsOnly}: HandleFilesArgs) => Promise<File[] | any[]>;
    handlePostMetadata: ({embeds, images, prepareRecordsOnly}: HandlePostMetadataArgs) => Promise<any[] | PostMetadata[]>;
    handlePosts: ({orders, values, previousPostId}: HandlePostsArgs) => Promise<void>;
    handlePostsInChannel: (posts: RawPost[]) => Promise<void>;
    handlePostsInThread: (rootPosts: RawPostsInThread[]) => Promise<void>;
}

const PostHandler = (superclass: any) => class extends superclass {
    /**
     * handleDraft: Handler responsible for the Create/Update operations occurring the Draft table from the 'Server' schema
     * @param {HandleDraftArgs} draftsArgs
     * @param {RawDraft[]} draftsArgs.drafts
     * @param {boolean} draftsArgs.prepareRecordsOnly
     * @throws DataOperatorException
     * @returns {Draft[]}
     */
    handleDraft = async ({drafts, prepareRecordsOnly = true}: HandleDraftArgs) => {
        let records: Draft[] = [];

        if (!drafts.length) {
            throw new DataOperatorException(
                'An empty "drafts" array has been passed to the handleDraft method',
            );
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: drafts, key: 'channel_id'});

        records = await this.handleRecords({
            fieldName: 'channel_id',
            findMatchingRecordBy: isRecordDraftEqualToRaw,
            transformer: transformDraftRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues,
            tableName: DRAFT,
        });

        return records;
    };

    /**
     * handlePosts: Handler responsible for the Create/Update operations occurring on the Post table from the 'Server' schema
     * @param {HandlePostsArgs} handlePosts
     * @param {string[]} handlePosts.orders
     * @param {RawPost[]} handlePosts.values
     * @param {string | undefined} handlePosts.previousPostId
     * @returns {Promise<void>}
     */
    handlePosts = async ({orders, values, previousPostId}: HandlePostsArgs) => {
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
        }) as RawPost[];

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
            let files: RawFile[] = [];
            const postsInThread = [];
            let reactions: RawReaction[] = [];
            let emojis: RawCustomEmoji[] = [];
            const images: Array<{ images: Dictionary<PostImage>; postId: string }> = [];
            const embeds: Array<{ embed: RawEmbed[]; postId: string }> = [];

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
            })) as Post[];

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
                    const metadata = post.metadata;

                    // Extracts reaction from post's metadata
                    reactions = reactions.concat(metadata?.reactions ?? []);

                    // Extracts emojis from post's metadata
                    emojis = emojis.concat(metadata?.emojis ?? []);

                    // Extracts files from post's metadata
                    files = files.concat(metadata?.files ?? []);

                    // Extracts images and embeds from post's metadata
                    if (metadata?.images) {
                        images.push({images: metadata.images, postId: post.id});
                    }

                    if (metadata?.embeds) {
                        embeds.push({embed: metadata.embeds, postId: post.id});
                    }
                }
            }

            if (reactions.length) {
                // calls handler for Reactions
                const postReactions = (await this.handleReactions({reactions, prepareRecordsOnly: true})) as Reaction[];
                batch = batch.concat(postReactions);
            }

            if (files.length) {
                // calls handler for Files
                const postFiles = await this.handleFiles({files, prepareRecordsOnly: true});
                batch = batch.concat(postFiles);
            }

            if (images.length || embeds.length) {
                // calls handler for postMetadata ( embeds and images )
                const postMetadata = await this.handlePostMetadata({
                    images,
                    embeds,
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
     * @returns {Promise<File[] | any[]>}
     */
    handleFiles = async ({files, prepareRecordsOnly}: HandleFilesArgs) => {
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

        return [];
    };

    /**
     * handlePostMetadata: Handler responsible for the Create/Update operations occurring on the PostMetadata table from the 'Server' schema
     * @param {HandlePostMetadataArgs} handlePostMetadata
     * @param {{embed: RawEmbed[], postId: string}[] | undefined} handlePostMetadata.embeds
     * @param {{images: Dictionary<PostImage>, postId: string}[] | undefined} handlePostMetadata.images
     * @param {boolean} handlePostMetadata.prepareRecordsOnly
     * @returns {Promise<any[] | PostMetadata[]>}
     */
    handlePostMetadata = async ({embeds, images, prepareRecordsOnly}: HandlePostMetadataArgs) => {
        const metadata: RawPostMetadata[] = [];

        if (images?.length) {
            images.forEach((image) => {
                const imageEntry = Object.entries(image.images);
                metadata.push({
                    data: {...imageEntry?.[0]?.[1], url: imageEntry?.[0]?.[0]},
                    type: 'images',
                    postId: image.postId,
                });
            });
        }

        if (embeds?.length) {
            embeds.forEach((postEmbed) => {
                postEmbed.embed.forEach((embed: RawEmbed) => {
                    metadata.push({
                        data: {...embed.data},
                        type: embed.type,
                        postId: postEmbed.postId,
                    });
                });
            });
        }

        if (!metadata.length) {
            return [];
        }

        const postMetas = await this.prepareRecords({
            createRaws: getRawRecordPairs(metadata),
            transformer: transformPostMetadataRecord,
            tableName: POST_METADATA,
        });

        if (prepareRecordsOnly) {
            return postMetas;
        }

        if (postMetas?.length) {
            await this.batchRecords(postMetas);
        }

        return [];
    };

    /**
     * handlePostsInThread: Handler responsible for the Create/Update operations occurring on the PostsInThread table from the 'Server' schema
     * @param {RawPostsInThread[]} rootPosts
     * @returns {Promise<void>}
     */
    handlePostsInThread = async (rootPosts: RawPostsInThread[]) => {
        if (!rootPosts.length) {
            return;
        }

        const postIds = rootPosts.map((postThread) => postThread.post_id);
        const rawPostsInThreads: RawPostsInThread[] = [];

        // Retrieves all threads whereby their root_id can be one of the element in the postIds array
        const threads = (await this.database.collections.
            get(POST).
            query(Q.where('root_id', Q.oneOf(postIds))).
            fetch()) as Post[];

        // The aim here is to find the last reply in that thread; hence the latest create_at value
        rootPosts.forEach((rootPost) => {
            const maxCreateAt: number = threads.reduce((max: number, thread: Post) => {
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
            })) as PostsInThread[];

            if (postInThreadRecords?.length) {
                await this.batchRecords(postInThreadRecords);
            }
        }
    };

    /**
     * handlePostsInChannel: Handler responsible for the Create/Update operations occurring on the PostsInChannel table from the 'Server' schema
     * @param {RawPost[]} posts
     * @returns {Promise<void>}
     */
    handlePostsInChannel = async (posts: RawPost[]) => {
        // At this point, the parameter 'posts' is already a chain of posts.  Now, we have to figure out how to plug it
        // into existing chains in the PostsInChannel table

        if (!posts.length) {
            return [];
        }

        // Sort a clone of 'posts' array by create_at
        const sortedPosts = [...posts].sort((a, b) => {
            return a.create_at - b.create_at;
        });

        // The first element (beginning of chain)
        const tipOfChain: RawPost = sortedPosts[0];

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
        })) as PostsInChannel[];

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
            return [];
        }

        // Sort chunks (in-place) by earliest field  ( oldest to newest )
        chunks.sort((a, b) => {
            return a.earliest - b.earliest;
        });

        let found = false;
        let targetChunk: PostsInChannel;

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
            })) as Post[];

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
                    return [];
                }
            }
        } else {
            await createPostsInChannelRecord();
            return [];
        }

        return [];
    };
};

export default PostHandler;
