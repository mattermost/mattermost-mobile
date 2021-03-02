// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import { Q } from '@nozbe/watermelondb';

import { MM_TABLES } from '@constants/database';
import Model from '@nozbe/watermelondb/Model';
import {
    BatchOperations,
    DatabaseInstance,
    HandleBaseData,
    HandleIsolatedEntityData,
    RawPost,
    RawPostsInThread,
    RecordValue,
} from '@typings/database/database';
import Post from '@typings/database/post';

import DatabaseManager from '../database_manager';

import {
    operateAppRecord,
    operateCustomEmojiRecord,
    operateGlobalRecord,
    operatePostRecord,
    operateRoleRecord,
    operateServersRecord,
    operateSystemRecord,
    operateTermsOfServiceRecord,
    operatePostInThread,
} from './operators';

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

const { POST, POSTS_IN_THREAD } = MM_TABLES.SERVER;

// FIXME : handlers should accept only array of values

class DataOperator {
    private defaultDatabase: DatabaseInstance;
    private serverDatabase: DatabaseInstance;

    /**
     * handleIsolatedEntityData: Operator that handles Create/Update operations on the isolated entities as
     * described by the IsolatedTables type
     * @param {HandleIsolatedEntityData} entityData
     * @param {OperationType} entityData.optType
     * @param {IsolatedEntities} entityData.tableName
     * @param {Records} entityData.values
     * @returns {Promise<void>}
     */
    handleIsolatedEntityData = async ({ optType, tableName, values }: HandleIsolatedEntityData): Promise<void> => {
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
            await this.handleBaseData({ optType, values, tableName, recordOperator });
        }
    };

    // TODO : draft should be a separate handler : handleDraft ( post body, draft info )
    // handleDraftData = ({ post, draft }) => null;

    handlePostsInThreadData = async (postsInThread: RawPostsInThread[]) => {
        const database = await this.getDatabase(POSTS_IN_THREAD);
        const postIds = postsInThread.map((postThread) => postThread.post_id);
        const rawPostsInThreads: { latest: number; earliest: number; post_id: string }[] = [];
        if (database) {
            const threads = (await database.collections
                .get(POST)
                .query(Q.where('id', Q.oneOf(postIds)))
                .fetch()) as Post[];

            postsInThread.forEach((rootPost) => {
                // Creates a sub-array of threads relating to rootPost.post_id
                const childPosts = threads.filter((thread) => {
                    return rootPost.post_id === thread.id;
                });

                // Retrieves max create-at date of all posts whose root_id is rootPost.post_id
                const maxCreateAt = childPosts.reduce((prev, current) => {
                    return prev > current.createAt ? prev : current.createAt;
                }, 0);

                // Collects all 'raw' postInThreads objects that will be sent to the operatePostsInThread function
                rawPostsInThreads.push({ ...rootPost, latest: maxCreateAt });
            });

            const postInThreadRecords = ((await this.prepareBaseData({
                database,
                optType: OperationType.CREATE,
                tableName: POSTS_IN_THREAD,
                recordOperator: operatePostInThread,
                values: rawPostsInThreads,
            })) as unknown) as Model[];

            if (postInThreadRecords?.length) {
                await this.batchOperations({ database, models: postInThreadRecords });
            }
        } else {
            // TODO : throw error for we couldn't get a database connection
        }
    };

    handlePostData = async ({ optType, values }: { optType: OperationType; values: RecordValue[] }) => {
        const tableName = POST;

        //     // TODO []: heavily make use of this.prepareBaseData so as to call the batchMethod only once
        //     // TODO []: generate prepareUpdate|Create for the values
        //     // TODO []: if we have metadata, create the metadata record prepareCreate/Update
        //     // TODO []: if we have file, create the file record prepareCreate/Update
        //     // TODO []:  if id === root_id, then add a record into PostsInThread
        //     // TODO []: if we have reaction, then create/update reaction table
        //     // TODO []: from all the received arrays of prepareUpdate|Create, batch all of them

        const database = await this.getDatabase(tableName);
        const batch = [];
        const postsInThread = [];

        if (values.length > 0) {
            // Prepares records for batch processing onto the 'Post' entity for the server schema
            const posts = await this.prepareBaseData({
                database,
                optType,
                tableName,
                values,
                recordOperator: operatePostRecord,
            });

            // Appends the processed records into the final batch array
            batch.push(posts);

            for (let i = 0; i < values.length; i++) {
                const post = values[i] as RawPost;
                // checks for id === root_id , if so, then call PostsInThread operator
                if (post.id === post.root_id) {
                    postsInThread.push({
                        earliest: post.create_at,
                        post_id: post.id,
                    });
                }
                // TODO:  call for metadata
                // TODO: call for file operator
                // TODO: call batch operations
            }
            // calls handler for PostsInThread
            await this.handlePostsInThreadData(postsInThread);
        } else {
            // TODO : throw ??
        }
    };

    /**
     * batchOperations: Accepts an instance of Database (either Default or Server) and an array of
     * prepareCreate/prepareUpdate values and executes the actions on the database.
     * @param {BatchOperations} operation
     * @param {Database} operation.database
     * @param {Array} operation.models
     * @returns {Promise<void>}
     */
    private batchOperations = async ({ database, models }: BatchOperations) => {
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

    // FIXME :  treat everything as an array => avoids code repetition
    // per entity
    /**
     *
     * @param { | undefined} database
     * @param {OperationType} optType
     * @param {string} tableName
     * @param {RecordValue[]} values
     * @param {(recordOperator: {optType: OperationType, value: RecordValue, database: , tableName: string}) => void} recordOperator
     * @returns {Promise<any>}
     */
    private prepareBaseData = async ({ database, optType, tableName, values, recordOperator }: HandleBaseData) => {
        if (Array.isArray(values) && values.length) {
            const recordPromises = await values.map(async (value) => {
                const record = await recordOperator({ database: database!, optType, tableName, value });
                return record;
            });

            const results = await Promise.all(recordPromises);
            return results;
        }
        return null;
    };

    /**
     * handleBaseData: Handles the Create/Update operations on an entity.
     * @param {HandleBaseData} opsBase
     * @param {OperationType} opsBase.optType
     * @param {string} opsBase.tableName
     * @param {Records} opsBase.values
     * @param {(recordOperator: DataFactory) => void} opsBase.recordOperator
     * @returns {Promise<void>}
     */
    private handleBaseData = async ({ optType, tableName, values, recordOperator }: HandleBaseData) => {
        const database = await this.getDatabase(tableName);
        if (!database) {
            return undefined;
        }

        const results = await this.prepareBaseData({ database, optType, tableName, values, recordOperator });

        if (results) {
            await this.batchOperations({ database, models: Array.isArray(results) ? results : Array(results) });
        }
        return null;
    };

    /**
     * getDatabase: Based on the table's name, it will return a database instance either from the 'DEFAULT' database or
     * the 'SERVER' database.
     * @param {string} tableName
     * @returns {Promise<DatabaseInstance>}
     */
    private getDatabase = async (tableName: string): Promise<DatabaseInstance> => {
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
