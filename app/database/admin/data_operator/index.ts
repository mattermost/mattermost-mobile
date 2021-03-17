// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/admin/database_manager';
import CustomEmoji from '@typings/database/custom_emoji';
import {
    BatchOperations,
    HandleBaseData,
    HandleFiles,
    HandleIsolatedEntityData,
    HandlePostMetadata,
    HandlePosts,
    HandleReactions,
    PostImage,
    RawCustomEmoji,
    RawDraft,
    RawEmbed,
    RawFile,
    RawPost,
    RawPostMetadata,
    RawPostsInThread,
    RawReaction,
    RawUser,
} from '@typings/database/database';
import {IsolatedEntities} from '@typings/database/enums';
import File from '@typings/database/file';
import Post from '@typings/database/post';
import PostMetadata from '@typings/database/post_metadata';
import PostsInChannel from '@typings/database/posts_in_channel';
import PostsInThread from '@typings/database/posts_in_thread';
import Reaction from '@typings/database/reaction';

import DatabaseConnectionException from './exceptions/database_connection_exception';
import DatabaseOperatorException from './exceptions/database_operator_exception';
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
    operateUserRecord,
} from './operators';
import {createPostsChain, sanitizePosts, sanitizeReactions} from './utils';

const {
    CUSTOM_EMOJI,
    DRAFT,
    FILE,
    POST,
    POST_METADATA,
    POSTS_IN_THREAD,
    POSTS_IN_CHANNEL,
    REACTION,
    USER,
} = MM_TABLES.SERVER;

class DataOperator {
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
          await this.handleBase({values, tableName, recordOperator});
      }
  };

  /**
   * handleDraft: Handler responsible for the Create/Update operations occurring the Draft entity from the 'Server' schema
   * @param {RawDraft[]} drafts
   * @returns {Promise<any[]>}
   */
  handleDraft = async (drafts: RawDraft[]) => {
      if (!drafts.length) {
          return [];
      }

      await this.handleBase({
          values: drafts,
          tableName: DRAFT,
          recordOperator: operateDraftRecord,
      });

      return [];
  };

  /**
   * handleReactions: Handler responsible for the Create/Update operations occurring on the Reaction entity from the 'Server' schema
   * @param {HandleReactions} handleReactions
   * @param {RawReaction[]} handleReactions.reactions
   * @param {boolean} handleReactions.prepareRowsOnly
   * @returns {Promise<any[] | (Reaction | CustomEmoji)[]>}
   */
  handleReactions = async ({reactions, prepareRowsOnly}: HandleReactions) => {
      if (!reactions.length) {
          return [];
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

      // Prepares record for model Reactions
      const postReactions = ((await this.prepareBase({
          database,
          recordOperator: operateReactionRecord,
          tableName: REACTION,
          values: createReactions,
      })) as unknown) as Reaction[];

      // Prepares records for model CustomEmoji
      const reactionEmojis = ((await this.prepareBase({
          database,
          recordOperator: operateCustomEmojiRecord,
          tableName: CUSTOM_EMOJI,
          values: createEmojis as RawCustomEmoji[],
      })) as unknown) as CustomEmoji[];

      const batchRecords = [
          ...postReactions,
          ...deleteReactions,
          ...reactionEmojis,
      ];

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
   * handleFiles: Handler responsible for the Create/Update operations occurring on the File entity from the 'Server' schema
   * @param {HandleFiles} handleFiles
   * @param {RawFile[]} handleFiles.files
   * @param {boolean} handleFiles.prepareRowsOnly
   * @returns {Promise<File[] | any[]>}
   */
  handleFiles = async ({files, prepareRowsOnly}: HandleFiles) => {
      if (!files.length) {
          return [];
      }

      const database = await this.getDatabase(FILE);

      const postFiles = ((await this.prepareBase({
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
  handlePostMetadata = async ({embeds, images, prepareRowsOnly}: HandlePostMetadata) => {
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

      const postMetas = ((await this.prepareBase({
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
   * @param {RawPostsInThread[]} postsInThreads
   * @returns {Promise<any[]>}
   */
  handlePostsInThread = async (postsInThreads: RawPostsInThread[]) => {
      if (!postsInThreads.length) {
          return [];
      }

      const postIds = postsInThreads.map((postThread) => postThread.post_id);
      const rawPostsInThreads: RawPostsInThread[] = [];

      const database = await this.getDatabase(POSTS_IN_THREAD);
      const threads = (await database.collections.
          get(POST).
          query(Q.where('root_id', Q.oneOf(postIds))).
          fetch()) as Post[];

      postsInThreads.forEach((rootPost) => {
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

      const postInThreadRecords = ((await this.prepareBase({
          database,
          recordOperator: operatePostInThreadRecord,
          tableName: POSTS_IN_THREAD,
          values: rawPostsInThreads,
      })) as unknown) as PostsInThread[];

      if (postInThreadRecords?.length) {
          await this.batchOperations({database, models: postInThreadRecords});
      }

      return [];
  };

  /**
   * handlePostsInChannel: Handler responsible for the Create/Update operations occurring on the PostsInChannel entity from the 'Server' schema
   * @param {RawPost[]} posts
   * @returns {Promise<any[]>}
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

      const database = await this.getDatabase(POSTS_IN_CHANNEL);

      // Find the records in the PostsInChannel table that have a matching channel_id
      const chunks = (await database.collections.
          get(POSTS_IN_CHANNEL).
          query(Q.where('channel_id', channelId)).
          fetch()) as PostsInChannel[];

      const createPostsInChannelRecord = async () => {
          await this.handleBase({
              values: [{channel_id: channelId, earliest, latest}],
              tableName: POSTS_IN_CHANNEL,
              recordOperator: operatePostsInChannelRecord,
          });
      };

      // chunk length 0; then it's a new chunk to be added to the PostsInChannel table
      if (chunks.length === 0) {
          await createPostsInChannelRecord();
          return [];
      }

      // Sort chunks (in-place) by earliest field
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
   * handlePosts: Handler responsible for the Create/Update operations occurring on the Post entity from the 'Server' schema
   * @param {HandlePosts} handlePosts
   * @param {string[]} orders
   * @param {RawPost[]} values
   * @param {string | undefined} previousPostId
   * @returns {Promise<void>}
   */
  handlePosts = async ({orders, values, previousPostId}: HandlePosts) => {
      const tableName = POST;

      // We rely on the order array; if it is empty, we stop processing
      if (!orders.length) {
          throw new DatabaseOperatorException('An empty "order" array has been passed to the HandlePosts method');
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
      const posts = ((await this.prepareBase({
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

          // PostInThread handler: checks for id === root_id , if so, then call PostsInThread operator
          if (post.id === post.root_id) {
              postsInThread.push({
                  earliest: post.create_at,
                  post_id: post.id,
              });
          }

          const hasMetadata = post?.metadata && Object.keys(post?.metadata).length > 0;
          if (hasMetadata) {
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

      // calls handler for Reactions
      const postReactions = (await this.handleReactions({
          reactions,
          prepareRowsOnly: true,
      })) as Reaction[];
      batch = batch.concat(postReactions);

      // calls handler for Files
      const postFiles = (await this.handleFiles({
          files,
          prepareRowsOnly: true,
      })) as File[];
      batch = batch.concat(postFiles);

      // calls handler for postMetadata ( embeds and images )
      const postMetadata = (await this.handlePostMetadata({
          images,
          embeds,
          prepareRowsOnly: true,
      })) as PostMetadata[];
      batch = batch.concat(postMetadata);

      if (batch.length) {
          await this.batchOperations({database, models: batch});
      }

      // LAST: calls handler for CustomEmojis, PostsInThread, PostsInChannel
      await this.handleIsolatedEntity({
          tableName: IsolatedEntities.CUSTOM_EMOJI,
          values: emojis,
      });
      await this.handlePostsInThread(postsInThread);
      await this.handlePostsInChannel(orderedPosts);
  };

  /**
   * handleUsers: Handler responsible for the Create/Update operations occurring on the User entity from the 'Server' schema
   * @param {RawUser[]} users
   * @returns {Promise<void>}
   */
  handleUsers = async (users: RawUser[]) => {
      if (!users.length) {
          return [];
      }

      const records = await this.handleBase({
          tableName: USER,
          values: users,
          recordOperator: operateUserRecord,
      });

      return records;
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
   * prepareBase: Utility method that actually calls the operators for the handlers
   * @param {Database} database
   * @param {string} tableName
   * @param {RecordValue[]} values
   * @param {(recordOperator: { value: RecordValue, database: Database, tableName: string}) => void} recordOperator
   * @returns {Promise<unknown[] | any[]>}
   */
  private prepareBase = async ({
      database,
      tableName,
      values,
      recordOperator,
  }: HandleBaseData) => {
      if (!Array.isArray(values) || !database) {
          throw new DatabaseOperatorException(
              'prepareBase accepts only rawPosts of type RecordValue[] or valid database connection',
          );
      }

      if (values.length) {
          const recordPromises = await values.map(async (value) => {
              const record = await recordOperator({database, tableName, value});
              return record;
          });

          const results = await Promise.all(recordPromises);
          return results;
      }

      return [];
  };

  /**
   * handleBase: Handles the Create/Update operations on an entity.
   * @param {HandleBaseData} baseData
   * @param {string} tableName
   * @param {RecordValue[]} values
   * @param {(recordOperator: {value: RecordValue, database: , tableName: string}) => void} recordOperator
   * @returns {Promise<void>}
   */
  private handleBase = async ({
      tableName,
      values,
      recordOperator,
  }: HandleBaseData) => {
      const database = await this.getDatabase(tableName);

      const models = ((await this.prepareBase({
          database,
          tableName,
          values,
          recordOperator,
      })) as unknown) as Model[];

      if (models?.length > 0) {
          await this.batchOperations({
              database,
              models,
          });
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
   * @returns {Promise<DatabaseInstance>}
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
   * @returns {Promise<DatabaseInstance>}
   */
  private getServerDatabase = async () => {
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

export default new DataOperator();
