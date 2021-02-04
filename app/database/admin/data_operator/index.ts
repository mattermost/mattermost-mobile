// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {DBInstance, OperationType} from '@typings/database/database';

import DatabaseManager from '../database_manager';
import {factoryApp} from './entity_factory';

// [x] TODO : how to get Model based on values[i] => type of values[i]
// [] TODO: set custom id to each model => await postsCollection.create(post => { post._raw.id = serverId })
class DataOperator {
    private defaultDatabase: DBInstance | undefined;
    private serverDatabase: DBInstance | undefined;

    batchOperations = async ({db, models}: { db: Database, models: any }) => {
        await db.batch(...models);
    };

    handleAppEntity = async ({optType, values}: { optType: OperationType, values: any }) => {
        const tableName = MM_TABLES.DEFAULT.APP;
        const db = await this.getDatabase(tableName);
        if (!db) {
            return;
        }

        let results;
        const config = {db, optType, tableName};

        switch (optType) {
        case OperationType.DELETE:
            break;
        case OperationType.CREATE: {
            if (Array.isArray(values) && values.length) {
                results = values.map(async (value) => {
                    await factoryApp({...config, value});
                });
            } else {
                results = await factoryApp({...config, value: values});
            }

            if (results) {
                const models = Array.isArray(results) ? results : Array(results);
                await this.batchOperations({db, models});
            }
            break;
        }
        case OperationType.UPDATE: {
            // Update occurs on one record only
            results = await factoryApp({...config, value: values});
            if (results) {
                await this.batchOperations({db, models: Array(results)});
            }
            break;
        }
        default:
            break;
        }
    };

    /**
     * getDatabase : Based on the table's name, it will return a database instance either from the 'DEFAULT' database or
     * the 'SERVER' database.
     * @param {string} tableName
     * @returns {Promise<DBInstance>}
     */
    private getDatabase = async (tableName: string): Promise<DBInstance> => {
        if (tableName in MM_TABLES.DEFAULT) {
            return this.defaultDatabase || this.getDefaultDatabase();
        }

        return this.serverDatabase || this.getServerDatabase();
    };

    /**
     * getDefaultDatabase: Returns the default database
     * @returns {Promise<DBInstance>}
     */
    private getDefaultDatabase = async () => {
        this.defaultDatabase = await DatabaseManager.getDefaultDatabase();
        return this.defaultDatabase;
    };

    /**
     * getServerDatabase: Returns the current active server database (multi-server support)
     * @returns {Promise<DBInstance>}
     */
    private getServerDatabase = async () => {
        this.serverDatabase = await DatabaseManager.getActiveServerDatabase();
        return this.serverDatabase;
    };
}

export default new DataOperator();
