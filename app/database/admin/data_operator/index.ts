// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {
    BatchOperations,
    DatabaseInstance,
    HandleBaseData,
    HandleIsolatedEntityData,
    RawCustomEmoji,
    RawFile,
    RawPost,
    RawPostsInThread,
    RawReaction,
    RawEmbed,
    PostImage,
    RawPostMetadata,
    RawDraft,
} from '@typings/database/database';
import File from '@typings/database/file';
import Post from '@typings/database/post';
import PostMetadata from '@typings/database/post_metadata';
import PostsInChannel from '@typings/database/posts_in_channel';
import PostsInThread from '@typings/database/posts_in_thread';
import Reaction from '@typings/database/reaction';
import CustomEmoji from '@typings/database/custom_emoji';

import DatabaseManager from '../database_manager';

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
} from './operators';
import {addPrevPostId, sanitizePosts, sanitizeReactions} from './utils';

export enum OperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum IsolatedEntities {
  APP = 'app',
  GLOBAL = 'global',
  SERVERS = 'servers',
  CUSTOM_EMOJI = 'CustomEmoji',
  ROLE = 'Role',
  SYSTEM = 'System',
  TERMS_OF_SERVICE = 'TermsOfService',
}

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

// FIXME : Refactor the getDatabase code so that it only returns a Database Instance

// FIXME : Performance improvements - For main entities, in each handler, do a 'select query' first to retrieve all
//  matching ids ( e.g. post_id ).  In another array, filter only those records whose update_at value are different.
//  Now, process this array in your handler.  On the operator level, do the select-query and update-at check for
//  specific tables ( minor ones ) only.

class DataOperator {
  private defaultDatabase: DatabaseInstance;
  private serverDatabase: DatabaseInstance;

  /**
   * handleIsolatedEntity: Operator that handles Create/Update operations on the isolated entities as
   * described by the IsolatedTables type
   * @param {HandleIsolatedEntityData} entityData
   * @param {OperationType} entityData.optType
   * @param {IsolatedEntities} entityData.tableName
   * @param {Records} entityData.values
   * @returns {Promise<void>}
   */
  handleIsolatedEntity = async ({
      optType,
      tableName,
      values,
  }: HandleIsolatedEntityData): Promise<void> => {
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
          await this.handleBase({optType, values, tableName, recordOperator});
      }
  };

  handleDraftData = async (drafts: RawDraft[]) => {
      await this.handleBase({
          optType: OperationType.CREATE,
          values: drafts,
          tableName: DRAFT,
          recordOperator: operateDraftRecord,
      });
  };

  handlePostsInThread = async (postsInThreads: RawPostsInThread[]) => {
      const database = await this.getDatabase(POSTS_IN_THREAD);
      const postIds = postsInThreads.map((postThread) => postThread.post_id);
      const rawPostsInThreads: {
      latest: number;
      earliest: number;
      post_id: string;
    }[] = [];

      if (database) {
          const threads = (await database.collections.
              get(POST).
              query(Q.where('id', Q.oneOf(postIds))).
              fetch()) as Post[];

          postsInThreads.forEach((rootPost) => {
              // Creates a sub-array of threads relating to rootPost.post_id
              const childPosts = threads.filter((thread) => {
                  return rootPost.post_id === thread.id;
              });

              // Retrieves max create-at date of all posts whose root_id is rootPost.post_id
              const maxCreateAt = childPosts.reduce((prev, current) => {
                  return prev > current.createAt ? prev : current.createAt;
              }, 0);

              // Collects all 'raw' postInThreads objects that will be sent to the operatePostsInThread function
              rawPostsInThreads.push({...rootPost, latest: maxCreateAt});
          });

          const postInThreadRecords = ((await this.prepareBase({
              database,
              optType: OperationType.CREATE,
              recordOperator: operatePostInThreadRecord,
              tableName: POSTS_IN_THREAD,
              values: rawPostsInThreads,
          })) as unknown) as PostsInThread[];

          if (postInThreadRecords?.length) {
              await this.batchOperations({database, models: postInThreadRecords});
          }
      } else {
      // TODO : throw error for we couldn't get a database connection
      }
  };

  handleReactions = async ({
      reactions,
      prepareRowsOnly,
  }: {
    reactions: RawReaction[];
    prepareRowsOnly: boolean;
  }) => {
      const database = await this.getDatabase(REACTION);
      if (database) {
          const {
              createReactions,
              createEmojis,
              deleteReactions,
          } = await sanitizeReactions({
              database,
              post_id: reactions[0].post_id,
              rawReactions: reactions,
          });

          // Prepares record for model Reactions
          const postReactions = ((await this.prepareBase({
              database,
              optType: OperationType.CREATE,
              recordOperator: operateReactionRecord,
              tableName: REACTION,
              values: createReactions,
          })) as unknown) as Reaction[];

          // Prepares records for model CustomEmoji
          const reactionEmojis = ((await this.prepareBase({
              database,
              optType: OperationType.CREATE,
              recordOperator: operateCustomEmojiRecord,
              tableName: CUSTOM_EMOJI,
              values: createEmojis,
          })) as unknown) as CustomEmoji[];

          if (prepareRowsOnly) {
              return [...postReactions, ...deleteReactions, ...reactionEmojis];
          }

          if (postReactions?.length) {
              await this.batchOperations({
                  database,
                  models: [...postReactions, ...deleteReactions, ...reactionEmojis],
              });
          }
      } else {
      // TODO: throw no database exception
      }
      return null;
  };

  handleFiles = async ({
      files,
      prepareRowsOnly,
  }: {
    files: RawFile[];
    prepareRowsOnly: boolean;
  }) => {
      const database = await this.getDatabase(FILE);
      if (database) {
          const postFiles = ((await this.prepareBase({
              database,
              optType: OperationType.CREATE,
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
      } else {
      // TODO: throw no database exception
      }
      return null;
  };

  handlePostMetadata = async ({
      embeds,
      images,
      prepareRowsOnly,
  }: {
    embeds: { embed: RawEmbed[]; postId: string }[];
    images: { images: Dictionary<PostImage>; postId: string }[];
    prepareRowsOnly: boolean;
  }) => {
      const database = await this.getDatabase(POST_METADATA);
      if (database) {
          const metadata: RawPostMetadata[] = [];

          images.forEach((image) => {
              const imageEntry = Object.entries(images);
              metadata.push({
                  data: {...imageEntry[1], url: imageEntry[0]},
                  type: 'images',
                  postId: image.postId,
              });
          });

          embeds.forEach((postEmbed) => {
              postEmbed.embed.forEach((embed: RawEmbed) => {
                  metadata.push({
                      data: {...embed.data},
                      type: embed.type,
                      postId: postEmbed.postId,
                  });
              });
          });

          const postMetas = ((await this.prepareBase({
              database,
              optType: OperationType.CREATE,
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
      } else {
      // TODO: throw no database exception
      }
      return null;
  };

  handlePostsInChannel = async (posts: RawPost[]) => {
      // At this point, the 'posts' array is already a chain of posts
      // We have to figure out how to plug it into existing chains in the PostsInChannel table

      // Sort 'posts' array by create_at
      const sortedPosts = [...posts].sort((a, b) => {
          return a.create_at - b.create_at;
      });

      // The first element ( beginning of chain )
      const tipOfChain: RawPost = sortedPosts[0];

      // Channel Id for this chain of posts
      const channelId = tipOfChain.channel_id;

      // Find lowest 'create_at' value in chain
      const earliest = tipOfChain.create_at;

      // Find highest 'create_at' value in chain; -1 means we are dealing with one item in the posts array
      const lastIndex = sortedPosts.length > 1 ? sortedPosts.length - 1 : -1;
      const latest = lastIndex > 0 ? sortedPosts[lastIndex].create_at : earliest;

      // Find the records in the PostsInChannel table that have a matching channel_id
      const database = await this.getDatabase(POSTS_IN_CHANNEL);
      const chunks = (await database!.collections.
          get(POSTS_IN_CHANNEL).
          query(Q.where('channel_id', channelId)).
          fetch()) as PostsInChannel[];

      const createPostsInChannelRecord = async () => {
          await this.handleBase({
              optType: OperationType.CREATE,
              values: [
                  {
                      channel_id: channelId,
                      earliest,
                      latest,
                  },
              ],
              tableName: POSTS_IN_CHANNEL,
              recordOperator: operatePostsInChannelRecord,
          });
      };

      // chunk length 0; then it's a new chunk to be added to the PostsInChannel table
      if (chunks.length === 0) {
          return createPostsInChannelRecord();
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
          const potentialPosts = (await database!.collections.
              get(POST).
              query(Q.where('create_at', earliest)).
              fetch()) as Post[];
          if (potentialPosts?.length > 0) {
              const targetPost = potentialPosts[0];

              // now we decide if we need to operate on the targetChunk or just create a new chunk
              const isChainable =
          tipOfChain.prev_post_id === targetPost.previousPostId;

              // FIXME : is previous_post_id is empty string ??
              if (isChainable) {
                  // Update this chunk's data in PostsInChannel table.  earliest comes from tipOfChain while latest comes from chunk
                  await database!.action(async () => {
                      await targetChunk.update((postInChannel) => {
                          postInChannel.earliest = earliest;
                      });
                  });
              } else {
                  return createPostsInChannelRecord();
              }
          }
      } else {
          return createPostsInChannelRecord();
      }
      return null;
  };

  handlePosts = async ({
      optType,
      orders,
      values,
      previousPostId,
  }: {
    optType: OperationType;
    orders?: string[];
    values: RawPost[];
    previousPostId?: string;
  }) => {
      const tableName = POST;

      // We rely on the order array; if it is empty, we stop processing
      if (!orders || orders?.length < 1) {
      // // TODO: throw an exception here ?
          return;
      }

      const database = await this.getDatabase(tableName);

      const batch: Model[] = [];
      const files: RawFile[] = [];
      const postsInThread = [];
      const reactions: RawReaction[] = [];
      const emojis: RawCustomEmoji[] = [];
      const images: { images: Dictionary<PostImage>; postId: string }[] = [];
      const embeds: { embed: RawEmbed[]; postId: string }[] = [];

      // We treat those posts who are present in the order array only
      const sanitizedPosts: RawPost[] = sanitizePosts({posts: values, orders});

      // FIXME : what happens to posts not in order array ???

      // We create the 'chain of posts' by linking each posts' previousId to the post before it in the order array
      const augmentedRawPosts: RawPost[] = addPrevPostId({
          orders,
          previousPostId: previousPostId || '',
          values: sanitizedPosts,
      });

      if (previousPostId) {
          augmentedRawPosts[0].prev_post_id = previousPostId;
      }

      // Prepares records for batch processing onto the 'Post' entity for the server schema
      const posts = ((await this.prepareBase({
          database,
          optType,
          tableName,
          values: augmentedRawPosts,
          recordOperator: operatePostRecord,
      })) as unknown) as Post[];

      // Appends the processed records into the final batch array
      batch.concat(posts);

      // Starts extracting information from each post to build up for related entities' data
      for (let i = 0; i < values.length; i++) {
          const post = values[i] as RawPost;

          // PostInThread handler: checks for id === root_id , if so, then call PostsInThread operator
          if (post.id === post.root_id) {
              postsInThread.push({
                  earliest: post.create_at,
                  post_id: post.id,
              });
          }

          // // TODO:  call for metadata

          const meta = post?.metadata;
          if (meta) {
              // Extracts reaction from post's metadata
              if (meta?.reactions?.length > 0) {
                  reactions.concat(meta.reactions);
              }

              // Extracts emojis from post's metadata
              if (meta?.emojis?.length > 0) {
                  emojis.concat(meta.emojis);
              }

              // Extracts files from post's metadata
              if (meta?.files?.length > 0) {
                  files.concat(meta.files);
              }

              // Extracts images and embeds from post's metadata
              if (meta) {
                  if (meta?.images) {
                      images.push({images: meta.images, postId: post.id});
                  }
                  if (meta?.embeds) {
                      embeds.push({embed: meta.embeds, postId: post.id});
                  }
              }
          }
      } // end of for loop

      // // TODO : test with empty array for reactions <<<<<<<<<<<<<<

      // calls handler for Reactions
      const postReactions = (await this.handleReactions({
          reactions,
          prepareRowsOnly: true,
      })) as Reaction[];
      batch.concat(postReactions);

      // calls handler for Files
      const postFiles = (await this.handleFiles({
          files,
          prepareRowsOnly: true,
      })) as File[];
      batch.concat(postFiles);

      // calls handler for postMetadata ( embeds and images )
      const postMetadata = (await this.handlePostMetadata({
          images,
          embeds,
          prepareRowsOnly: true,
      })) as PostMetadata[];
      batch.concat(postMetadata);

      // // TODO: call batch operations
      await this.batchOperations({database: database!, models: batch});

      // LAST :: calls handler for CustomEmojis, PostsInThread
      await this.handleIsolatedEntity({
          optType: OperationType.CREATE,
          tableName: IsolatedEntities.CUSTOM_EMOJI,
          values: emojis,
      });

      await this.handlePostsInThread(postsInThread);
      await this.handlePostsInChannel(values);
  };

  /**
   * batchOperations: Accepts an instance of Database (either Default or Server) and an array of
   * prepareCreate/prepareUpdate values and executes the actions on the database.
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
              // TODO : throw ??
          }
      } catch (e) {
      // throw
      }
  };

  private prepareBase = async ({
      database,
      optType,
      tableName,
      values,
      recordOperator,
  }: HandleBaseData) => {
      if (Array.isArray(values) && values.length) {
          const recordPromises = await values.map(async (value) => {
              const record = await recordOperator({
                  database: database!,
                  optType,
                  tableName,
                  value,
              });
              return record;
          });

          const results = await Promise.all(recordPromises);
          return results;
      }
      return null;
  };

  /**
   * handleBase: Handles the Create/Update operations on an entity.
   * @param {HandleBaseData} opsBase
   * @param {OperationType} opsBase.optType
   * @param {string} opsBase.tableName
   * @param {Records} opsBase.values
   * @param {(recordOperator: DataFactory) => void} opsBase.recordOperator
   * @returns {Promise<void>}
   */
  private handleBase = async ({
      optType,
      tableName,
      values,
      recordOperator,
  }: HandleBaseData) => {
      const database = await this.getDatabase(tableName);
      if (!database) {
          return undefined;
      }

      const results = await this.prepareBase({
          database,
          optType,
          tableName,
          values,
          recordOperator,
      });

      if (results) {
          await this.batchOperations({
              database,
              models: Array.isArray(results) ? results : Array(results),
          });
      }
      return null;
  };

  /**
   * getDatabase: Based on the table's name, it will return a database instance either from the 'DEFAULT' database or
   * the 'SERVER' database.
   * @param {string} tableName
   * @returns {Promise<DatabaseInstance>}
   */
  private getDatabase = async (
      tableName: string,
  ): Promise<DatabaseInstance> => {
      const isInDefaultDB = Object.values(MM_TABLES.DEFAULT).some((tbName) => {
          return tableName === tbName;
      });

      if (isInDefaultDB) {
          return this.defaultDatabase || this.getDefaultDatabase();
      }

      return this.serverDatabase || this.getServerDatabase();
  };

  /**
   * getDefaultDatabase: Returns the default database
   * @returns {Promise<DatabaseInstance>}
   */
  private getDefaultDatabase = async () => {
      this.defaultDatabase = await DatabaseManager.getDefaultDatabase();
      return this.defaultDatabase;
  };

  /**
   * getServerDatabase: Returns the current active server database (multi-server support)
   * @returns {Promise<DatabaseInstance>}
   */
  private getServerDatabase = async () => {
      this.serverDatabase = await DatabaseManager.getActiveServerDatabase();
      return this.serverDatabase;
  };
}

export default new DataOperator();
