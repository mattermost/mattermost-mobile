// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {
    compareAppRecord,
    compareChannelMembershipRecord,
    compareCustomEmojiRecord,
    compareDraftRecord,
    compareGlobalRecord,
    compareGroupMembershipRecord,
    compareGroupRecord,
    comparePostRecord,
    comparePreferenceRecord,
    compareRoleRecord,
    compareServerRecord,
    compareSystemRecord,
    compareTeamMembershipRecord,
    compareTermsOfServiceRecord,
    compareUserRecord,
} from '@database/admin/data_operator/comparators';
import DatabaseManager from '@database/admin/database_manager';
import CustomEmoji from '@typings/database/custom_emoji';
import {
    BatchOperations,
    DatabaseInstance,
    DiscardDuplicates,
    HandleEntityRecords,
    HandleFiles,
    HandleIsolatedEntityData,
    HandlePostMetadata,
    HandlePosts,
    HandleReactions,
    MatchExistingRecord,
    PostImage,
    PrepareForDatabase,
    PrepareRecords,
    RawChannelMembership,
    RawCustomEmoji,
    RawDraft,
    RawEmbed,
    RawFile,
    RawGroup,
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
    operateGroupRecord,
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
    findMatchingRecords,
    hasSimilarUpdateAt,
    sanitizePosts,
    sanitizeReactions,
} from '../utils';

const {
    CHANNEL_MEMBERSHIP,
    CUSTOM_EMOJI,
    DRAFT,
    FILE,
    GROUP,
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
     * @param {HandleIsolatedEntityData} entityData
     * @param {IsolatedEntities} entityData.tableName
     * @param {Records} entityData.values
     * @returns {Promise<void>}
     */
    handleIsolatedEntity = async ({tableName, values}: HandleIsolatedEntityData) => {
        let recordOperator;
        let comparator;
        let oneOfField;

        switch (tableName) {
            case IsolatedEntities.APP: {
                comparator = compareAppRecord;
                oneOfField = 'version_number';
                recordOperator = operateAppRecord;
                break;
            }
            case IsolatedEntities.GLOBAL: {
                comparator = compareGlobalRecord;
                oneOfField = 'name';
                recordOperator = operateGlobalRecord;
                break;
            }
            case IsolatedEntities.SERVERS: {
                comparator = compareServerRecord;
                oneOfField = 'db_path';
                recordOperator = operateServersRecord;
                break;
            }
            case IsolatedEntities.ROLE: {
                comparator = compareRoleRecord;
                oneOfField = 'name';
                recordOperator = operateRoleRecord;
                break;
            }
            case IsolatedEntities.SYSTEM: {
                comparator = compareSystemRecord;
                oneOfField = 'name';
                recordOperator = operateSystemRecord;
                break;
            }
            case IsolatedEntities.TERMS_OF_SERVICE: {
                comparator = compareTermsOfServiceRecord;
                oneOfField = 'accepted_at';
                recordOperator = operateTermsOfServiceRecord;
                break;
            }
            default: {
                throw new DataOperatorException(
                    `handleIsolatedEntity was called with an invalid table name ${tableName}`,
                );
            }
        }

        if (recordOperator && oneOfField && comparator) {
            await this.handleEntityRecords({
                comparator,
                oneOfField,
                operator: recordOperator,
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
            comparator: compareDraftRecord,
            oneOfField: 'channel_id',
            operator: operateDraftRecord,
            rawValues: drafts,
            tableName: DRAFT,
        });
    };

    /**
     * handleReactions: Handler responsible for the Create/Update operations occurring on the Reaction entity from the 'Server' schema
     * @param {HandleReactions} handleReactions
     * @param {RawReaction[]} handleReactions.reactions
     * @param {boolean} handleReactions.prepareRowsOnly
     * @throws DataOperatorException
     * @returns {Promise<[] | (Reaction | CustomEmoji)[]>}
     */
    handleReactions = async ({reactions, prepareRowsOnly}: HandleReactions) => {
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
            const reactionsRecords = ((await this.prepareRecords({
                createRaws: createReactions,
                database,
                recordOperator: operateReactionRecord,
                tableName: REACTION,
            })) as unknown) as Reaction[];
            batchRecords = batchRecords.concat(reactionsRecords);
        }

        if (createEmojis.length) {
            // Prepares records for model CustomEmoji
            const emojiRecords = ((await this.prepareRecords({
                database,
                recordOperator: operateCustomEmojiRecord,
                tableName: CUSTOM_EMOJI,
                createRaws: createEmojis.map((emoji) => {
                    return {record: undefined, raw: emoji};
                }) as MatchExistingRecord[],
            })) as unknown) as CustomEmoji[];
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
     * @param {HandlePosts} handlePosts
     * @param {string[]} handlePosts.orders
     * @param {RawPost[]} handlePosts.values
     * @param {string | undefined} handlePosts.previousPostId
     * @returns {Promise<void>}
     */
    handlePosts = async ({orders, values, previousPostId}: HandlePosts) => {
        const tableName = POST;

        // We rely on the order array; if it is empty, we stop processing
        if (!orders.length) {
            throw new DataOperatorException(
                'An empty "order" array has been passed to the handlePosts method',
            );
        }

        // By sanitizing the values, we are separating 'posts' that needs updating ( i.e. un-ordered posts ) from those that need to be created in our database
        const {orderedPosts, unOrderedPosts} = sanitizePosts({
            posts: values,
            orders,
        });

        // Here we verify in our database that the orderedPosts truly need 'CREATION'
        const futureEntries = await this.getCreateUpdateRecords({
            rawValues: orderedPosts,
            tableName,
            comparator: comparePostRecord,
            oneOfField: 'id',
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
                rawPosts: orderedPosts,
            });

            const database = await this.getDatabase(tableName);

            // Prepares records for batch processing onto the 'Post' entity for the server schema
            const posts = ((await this.prepareRecords({
                database,
                tableName,
                createRaws: linkedRawPosts,
                recordOperator: operatePostRecord,
            })) as unknown) as Post[];

            if (posts.length) {
                // Appends the processed records into the final batch array
                batch = batch.concat(posts);
            }

            // Starts extracting information from each post to build up for related entities' data
            for (let i = 0; i < orderedPosts.length; i++) {
                const post = orderedPosts[i] as RawPost;

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
                await this.handleCustomEmojis(emojis);
            }

            if (postsInThread.length) {
                await this.handlePostsInThread(postsInThread);
            }

            if (orderedPosts.length) {
                await this.handlePostsInChannel(orderedPosts);
            }
        }

        if (unOrderedPosts.length) {
            // Truly update those posts that have a different update_at value
            await this.handleEntityRecords({
                comparator: comparePostRecord,
                oneOfField: 'id',
                operator: operatePostRecord,
                rawValues: unOrderedPosts,
                tableName: POST,
            });
        }
    };

    /**
     * handleFiles: Handler responsible for the Create/Update operations occurring on the File entity from the 'Server' schema
     * @param {HandleFiles} handleFiles
     * @param {RawFile[]} handleFiles.files
     * @param {boolean} handleFiles.prepareRowsOnly
     * @returns {Promise<File[] | any[]>}
     */
    private handleFiles = async ({files, prepareRowsOnly}: HandleFiles) => {
        if (!files.length) {
            return [];
        }

        const database = await this.getDatabase(FILE);

        const postFiles = ((await this.prepareRecords({
            database,
            recordOperator: operateFileRecord,
            tableName: FILE,
            createRaws: files.map((file) => {
                return {record: undefined, raw: file};
            }),
        })) as unknown) as File[];

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
     * @param {HandlePostMetadata} handlePostMetadata
     * @param {{embed: RawEmbed[], postId: string}[] | undefined} handlePostMetadata.embeds
     * @param {{images: Dictionary<PostImage>, postId: string}[] | undefined} handlePostMetadata.images
     * @param {boolean} handlePostMetadata.prepareRowsOnly
     * @returns {Promise<any[] | PostMetadata[]>}
     */
    private handlePostMetadata = async ({embeds, images, prepareRowsOnly}: HandlePostMetadata) => {
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

        const postMetas = ((await this.prepareRecords({
            database,
            recordOperator: operatePostMetadataRecord,
            tableName: POST_METADATA,
            createRaws: metadata.map((meta) => {
                return {record: undefined, raw: meta};
            }),
        })) as unknown) as PostMetadata[];

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
                maxCreateAt =
                    thread.createAt > maxCreateAt ? thread.createAt : maxCreateAt;
            }

            // Collects all 'raw' postInThreads objects that will be sent to the operatePostsInThread function
            rawPostsInThreads.push({...rootPost, latest: maxCreateAt});
        });

        if (rawPostsInThreads.length) {
            const postInThreadRecords = ((await this.prepareRecords({
                database,
                recordOperator: operatePostInThreadRecord,
                tableName: POSTS_IN_THREAD,
                createRaws: rawPostsInThreads.map((postInThread) => {
                    return {raw: postInThread, record: undefined};
                }),
            })) as unknown) as PostsInThread[];

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
        const chunks = (await database.collections.get(POSTS_IN_CHANNEL).query(Q.where('channel_id', channelId)).fetch()) as PostsInChannel[];

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
            const potentialPosts = (await database.collections.get(POST).query(Q.where('create_at', earliest)).fetch()) as Post[];

            if (potentialPosts?.length > 0) {
                const targetPost = potentialPosts[0];

                // now we decide if we need to operate on the targetChunk or just create a new chunk
                const isChainable =
                    tipOfChain.prev_post_id === targetPost.previousPostId;

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
            comparator: compareUserRecord,
            oneOfField: 'id',
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
            comparator: comparePreferenceRecord,
            oneOfField: 'user_id',
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
            comparator: compareTeamMembershipRecord,
            oneOfField: 'user_id',
            operator: operateTeamMembershipRecord,
            rawValues: teamMemberships,
            tableName: TEAM_MEMBERSHIP,
        });
    };

    /**
     * handleCustomEmojis: Handler responsible for the Create/Update operations occurring on the CUSTOM_EMOJI entity from the 'Server' schema
     * @param {RawCustomEmoji[]} customEmojis
     * @throws DataOperatorException
     * @returns {Promise<null|void>}
     */
    handleCustomEmojis = async (customEmojis: RawCustomEmoji[]) => {
        if (!customEmojis.length) {
            throw new DataOperatorException(
                'An empty "customEmojis" array has been passed to the handleCustomEmojis method',
            );
        }

        await this.handleEntityRecords({
            comparator: compareCustomEmojiRecord,
            oneOfField: 'name',
            operator: operateCustomEmojiRecord,
            rawValues: customEmojis,
            tableName: CUSTOM_EMOJI,
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
            comparator: compareGroupMembershipRecord,
            oneOfField: 'user_id',
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
            comparator: compareChannelMembershipRecord,
            oneOfField: 'user_id',
            operator: operateChannelMembershipRecord,
            rawValues: channelMemberships,
            tableName: CHANNEL_MEMBERSHIP,
        });
    };

    /**
     * handleGroup: Handler responsible for the Create/Update operations occurring on the GROUP entity from the 'Server' schema
     * @param {RawGroup[]} groups
     * @throws DataOperatorException
     * @returns {Promise<null|void>}
     */
    handleGroup = async (groups: RawGroup[]) => {
        if (!groups.length) {
            throw new DataOperatorException(
                'An empty "groups" array has been passed to the handleGroup method',
            );
        }

        await this.handleEntityRecords({
            comparator: compareGroupRecord,
            oneOfField: 'name',
            operator: operateGroupRecord,
            rawValues: groups,
            tableName: GROUP,
        });
    };

    /**
     * handleEntityRecords : Utility that processes some entities' data against values already present in the database so as to avoid duplicity.
     * @param {HandleEntityRecords} handleEntityRecords
     * @param {(existing: Model, newElement: RawValue) => boolean} handleEntityRecords.comparator
     * @param {string} handleEntityRecords.oneOfField
     * @param {(DataFactory) => Promise<Model | null>} handleEntityRecords.operator
     * @param {RawValue[]} handleEntityRecords.rawValues
     * @param {string} handleEntityRecords.tableName
     * @returns {Promise<null | void>}
     */
    private handleEntityRecords = async ({comparator, oneOfField, operator, rawValues, tableName}: HandleEntityRecords) => {
        if (!rawValues.length) {
            return null;
        }

        const {createRaws, updateRaws} = await this.getCreateUpdateRecords({
            rawValues,
            tableName,
            comparator,
            oneOfField,
        });

        const records = await this.executeInDatabase({
            recordOperator: operator,
            tableName,
            createRaws,
            updateRaws,
        });

        return records;
    };

    // TODO : Add jest to getCreateUpdateRecords
    /**
     * getCreateUpdateRecords: This method weeds out duplicates entries.  It may happen that we do multiple inserts for
     * the same value.  Hence, prior to that we query the database and pick only those values that are  'new' from the 'Raw' array.
     * @param {DiscardDuplicates} prepareRecords
     * @param {RawValue[]} prepareRecords.rawValues
     * @param {string} prepareRecords.tableName
     * @param {string} prepareRecords.oneOfField
     * @param {(existing: Model, newElement: RawValue) => boolean} prepareRecords.comparator
     */
    private getCreateUpdateRecords = async ({rawValues, tableName, comparator, oneOfField}: DiscardDuplicates) => {
        const getOneOfs = (raws: RawValue[]) => {
            return raws.reduce((oneOfs, current: RawValue) => {
                const key = oneOfField as keyof typeof current;
                const value: string = current[key] as string;
                if (value) {
                    oneOfs.add(value);
                }
                return oneOfs;
            }, new Set<string>());
        };

        const columnValues: string[] = Array.from(getOneOfs(rawValues));

        const database = await this.getDatabase(tableName);

        // NOTE: There is no 'id' field in the response, hence, we need to  weed out any duplicates before sending the values to the operator
        const existingRecords = (await findMatchingRecords({database, tableName, condition: Q.where(oneOfField, Q.oneOf(columnValues))})) as Model[];

        const createRaws: MatchExistingRecord[] = [];
        const updateRaws: MatchExistingRecord[] = [];
        const createRawsOnly: RawValue[] = [];
        const updateRawsOnly: RawValue[] = [];

        if (existingRecords.length > 0) {
            rawValues.map((newElement) => {
                const findIndex = existingRecords.findIndex((existing) => {
                    return comparator(existing, newElement);
                });

                if (findIndex > -1) {
                    const existingRecord = existingRecords[findIndex];

                    // We found a record in the database that matches this element; hence, we'll proceed for an UPDATE operation
                    const isUpdateAtSimilar = hasSimilarUpdateAt({
                        tableName,
                        existingRecord,
                        newValue: newElement,
                    });
                    if (!isUpdateAtSimilar) {
                        updateRawsOnly.push(newElement);
                        return updateRaws.push({record: existingRecord, raw: newElement});
                    }
                } else {
                    createRawsOnly.push(newElement);

                    // This RawValue is not present in the database; hence, we need to create it
                    return createRaws.push({record: undefined, raw: newElement});
                }
                return null;
            });
            return {
                createRaws,
                updateRaws,
                createRawsOnly,
                updateRawsOnly,
            };
        }

        return {
            createRaws: rawValues.map((raw) => {
                return {record: undefined, raw};
            }),
            updateRaws,
            createRawsOnly: rawValues,
            updateRawsOnly,
        };
    };

    /**
     * batchOperations: Accepts an instance of Database (either Default or Server) and an array of
     * prepareCreate/prepareUpdate 'models' and executes the actions on the database.
     * @param {BatchOperations} operation
     * @param {Database} operation.database
     * @param {Array} operation.models
     * @throws {DataOperatorException}
     * @returns {Promise<void>}
     */
    private batchOperations = async ({database, models}: BatchOperations) => {
        try {
            if (models.length > 0) {
                await database.action(async () => {
                    await database.batch(...models);
                });
            } else {
                throw new DataOperatorException(
                    'batchOperations does not process empty model array',
                );
            }
        } catch (e) {
            throw new DataOperatorException('batchOperations error ', e);
        }
    };

    /**
     * prepareRecords: Utility method that actually calls the operators for the handlers
     * @param {PrepareRecords} prepareRecord
     * @param {Database} prepareRecord.database
     * @param {string} prepareRecord.tableName
     * @param {RawValue[]} prepareRecord.createRaws
     * @param {RawValue[]} prepareRecord.updateRaws
     * @param {(DataFactory) => void;} prepareRecord.recordOperator
     * @throws {DataOperatorException}
     * @returns {Promise<unknown[] | any[]>}
     */
    private prepareRecords = async ({database, tableName, createRaws, updateRaws, recordOperator}: PrepareRecords) => {
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
     * @param {PrepareForDatabase} executeInDatabase
     * @param {string} executeInDatabase.tableName
     * @param {RecordValue[]} executeInDatabase.createRaws
     * @param {RecordValue[]} executeInDatabase.updateRaws
     * @param {(DataFactory) => void} executeInDatabase.recordOperator
     * @returns {Promise<void>}
     */
    private executeInDatabase = async ({createRaws, recordOperator, tableName, updateRaws}: PrepareForDatabase) => {
        const database = await this.getDatabase(tableName);

        const models = ((await this.prepareRecords({
            database,
            tableName,
            createRaws,
            updateRaws,
            recordOperator,
        })) as unknown) as Model[];

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
