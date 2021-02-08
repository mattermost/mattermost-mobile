// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {DataFactory, DBInstance, RawApp} from '@typings/database/database';

import DatabaseManager from '../database_manager';

import {factoryApp} from './entity_factory';

export enum OperationType {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE'
}

// TODO : what if we are inserting duplicate ids?

class DataOperator {
    private defaultDatabase: DBInstance | undefined;
    private serverDatabase: DBInstance | undefined;

    /**
     * handleAppData : Operator that handles Create/Update/Delete operation on the app entity of the default database.
     * @param {OperationType} optType
     * @param {any} values
     * @returns {Promise<void>}
     */
    handleAppData = async ({
        optType,
        values,
    }: { optType: OperationType, values: RawApp | RawApp[] }): Promise<void> => {
        const tableName = MM_TABLES.DEFAULT.APP;
        await this.handleBaseData({optType, values, tableName, recordFactory: factoryApp});
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
     * handleBaseData: Handles the Create/Update/Delete operations on an entity.
     * @param {OperationType} optType
     * @param {string} tableName
     * @param {any} values
     * @param recordFactory
     * @returns {Promise<void>}
     */
    private handleBaseData = async ({
        optType,
        tableName,
        values,
        recordFactory,
    }: { optType: OperationType, tableName: string, values: unknown, recordFactory: (recordFactory : DataFactory) => void }) => {
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
                const recordPromises = await values.map(async (value) => {
                    const record = await recordFactory({...config, value});
                    return record;
                });

                results = await Promise.all(recordPromises);
            } else {
                results = await recordFactory({...config, value: values});
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
            results = await recordFactory({...config, value: values}) as unknown as Model;
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
