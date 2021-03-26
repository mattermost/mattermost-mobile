// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/admin/database_manager';
import logger from '@nozbe/watermelondb/utils/common/logger';
import {
    BatchOperations, DatabaseInstance,
    ExecuteRecords,
    HandleFiles,
    HandleIsolatedEntityData,
    HandlePostMetadata,
    HandlePosts,
    HandleReactions,
    PostImage,
    PrepareRecords,
    RawCustomEmoji,
    RawDraft,
    RawEmbed,
    RawFile,
    RawPost,
    RawPostMetadata,
    RawPostsInThread,
    RawReaction,
} from '@typings/database/database';
import File from '@typings/database/file';
import CustomEmoji from '@typings/database/custom_emoji';
import {IsolatedEntities} from '@typings/database/enums';
import Post from '@typings/database/post';
import PostMetadata from '@typings/database/post_metadata';
import PostsInChannel from '@typings/database/posts_in_channel';
import PostsInThread from '@typings/database/posts_in_thread';
import Reaction from '@typings/database/reaction';

import DatabaseConnectionException from '../../exceptions/database_connection_exception';
import DatabaseOperatorException from '../../exceptions/database_operator_exception';
import {
    operateAppRecord,
    operateCustomEmojiRecord,
    operateDraftRecord,
    operateFileRecord,
    operateGlobalRecord,
    operatePostInThreadRecord,
    operatePostMetadataRecord,
    operatePostRecord,
    operatePostsInChannelRecord,
    operateReactionRecord,
    operateRoleRecord,
    operateServersRecord,
    operateSystemRecord,
    operateTermsOfServiceRecord,
} from '../operators';
import {createPostsChain, sanitizePosts, sanitizeReactions} from '../utils';

const {
    CUSTOM_EMOJI,
    DRAFT,
    FILE,
    POST,
    POST_METADATA,
    POSTS_IN_THREAD,
    POSTS_IN_CHANNEL,
    REACTION,
} = MM_TABLES.SERVER;

if (!__DEV__) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    logger.silence();
}

class DataOperator {
    /**
     * serverDatabase : In a multi-server configuration, this connection will be used by WebSockets and other parties to update databases other than the active one.
     * @type {DatabaseInstance}
     */
    serverDatabase: DatabaseInstance

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

      if (!values.length) {
          throw new DatabaseOperatorException(
              'An empty "values" array has been passed to the handleIsolatedEntity method',
          );
      }

      switch (tableName) {
          case IsolatedEntities.APP: {
              recordOperator = operateAppRecord;
              break;
          }
          case IsolatedEntities.GLOBAL: {
              recordOperator = operateGlobalRecord;
              break;
          }
          case IsolatedEntities.SERVERS: {
              recordOperator = operateServersRecord;
              break;
          }
          case IsolatedEntities.CUSTOM_EMOJI: {
              recordOperator = operateCustomEmojiRecord;
              break;
          }
          case IsolatedEntities.ROLE: {
              recordOperator = operateRoleRecord;
              break;
          }
          case IsolatedEntities.SYSTEM: {
              recordOperator = operateSystemRecord;
              break;
          }
          case IsolatedEntities.TERMS_OF_SERVICE: {
              recordOperator = operateTermsOfServiceRecord;
              break;
          }
          default: {
              recordOperator = null;
              break;
          }
      }

      if (recordOperator) {
          await this.executeInDatabase({values, tableName, recordOperator});
      }
  };

  /**
   * handleDraft: Handler responsible for the Create/Update operations occurring the Draft entity from the 'Server' schema
   * @param {RawDraft[]} drafts
   * @returns {Promise<void>}
   */
  handleDraft = async (drafts: RawDraft[]) => {
      if (!drafts.length) {
          throw new DatabaseOperatorException(
              'An empty "drafts" array has been passed to the handleReactions method',
          );
      }

      await this.executeInDatabase({
          values: drafts,
          tableName: DRAFT,
          recordOperator: operateDraftRecord,
      });
  };

  /**
   * handleReactions: Handler responsible for the Create/Update operations occurring on the Reaction entity from the 'Server' schema
   * @param {HandleReactions} handleReactions
   * @param {RawReaction[]} handleReactions.reactions
   * @param {boolean} handleReactions.prepareRowsOnly
   * @returns {Promise<[] | (Reaction | CustomEmoji)[]>}
   */
  handleReactions = async ({reactions, prepareRowsOnly}: HandleReactions) => {
      if (!reactions.length) {
          throw new DatabaseOperatorException(
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

      // Prepares record for model Reactions
      if (createReactions.length) {
          const reactionsRecords = ((await this.prepareRecords({
              database,
              recordOperator: operateReactionRecord,
              tableName: REACTION,
              values: createReactions,
          })) as unknown) as Reaction[];
          batchRecords = batchRecords.concat(reactionsRecords);
      }

      // Prepares records for model CustomEmoji
      if (createEmojis.length) {
          const emojiRecords = ((await this.prepareRecords({
              database,
              recordOperator: operateCustomEmojiRecord,
              tableName: CUSTOM_EMOJI,
              values: createEmojis as RawCustomEmoji[],
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
          throw new DatabaseOperatorException(
              'An empty "order" array has been passed to the HandlePosts method',
          );
      }

      let batch: Model[] = [];
      let files: RawFile[] = [];
      const postsInThread = [];
      let reactions: RawReaction[] = [];
      let emojis: RawCustomEmoji[] = [];
      const images: { images: Dictionary<PostImage>; postId: string }[] = [];
      const embeds: { embed: RawEmbed[]; postId: string }[] = [];

      // We treat those posts who are present in the order array only
      const {orderedPosts, unOrderedPosts} = sanitizePosts({
          posts: values,
          orders,
      });

      // We create the 'chain of posts' by linking each posts' previousId to the post before it in the order array
      const linkedRawPosts: RawPost[] = createPostsChain({
          orders,
          previousPostId: previousPostId || '',
          rawPosts: orderedPosts,
      });

      const database = await this.getDatabase(tableName);

      // Prepares records for batch processing onto the 'Post' entity for the server schema
      const posts = ((await this.prepareRecords({
          database,
          tableName,
          values: [...linkedRawPosts, ...unOrderedPosts],
          recordOperator: operatePostRecord,
      })) as unknown) as Post[];

      // Appends the processed records into the final batch array
      batch = batch.concat(posts);

      // Starts extracting information from each post to build up for related entities' data
      for (let i = 0; i < orderedPosts.length; i++) {
          const post = orderedPosts[i] as RawPost;

          // PostsInChannel - a root post has an empty root_id value
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
      await this.handleIsolatedEntity({
          tableName: IsolatedEntities.CUSTOM_EMOJI,
          values: emojis,
      });

      if (postsInThread.length) {
          await this.handlePostsInThread(postsInThread);
      }

      if (orderedPosts.length) {
          await this.handlePostsInChannel(orderedPosts);
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
          throw new DatabaseOperatorException(
              'An empty "files" array has been passed to the handleFiles method',
          );
      }

      const database = await this.getDatabase(FILE);

      const postFiles = ((await this.prepareRecords({
          database,
          recordOperator: operateFileRecord,
          tableName: FILE,
          values: files,
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
          values: metadata,
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
   * @returns {Promise<void>}
   */
  private handlePostsInThread = async (rootPosts: RawPostsInThread[]) => {
      if (!rootPosts.length) {
          throw new DatabaseOperatorException(
              'An empty "rootPosts" array has been passed to the handlePostsInThread method',
          );
      }

      // Creates an array of post ids
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
          const postInThreadRecords = ((await this.prepareRecords({
              database,
              recordOperator: operatePostInThreadRecord,
              tableName: POSTS_IN_THREAD,
              values: rawPostsInThreads,
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
          throw new DatabaseOperatorException(
              'An empty "posts" array has been passed to the handlePostsInChannel method',
          );
      }

      // Sort a clone of 'posts' array by create_at  ( oldest to newest )
      const sortedPosts = [...posts].sort((a, b) => {
          return a.create_at - b.create_at;
      });

      // The first element (beginning of chain)
      const tipOfChain: RawPost = sortedPosts[0];

      // Channel Id for this chain of posts
      const channelId = tipOfChain.channel_id;

      // Find smallest 'create_at' value in chain
      const earliest = tipOfChain.create_at;

      // Find highest 'create_at' value in chain
      const latest = sortedPosts[sortedPosts.length - 1].create_at;

      const database = await this.getDatabase(POSTS_IN_CHANNEL);

      // Find the records in the PostsInChannel table that have a matching channel_id
      const chunks = (await database.collections.
          get(POSTS_IN_CHANNEL).
          query(Q.where('channel_id', channelId)).
          fetch()) as PostsInChannel[];

      const createPostsInChannelRecord = async () => {
          await this.executeInDatabase({
              values: [{channel_id: channelId, earliest, latest}],
              tableName: POSTS_IN_CHANNEL,
              recordOperator: operatePostsInChannelRecord,
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
          const potentialPosts = (await database.collections.
              get(POST).
              query(Q.where('create_at', earliest)).
              fetch()) as Post[];

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
              }
          }
      } else {
          await createPostsInChannelRecord();
      }
  };

  /**
   * batchOperations: Accepts an instance of Database (either Default or Server) and an array of
   * prepareCreate/prepareUpdate 'models' and executes the actions on the database.
   * @param {BatchOperations} operation
   * @param {Database} operation.database
   * @param {Array} operation.models
   * @returns {Promise<void>}
   */
  private batchOperations = async ({database, models}: BatchOperations) => {
      try {
          if (models.length > 0) {
              await database.action(async () => {
                  await database.batch(...models);
              });
          } else {
              throw new DatabaseOperatorException(
                  'batchOperations does not process empty model array',
              );
          }
      } catch (e) {
          throw new DatabaseOperatorException('batchOperations error ', e);
      }
  };

  /**
   * prepareRecords: This method loops over the raw data, onto which it calls the assigned operator finally produce an array of prepareUpdate/prepareCreate objects
   * @param {PrepareRecords} prepareRecords
   * @param {Database} prepareRecords.database
   * @param {RecordValue[]} prepareRecords.values
   * @param {RecordOperator} prepareRecords.recordOperator
   * @returns {Promise<Model[]>}
   */
  private prepareRecords = async ({database, values, recordOperator}: PrepareRecords) => {
      if (!values.length) {
          return [];
      }

      if (!Array.isArray(values) || !values?.length || !database) {
          throw new DatabaseOperatorException(
              'prepareRecords accepts only values of type RecordValue[] or valid database connection',
          );
      }

      const recordPromises = await values.map(async (value) => {
          const record = await recordOperator({database, value});
          return record;
      });

      const results = await Promise.all(recordPromises);
      return results;
  };

  /**
   * executeInDatabase: This method uses the prepare records from the 'prepareRecords' method and send them as one transaction to the database.
   * @param {ExecuteRecords} executor
   * @param {RecordOperator} executor.recordOperator
   * @param {string} executor.tableName
   * @param {RecordValue[]} executor.values
   * @returns {Promise<void>}
   */
  private executeInDatabase = async ({recordOperator, tableName, values}: ExecuteRecords) => {
      if (!values.length) {
          throw new DatabaseOperatorException(
              'An empty "values" array has been passed to the executeInDatabase method',
          );
      }

      const database = await this.getDatabase(tableName);

      const models = ((await this.prepareRecords({
          database,
          recordOperator,
          tableName,
          values,
      })) as unknown) as Model[];

      if (models?.length > 0) {
          await this.batchOperations({database, models});
      }
  };

  /**
   * getDatabase: Based on the table's name, it will return a database instance either from the 'DEFAULT' database or
   * the 'SERVER' database
   * @param {string} tableName
   * @returns {Promise<Database>}
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
   * getServerDatabase: Returns the current active server database or if a connection is passed to the constructor, it will return that one.
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
