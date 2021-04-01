// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {
    isRecordAppEqualToRaw,
    isRecordChannelMembershipEqualToRaw,
    isRecordCustomEmojiEqualToRaw,
    isRecordDraftEqualToRaw,
    isRecordGlobalEqualToRaw,
    isRecordGroupMembershipEqualToRaw,
    isRecordPostEqualToRaw,
    isRecordPreferenceEqualToRaw,
    isRecordRoleEqualToRaw,
    isRecordServerEqualToRaw,
    isRecordSystemEqualToRaw,
    isRecordTeamMembershipEqualToRaw,
    isRecordTermsOfServiceEqualToRaw,
    isRecordUserEqualToRaw,
} from '@database/admin/data_operator/comparators';
import DatabaseManager from '@database/admin/database_manager';
import CustomEmoji from '@typings/database/custom_emoji';
import {
    BatchOperationsArgs,
    DatabaseInstance,
    ProcessInputsArgs,
    HandleEntityRecordsArgs,
    HandleFilesArgs,
    HandleIsolatedEntityArgs,
    HandlePostMetadataArgs,
    HandlePostsArgs,
    HandleReactionsArgs,
    MatchExistingRecord,
    PostImage,
    PrepareForDatabaseArgs,
    PrepareRecordsArgs,
    RawChannelMembership,
    RawCustomEmoji,
    RawDraft,
    RawEmbed,
    RawFile,
    RawGroupMembership,
    RawPost,
    RawPostMetadata,
    RawPostsInThread,
    RawPreference,
    RawReaction,
    RawTeamMembership,
    RawUser,
    RawValue,
} from '@typings/database/database';
import {IsolatedEntities, OperationType} from '@typings/database/enums';
import File from '@typings/database/file';
import Post from '@typings/database/post';
import PostMetadata from '@typings/database/post_metadata';
import PostsInChannel from '@typings/database/posts_in_channel';
import PostsInThread from '@typings/database/posts_in_thread';
import Reaction from '@typings/database/reaction';

import DataOperatorException from '../../exceptions/data_operator_exception';
import DatabaseConnectionException from '../../exceptions/database_connection_exception';
import {
    operateAppRecord,
    operateChannelMembershipRecord,
    operateCustomEmojiRecord,
    operateDraftRecord,
    operateFileRecord,
    operateGlobalRecord,
    operateGroupMembershipRecord,
    operatePostInThreadRecord,
    operatePostMetadataRecord,
    operatePostRecord,
    operatePostsInChannelRecord,
    operatePreferenceRecord,
    operateReactionRecord,
    operateRoleRecord,
    operateServersRecord,
    operateSystemRecord,
    operateTeamMembershipRecord,
    operateTermsOfServiceRecord,
    operateUserRecord,
} from '../operators';
import {
    createPostsChain,
    getRangeOfValues,
    getRawRecordPairs,
    hasSimilarUpdateAt,
    retrieveRecords,
    sanitizePosts,
    sanitizeReactions,
} from '../utils';

const {
    CHANNEL_MEMBERSHIP,
    CUSTOM_EMOJI,
    DRAFT,
    FILE,
    GROUP_MEMBERSHIP,
    POST,
    POSTS_IN_CHANNEL,
    POSTS_IN_THREAD,
    POST_METADATA,
    PREFERENCE,
    REACTION,
    TEAM_MEMBERSHIP,
    USER,
} = MM_TABLES.SERVER;

class DataOperator {
    /**
     * serverDatabase : In a multi-server configuration, this connection will be used by WebSockets and other parties to update databases other than the active one.
     * @type {DatabaseInstance}
     */
    serverDatabase: DatabaseInstance;

    constructor(serverDatabase?: Database) {
        this.serverDatabase = serverDatabase;
    }

    /**
     * handleIsolatedEntity: Handler responsible for the Create/Update operations on the isolated entities as described
     * by the IsolatedEntities enum
     * @param {HandleIsolatedEntityArgs} entityData
     * @param {IsolatedEntities} entityData.tableName
     * @param {Records} entityData.values
     * @returns {Promise<void>}
     */
    handleIsolatedEntity = async ({tableName, values}: HandleIsolatedEntityArgs) => {
        let comparator;
        let fieldName;
        let operator;

        if (!values.length) {
            throw new DataOperatorException(
                `An empty "values" array has been passed to the handleIsolatedEntity method for entity ${tableName}`,
            );
        }

        switch (tableName) {
            case IsolatedEntities.APP: {
                comparator = isRecordAppEqualToRaw;
                fieldName = 'version_number';
                operator = operateAppRecord;
                break;
            }
            case IsolatedEntities.CUSTOM_EMOJI: {
                comparator = isRecordCustomEmojiEqualToRaw;
                fieldName = 'name';
                operator = operateCustomEmojiRecord;
                break;
            }
            case IsolatedEntities.GLOBAL: {
                comparator = isRecordGlobalEqualToRaw;
                fieldName = 'name';
                operator = operateGlobalRecord;
                break;
            }
            case IsolatedEntities.ROLE: {
                comparator = isRecordRoleEqualToRaw;
                fieldName = 'name';
                operator = operateRoleRecord;
                break;
            }
            case IsolatedEntities.SERVERS: {
                comparator = isRecordServerEqualToRaw;
                fieldName = 'db_path';
                operator = operateServersRecord;
                break;
            }
            case IsolatedEntities.SYSTEM: {
                comparator = isRecordSystemEqualToRaw;
                fieldName = 'name';
                operator = operateSystemRecord;
                break;
            }
            case IsolatedEntities.TERMS_OF_SERVICE: {
                comparator = isRecordTermsOfServiceEqualToRaw;
                fieldName = 'accepted_at';
                operator = operateTermsOfServiceRecord;
                break;
            }
            default: {
                throw new DataOperatorException(
                    `handleIsolatedEntity was called with an invalid table name ${tableName}`,
                );
            }
        }

        if (operator && fieldName && comparator) {
            await this.handleEntityRecords({
                comparator,
                fieldName,
                operator,
                rawValues: values,
                tableName,
            });
        }
    };

    /**
     * handleDraft: Handler responsible for the Create/Update operations occurring the Draft entity from the 'Server' schema
     * @param {RawDraft[]} drafts
     * @returns {Promise<void>}
     */
    handleDraft = async (drafts: RawDraft[]) => {
        if (!drafts.length) {
            throw new DataOperatorException(
                'An empty "drafts" array has been passed to the handleReactions method',
            );
        }

        await this.handleEntityRecords({
            comparator: isRecordDraftEqualToRaw,
            fieldName: 'channel_id',
            operator: operateDraftRecord,
            rawValues: drafts,
            tableName: DRAFT,
        });
    };

    /**
     * handleReactions: Handler responsible for the Create/Update operations occurring on the Reaction entity from the 'Server' schema
     * @param {HandleReactionsArgs} handleReactions
     * @param {RawReaction[]} handleReactions.reactions
     * @param {boolean} handleReactions.prepareRowsOnly
     * @throws DataOperatorException
     * @returns {Promise<[] | (Reaction | CustomEmoji)[]>}
     */
    handleReactions = async ({reactions, prepareRowsOnly}: HandleReactionsArgs) => {
        if (!reactions.length) {
            throw new DataOperatorException(
                'An empty "reactions" array has been passed to the handleReactions method',
            );
        }

        const database = await this.getDatabase(REACTION);

        const {
            createEmojis,
            createReactions,
            deleteReactions,
        } = await sanitizeReactions({
            database,
            post_id: reactions[0].post_id,
            rawReactions: reactions,
        });

        let batchRecords: Model[] = [];

        if (createReactions.length) {
            // Prepares record for model Reactions
            const reactionsRecords = (await this.prepareRecords({
                createRaws: createReactions,
                database,
                recordOperator: operateReactionRecord,
                tableName: REACTION,
            })) as Reaction[];
            batchRecords = batchRecords.concat(reactionsRecords);
        }

        if (createEmojis.length) {
            // Prepares records for model CustomEmoji
            const emojiRecords = (await this.prepareRecords({
                createRaws: getRawRecordPairs(createEmojis),
                database,
                recordOperator: operateCustomEmojiRecord,
                tableName: CUSTOM_EMOJI,
            })) as CustomEmoji[];
            batchRecords = batchRecords.concat(emojiRecords);
        }

        batchRecords = batchRecords.concat(deleteReactions);

        if (prepareRowsOnly) {
            return batchRecords;
        }

        if (batchRecords?.length) {
            await this.batchOperations({
                database,
                models: batchRecords,
            });
        }

        return [];
    };

    /**
     * handlePosts: Handler responsible for the Create/Update operations occurring on the Post entity from the 'Server' schema
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

        // By sanitizing the values, we are separating 'posts' that needs updating ( i.e. un-ordered posts ) from those that need to be created in our database
        const {postsOrdered, postsUnordered} = sanitizePosts({
            posts: values,
            orders,
        });

        // Here we verify in our database that the postsOrdered truly need 'CREATION'
        const futureEntries = await this.processInputs({
            rawValues: postsOrdered,
            tableName,
            comparator: isRecordPostEqualToRaw,
            fieldName: 'id',
        });

        if (futureEntries.createRaws?.length) {
            let batch: Model[] = [];
            let files: RawFile[] = [];
            const postsInThread = [];
            let reactions: RawReaction[] = [];
            let emojis: RawCustomEmoji[] = [];
            const images: { images: Dictionary<PostImage>; postId: string }[] = [];
            const embeds: { embed: RawEmbed[]; postId: string }[] = [];

            // We create the 'chain of posts' by linking each posts' previousId to the post before it in the order array
            const linkedRawPosts: MatchExistingRecord[] = createPostsChain({
                orders,
                previousPostId: previousPostId || '',
                rawPosts: postsOrdered,
            });

            const database = await this.getDatabase(tableName);

            // Prepares records for batch processing onto the 'Post' entity for the server schema
            const posts = (await this.prepareRecords({
                createRaws: linkedRawPosts,
                database,
                recordOperator: operatePostRecord,
                tableName,
            }))as Post[];

            // Appends the processed records into the final batch array
            batch = batch.concat(posts);

            // Starts extracting information from each post to build up for related entities' data
            for (let i = 0; i < postsOrdered.length; i++) {
                const post = postsOrdered[i] as RawPost;

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
                const postReactions = (await this.handleReactions({
                    reactions,
                    prepareRowsOnly: true,
                })) as Reaction[];

                batch = batch.concat(postReactions);
            }

            if (files.length) {
                // calls handler for Files
                const postFiles = (await this.handleFiles({
                    files,
                    prepareRowsOnly: true,
                })) as File[];

                batch = batch.concat(postFiles);
            }

            if (images.length || embeds.length) {
                // calls handler for postMetadata ( embeds and images )
                const postMetadata = (await this.handlePostMetadata({
                    images,
                    embeds,
                    prepareRowsOnly: true,
                })) as PostMetadata[];

                batch = batch.concat(postMetadata);
            }

            if (batch.length) {
                await this.batchOperations({database, models: batch});
            }

            // LAST: calls handler for CustomEmojis, PostsInThread, PostsInChannel
            if (emojis.length) {
                await this.handleIsolatedEntity({tableName: IsolatedEntities.CUSTOM_EMOJI, values: emojis});
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
            await this.handleEntityRecords({
                comparator: isRecordPostEqualToRaw,
                fieldName: 'id',
                operator: operatePostRecord,
                rawValues: postsUnordered,
                tableName: POST,
            });
        }
    };

    /**
     * handleFiles: Handler responsible for the Create/Update operations occurring on the File entity from the 'Server' schema
     * @param {HandleFilesArgs} handleFiles
     * @param {RawFile[]} handleFiles.files
     * @param {boolean} handleFiles.prepareRowsOnly
     * @returns {Promise<File[] | any[]>}
     */
    private handleFiles = async ({files, prepareRowsOnly}: HandleFilesArgs) => {
        if (!files.length) {
            return [];
        }

        const database = await this.getDatabase(FILE);

        const postFiles = (await this.prepareRecords({
            createRaws: getRawRecordPairs(files),
            database,
            recordOperator: operateFileRecord,
            tableName: FILE,
        })) as File[];

        if (prepareRowsOnly) {
            return postFiles;
        }

        if (postFiles?.length) {
            await this.batchOperations({database, models: [...postFiles]});
        }

        return [];
    };

    /**
     * handlePostMetadata: Handler responsible for the Create/Update operations occurring on the PostMetadata entity from the 'Server' schema
     * @param {HandlePostMetadataArgs} handlePostMetadata
     * @param {{embed: RawEmbed[], postId: string}[] | undefined} handlePostMetadata.embeds
     * @param {{images: Dictionary<PostImage>, postId: string}[] | undefined} handlePostMetadata.images
     * @param {boolean} handlePostMetadata.prepareRowsOnly
     * @returns {Promise<any[] | PostMetadata[]>}
     */
    private handlePostMetadata = async ({embeds, images, prepareRowsOnly}: HandlePostMetadataArgs) => {
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

        const database = await this.getDatabase(POST_METADATA);

        const postMetas = (await this.prepareRecords({
            createRaws: getRawRecordPairs(metadata),
            database,
            recordOperator: operatePostMetadataRecord,
            tableName: POST_METADATA,
        })) as PostMetadata[];

        if (prepareRowsOnly) {
            return postMetas;
        }

        if (postMetas?.length) {
            await this.batchOperations({database, models: [...postMetas]});
        }

        return [];
    };

    /**
     * handlePostsInThread: Handler responsible for the Create/Update operations occurring on the PostsInThread entity from the 'Server' schema
     * @param {RawPostsInThread[]} rootPosts
     * @returns {Promise<any[]>}
     */
    private handlePostsInThread = async (rootPosts: RawPostsInThread[]) => {
        if (!rootPosts.length) {
            return;
        }

        const postIds = rootPosts.map((postThread) => postThread.post_id);
        const rawPostsInThreads: RawPostsInThread[] = [];

        const database = await this.getDatabase(POSTS_IN_THREAD);

        // Retrieves all threads whereby their root_id can be one of the element in the postIds array
        const threads = (await database.collections.
            get(POST).
            query(Q.where('root_id', Q.oneOf(postIds))).
            fetch()) as Post[];

        // The aim here is to find the last reply in that thread; hence the latest create_at value
        rootPosts.forEach((rootPost) => {
            const childPosts = [];
            let maxCreateAt = 0;
            for (let i = 0; i < threads.length; i++) {
                const thread = threads[i];
                if (thread?.rootId === rootPost.post_id) {
                    // Creates a sub-array of threads relating to rootPost.post_id
                    childPosts.push(thread);
                }

                // Retrieves max createAt date of all posts whose root_id is rootPost.post_id
                maxCreateAt = thread.createAt > maxCreateAt ? thread.createAt : maxCreateAt;
            }

            // Collects all 'raw' postInThreads objects that will be sent to the operatePostsInThread function
            rawPostsInThreads.push({...rootPost, latest: maxCreateAt});
        });

        if (rawPostsInThreads.length) {
            const postInThreadRecords = (await this.prepareRecords({
                createRaws: getRawRecordPairs(rawPostsInThreads),
                database,
                recordOperator: operatePostInThreadRecord,
                tableName: POSTS_IN_THREAD,
            })) as PostsInThread[];

            if (postInThreadRecords?.length) {
                await this.batchOperations({database, models: postInThreadRecords});
            }
        }
    };

    /**
     * handlePostsInChannel: Handler responsible for the Create/Update operations occurring on the PostsInChannel entity from the 'Server' schema
     * @param {RawPost[]} posts
     * @returns {Promise<void>}
     */
    private handlePostsInChannel = async (posts: RawPost[]) => {
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

        const database = await this.getDatabase(POSTS_IN_CHANNEL);

        // Find the records in the PostsInChannel table that have a matching channel_id
        // const chunks = (await database.collections.get(POSTS_IN_CHANNEL).query(Q.where('channel_id', channelId)).fetch()) as PostsInChannel[];
        const chunks = (await retrieveRecords({
            database,
            tableName: POSTS_IN_CHANNEL,
            condition: Q.where('channel_id', channelId),
        })) as PostsInChannel[];

        const createPostsInChannelRecord = async () => {
            const createPostsInChannel = {channel_id: channelId, earliest, latest};
            await this.executeInDatabase({
                createRaws: [{record: undefined, raw: createPostsInChannel}],
                tableName: POSTS_IN_CHANNEL,
                recordOperator: operatePostsInChannelRecord,
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
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            // find if we should plug the chain before
            const chunk = chunks[chunkIndex];
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
            const potentialPosts = await retrieveRecords({database, tableName: POST, condition: Q.where('create_at', earliest)}) as Post[];

            if (potentialPosts?.length > 0) {
                const targetPost = potentialPosts[0];

                // now we decide if we need to operate on the targetChunk or just create a new chunk
                const isChainable = tipOfChain.prev_post_id === targetPost.previousPostId;

                if (isChainable) {
                    // Update this chunk's data in PostsInChannel table.  earliest comes from tipOfChain while latest comes from chunk
                    await database.action(async () => {
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

    /**
     * handleUsers: Handler responsible for the Create/Update operations occurring on the User entity from the 'Server' schema
     * @param {RawUser[]} users
     * @throws DataOperatorException
     * @returns {Promise<void>}
     */
    handleUsers = async (users: RawUser[]) => {
        if (!users.length) {
            throw new DataOperatorException(
                'An empty "users" array has been passed to the handleUsers method',
            );
        }
        await this.handleEntityRecords({
            comparator: isRecordUserEqualToRaw,
            fieldName: 'id',
            operator: operateUserRecord,
            rawValues: users,
            tableName: USER,
        });
    };

    /**
     * handlePreferences: Handler responsible for the Create/Update operations occurring on the PREFERENCE entity from the 'Server' schema
     * @param {RawPreference[]} preferences
     * @throws DataOperatorException
     * @returns {Promise<null|void>}
     */
    handlePreferences = async (preferences: RawPreference[]) => {
        if (!preferences.length) {
            throw new DataOperatorException(
                'An empty "preferences" array has been passed to the handlePreferences method',
            );
        }

        await this.handleEntityRecords({
            comparator: isRecordPreferenceEqualToRaw,
            fieldName: 'user_id',
            operator: operatePreferenceRecord,
            rawValues: preferences,
            tableName: PREFERENCE,
        });
    };

    /**
     * handleTeamMemberships: Handler responsible for the Create/Update operations occurring on the TEAM_MEMBERSHIP entity from the 'Server' schema
     * @param {RawTeamMembership[]} teamMemberships
     * @throws DataOperatorException
     * @returns {Promise<null|void>}
     */
    handleTeamMemberships = async (teamMemberships: RawTeamMembership[]) => {
        if (!teamMemberships.length) {
            throw new DataOperatorException(
                'An empty "teamMemberships" array has been passed to the handleTeamMemberships method',
            );
        }
        await this.handleEntityRecords({
            comparator: isRecordTeamMembershipEqualToRaw,
            fieldName: 'user_id',
            operator: operateTeamMembershipRecord,
            rawValues: teamMemberships,
            tableName: TEAM_MEMBERSHIP,
        });
    };

    /**
     * handleGroupMembership: Handler responsible for the Create/Update operations occurring on the GROUP_MEMBERSHIP entity from the 'Server' schema
     * @param {RawGroupMembership[]} groupMemberships
     * @throws DataOperatorException
     * @returns {Promise<void>}
     */
    handleGroupMembership = async (groupMemberships: RawGroupMembership[]) => {
        if (!groupMemberships.length) {
            throw new DataOperatorException(
                'An empty "groupMemberships" array has been passed to the handleGroupMembership method',
            );
        }

        await this.handleEntityRecords({
            comparator: isRecordGroupMembershipEqualToRaw,
            fieldName: 'user_id',
            operator: operateGroupMembershipRecord,
            rawValues: groupMemberships,
            tableName: GROUP_MEMBERSHIP,
        });
    };

    /**
     * handleChannelMembership: Handler responsible for the Create/Update operations occurring on the CHANNEL_MEMBERSHIP entity from the 'Server' schema
     * @param {RawChannelMembership[]} channelMemberships
     * @throws DataOperatorException
     * @returns {Promise<null|void>}
     */
    handleChannelMembership = async (channelMemberships: RawChannelMembership[]) => {
        if (!channelMemberships.length) {
            throw new DataOperatorException(
                'An empty "channelMemberships" array has been passed to the handleChannelMembership method',
            );
        }

        await this.handleEntityRecords({
            comparator: isRecordChannelMembershipEqualToRaw,
            fieldName: 'user_id',
            operator: operateChannelMembershipRecord,
            rawValues: channelMemberships,
            tableName: CHANNEL_MEMBERSHIP,
        });
    };

    /**
     * handleEntityRecords : Utility that processes some entities' data against values already present in the database so as to avoid duplicity.
     * @param {HandleEntityRecordsArgs} handleEntityRecords
     * @param {(existing: Model, newElement: RawValue) => boolean} handleEntityRecords.comparator
     * @param {string} handleEntityRecords.fieldName
     * @param {(DataFactoryArgs) => Promise<Model | null>} handleEntityRecords.operator
     * @param {RawValue[]} handleEntityRecords.rawValues
     * @param {string} handleEntityRecords.tableName
     * @returns {Promise<null | void>}
     */
    private handleEntityRecords = async ({comparator, fieldName, operator, rawValues, tableName}: HandleEntityRecordsArgs) => {
        if (!rawValues.length) {
            return null;
        }

        const {createRaws, updateRaws} = await this.processInputs({
            rawValues,
            tableName,
            comparator,
            fieldName,
        });

        const records = await this.executeInDatabase({
            recordOperator: operator,
            tableName,
            createRaws,
            updateRaws,
        });

        return records;
    };

    // TODO : Add jest to processInputs
    /**
     * processInputs: This method weeds out duplicates entries.  It may happen that we do multiple inserts for
     * the same value.  Hence, prior to that we query the database and pick only those values that are  'new' from the 'Raw' array.
     * @param {ProcessInputsArgs} prepareRecords
     * @param {RawValue[]} prepareRecords.rawValues
     * @param {string} prepareRecords.tableName
     * @param {string} prepareRecords.fieldName
     * @param {(existing: Model, newElement: RawValue) => boolean} prepareRecords.comparator
     */
    private processInputs = async ({rawValues, tableName, comparator, fieldName}: ProcessInputsArgs) => {
        // We will query an entity where one of its fields can match a range of values.  Hence, here we are extracting all those potential values.
        const columnValues: string[] = getRangeOfValues({fieldName, raws: rawValues});

        const database = await this.getDatabase(tableName);

        const existingRecords = (await retrieveRecords({
            database,
            tableName,
            condition: Q.where(fieldName, Q.oneOf(columnValues)),
        })) as Model[];

        const createRaws: MatchExistingRecord[] = [];
        const updateRaws: MatchExistingRecord[] = [];

        if (existingRecords.length > 0) {
            rawValues.map((newElement: RawValue) => {
                const findIndex = existingRecords.findIndex((existing) => {
                    return comparator(existing, newElement);
                });

                // We found a record in the database that matches this element; hence, we'll proceed for an UPDATE operation
                if (findIndex > -1) {
                    const existingRecord = existingRecords[findIndex];

                    // Some raw value has an update_at field.  We'll proceed to update only if the update_at value is different from the record's value in database
                    const isUpdateAtSimilar = hasSimilarUpdateAt({
                        tableName,
                        existingRecord,
                        newValue: newElement,
                    });

                    if (!isUpdateAtSimilar) {
                        return updateRaws.push({
                            record: existingRecord,
                            raw: newElement,
                        });
                    }
                } else {
                    // This RawValue is not present in the database; hence, we need to create it
                    return createRaws.push({record: undefined, raw: newElement});
                }
                return null;
            });

            return {
                createRaws,
                updateRaws,
            };
        }

        return {
            createRaws: getRawRecordPairs(rawValues),
            updateRaws,
        };
    };

    /**
     * batchOperations: Accepts an instance of Database (either Default or Server) and an array of
     * prepareCreate/prepareUpdate 'models' and executes the actions on the database.
     * @param {BatchOperationsArgs} operation
     * @param {Database} operation.database
     * @param {Array} operation.models
     * @throws {DataOperatorException}
     * @returns {Promise<void>}
     */
    private batchOperations = async ({database, models}: BatchOperationsArgs) => {
        try {
            if (models.length > 0) {
                await database.action(async () => {
                    await database.batch(...models);
                });
            }
        } catch (e) {
            throw new DataOperatorException('batchOperations error ', e);
        }
    };

    /**
     * prepareRecords: Utility method that actually calls the operators for the handlers
     * @param {PrepareRecordsArgs} prepareRecord
     * @param {Database} prepareRecord.database
     * @param {string} prepareRecord.tableName
     * @param {RawValue[]} prepareRecord.createRaws
     * @param {RawValue[]} prepareRecord.updateRaws
     * @param {(DataFactoryArgs) => void;} prepareRecord.recordOperator
     * @throws {DataOperatorException}
     * @returns {Promise<Model[]>}
     */
    private prepareRecords = async ({database, tableName, createRaws, updateRaws, recordOperator}: PrepareRecordsArgs) => {
        if (!database) {
            throw new DataOperatorException(
                'prepareRecords accepts only rawPosts of type RawValue[] or valid database connection',
            );
        }

        let prepareCreate: Model[] = [];
        let prepareUpdate: Model[] = [];

        // create operation
        if (createRaws?.length) {
            const recordPromises = await createRaws.map(
                async (createRecord: MatchExistingRecord) => {
                    const record = await recordOperator({database, tableName, value: createRecord, action: OperationType.CREATE});
                    return record;
                },
            );

            const results = ((await Promise.all(recordPromises)) as unknown) as Model[];
            prepareCreate = prepareCreate.concat(results);
        }

        // update operation
        if (updateRaws?.length) {
            const recordPromises = await updateRaws.map(
                async (updateRecord: MatchExistingRecord) => {
                    const record = await recordOperator({database, tableName, value: updateRecord, action: OperationType.UPDATE});
                    return record;
                },
            );

            const results = ((await Promise.all(recordPromises)) as unknown) as Model[];
            prepareUpdate = prepareUpdate.concat(results);
        }

        return [...prepareCreate, ...prepareUpdate];
    };

    /**
     * executeInDatabase: Handles the Create/Update operations on an entity.
     * @param {PrepareForDatabaseArgs} executeInDatabase
     * @param {string} executeInDatabase.tableName
     * @param {RecordValue[]} executeInDatabase.createRaws
     * @param {RecordValue[]} executeInDatabase.updateRaws
     * @param {(DataFactoryArgs) => void} executeInDatabase.recordOperator
     * @returns {Promise<void>}
     */
    private executeInDatabase = async ({createRaws, recordOperator, tableName, updateRaws}: PrepareForDatabaseArgs) => {
        const database = await this.getDatabase(tableName);

        const models = (await this.prepareRecords({
            database,
            tableName,
            createRaws,
            updateRaws,
            recordOperator,
        })) as Model[];

        if (models?.length > 0) {
            await this.batchOperations({database, models});
        }
    };

    /**
     * getDatabase: Based on the table's name, it will return a database instance either from the 'DEFAULT' database or
     * the 'SERVER' database
     * @param {string} tableName
     * @returns {Promise<void>}
     */
    private getDatabase = async (tableName: string) => {
        const isDefaultConnection = Object.values(MM_TABLES.DEFAULT).some(
            (tbName) => {
                return tableName === tbName;
            },
        );

        const promise = isDefaultConnection ? this.getDefaultDatabase : this.getServerDatabase;
        const connection = await promise();

        return connection;
    };

    /**
     * getDefaultDatabase: Returns the default database
     * @throws {DatabaseConnectionException}
     * @returns {Promise<Database>}
     */
    private getDefaultDatabase = async () => {
        const connection = await DatabaseManager.getDefaultDatabase();
        if (connection === undefined) {
            throw new DatabaseConnectionException(
                'An error occurred while retrieving the default database',
                '',
            );
        }
        return connection;
    };

    /**
     * getServerDatabase: Returns the current active server database (multi-server support)
     * @throws {DatabaseConnectionException}
     * @returns {Promise<Database>}
     */
    private getServerDatabase = async () => {
        // Third parties trying to update the database
        if (this.serverDatabase) {
            return this.serverDatabase;
        }

        // NOTE: here we are getting the active server directly as in a multi-server support system, the current
        // active server connection will already be set on application init
        const connection = await DatabaseManager.getActiveServerDatabase();
        if (connection === undefined) {
            throw new DatabaseConnectionException(
                'An error occurred while retrieving the server database',
                '',
            );
        }
        return connection;
    };
}

export default DataOperator;
