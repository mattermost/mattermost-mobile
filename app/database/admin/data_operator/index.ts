// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {MM_TABLES} from '@constants/database';

import {Database} from '@nozbe/watermelondb';
import {DBInstance, OperationType} from '@typings/database/database';

import DatabaseManager from '../database_manager';
import {factoryApp} from './entity_factory';

class DataOperator {
    private defaultDatabase: DBInstance | undefined;
    private serverDatabase: DBInstance | undefined;

    /**
     * handleAppEntity : Operator that handles Create/Update/Delete operation on the app entity of the default database.
     * @param {OperationType} optType
     * @param {any} values
     * @returns {Promise<void>}
     */
    handleAppEntity = async ({optType, values}: { optType: OperationType, values: unknown }): Promise<void> => {
        const tableName = MM_TABLES.DEFAULT.APP;
        await this.handleBaseEntity({optType, values, tableName});
    };

    /**
     * batchOperations : Accepts an instance of Database ( either Default or Server) and an array of prepareCreate/prepareUpdate values.
     * @param {Database} db
     * @param {Array} models
     * @returns {Promise<void>}
     */
    private batchOperations = async ({db, models}: { db: Database, models: unknown }) => {
        await db.action(async () => {
            await db.batch(...models);
        });
    };

    /**
     * handleBaseEntity: Handles the Create/Update/Delete operations on an entity.
     * @param {OperationType} optType
     * @param {string} tableName
     * @param {any} values
     * @returns {Promise<void>}
     */
    private handleBaseEntity = async ({
        optType,
        tableName,
        values,
    }: { optType: OperationType, tableName: string, values: unknown }) => {
        const db = await this.getDatabase(tableName);
        if (!db) {
            return;
        }

        let results;
        const config = {db, optType, tableName};

        switch (optType) {
        case OperationType.DELETE:
            // Delete operation should occur on component level
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
                await this.batchOperations({
                    db,
                    models: Array.isArray(results) ? results : Array(results),
                });
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
