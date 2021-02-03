// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import Model from '@nozbe/watermelondb/Model';
import {DBInstance} from '@typings/database/database';

import DatabaseManager from '../database_manager';

// [x] TODO : how to get Model based on values[i] => type of values[i]
// [] TODO: set custom id to each model => await postsCollection.create(post => { post._raw.id = serverId })
class DataOperator {
    private defaultDatabase: DBInstance | undefined;
    private serverDatabase: DBInstance | undefined;

    /**
     * batchCreate : Generic method to batch create/insert multiple processed models.  It chooses the type of database based on the table's name.
     * @param {string} tableName
     * @param {Model[]} models
     * @returns {Promise<void>}
     */
    batchCreate = async ({tableName, models}: { tableName: string, models: Model[]}) => {
        const db = await this.getDatabase(tableName);
        if (db) {
            await db.batch(...models);
        }
    }

    /**
     * getDatabase : Based on the table's name, it will return a database instance either from the 'DEFAULT' database or the 'SERVER' database.
     * @param {string} tableName
     * @returns {Promise<DBInstance>}
     */
    private getDatabase = async (tableName: string): Promise<DBInstance> => {
        if (tableName in MM_TABLES.DEFAULT) {
            return this.defaultDatabase || this.getDefaultDatabase();
        }

        return this.serverDatabase || this.getServerDatabase();
    }

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
