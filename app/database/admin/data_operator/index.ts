// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {DataFactory, DBInstance, RecordValue} from '@typings/database/database';

import DatabaseManager from '../database_manager';

import {operateAppRecord} from './entity_factory';

export enum OperationType {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE'
}

type HandleBaseData = {
    optType: OperationType,
    tableName: string,
    values: unknown,
    recordOperator: (recordOperator: DataFactory) => void
}

type BatchOperations = { db: Database, models: unknown }
type HandleEntityData = { optType: OperationType, values: RecordValue }

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
    handleAppData = async ({optType, values}: HandleEntityData): Promise<void> => {
        const tableName = MM_TABLES.DEFAULT.APP;
        await this.handleBaseData({optType, values, tableName, recordOperator: operateAppRecord});
    };

    /**
     * batchOperations : Accepts an instance of Database ( either Default or Server) and an array of prepareCreate/prepareUpdate values.
     * @param {Database} db
     * @param {Array} models
     * @returns {Promise<void>}
     */
    private batchOperations = async ({db, models}: BatchOperations) => {
        await db.action(async () => {
            await db.batch(...models);
        });
    };

    /**
     * handleBaseData: Handles the Create/Update/Delete operations on an entity.
     * @param {OperationType} optType
     * @param {string} tableName
     * @param {any} values
     * @param recordOperator
     *
     * @returns {Promise<void>}
     */
    private handleBaseData = async ({optType, tableName, values, recordOperator}: HandleBaseData) => {
        const db = await this.getDatabase(tableName);
        if (!db) {
            return;
        }

        let results;
        const config = {db, optType, tableName};

        if (Array.isArray(values) && values.length) {
            const recordPromises = await values.map(async (value) => {
                const record = await recordOperator({...config, value});
                return record;
            });

            results = await Promise.all(recordPromises);
        } else {
            results = await recordOperator({...config, value: values});
        }

        // FIXME : do better check on the results constant
        if (results) {
            await this.batchOperations({db, models: Array.isArray(results) ? results : Array(results)});
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
