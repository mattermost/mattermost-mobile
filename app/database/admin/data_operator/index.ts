// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {DataFactory, DBInstance, IsolatedTables, RecordValue} from '@typings/database/database';

import DatabaseManager from '../database_manager';

import {
    operateAppRecord,
    operateCustomEmojiRecord,
    operateGlobalRecord,
    operateRoleRecord,
    operateServersRecord,
    operateSystemRecord,
    operateTermsOfServiceRecord,
} from './operators';

export enum OperationType {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE'
}

type Records = RecordValue | RecordValue[]

type HandleBaseData = {
    optType: OperationType,
    tableName: string,
    values: Records,
    recordOperator: (recordOperator: DataFactory) => void
}

type BatchOperations = { db: Database, models: Model[] }

type HandleIsolatedEntityData = { optType: OperationType, tableName: IsolatedTables, values: Records }

class DataOperator {
    private defaultDatabase: DBInstance | undefined;
    private serverDatabase: DBInstance | undefined;

    /**
     * handleIsolatedEntityData :Operator that handles Create/Update/Delete Operation on the isolated entities as
     * described by the IsolatedTables type
     * @param {OperationType} optType
     * @param {APP | GLOBAL | SERVERS | CUSTOM_EMOJI | ROLE | SYSTEM | TERMS_OF_SERVICE} tableName
     * @param {RawApp | RawGlobal | RawServers} values
     * @returns {Promise<void>}
     */
    handleIsolatedEntityData = async ({optType, tableName, values}: HandleIsolatedEntityData): Promise<void> => {
        const {APP, GLOBAL, SERVERS} = MM_TABLES.DEFAULT;
        const {CUSTOM_EMOJI, ROLE, SYSTEM} = MM_TABLES.SERVER;

        let recordOperator: (recordOperator: DataFactory) => void;

        switch (tableName) {
        case APP : {
            recordOperator = operateAppRecord;
            break;
        }
        case GLOBAL : {
            recordOperator = operateGlobalRecord;
            break;
        }
        case SERVERS : {
            recordOperator = operateServersRecord;
            break;
        }
        case CUSTOM_EMOJI : {
            recordOperator = operateCustomEmojiRecord;
            break;
        }
        case ROLE : {
            recordOperator = operateRoleRecord;
            break;
        }
        case SYSTEM : {
            recordOperator = operateSystemRecord;
            break;
        }
        default: {
            // TERMS_OF_SERVICE
            recordOperator = operateTermsOfServiceRecord;
            break;
        }
        }

        await this.handleBaseData({optType, values, tableName, recordOperator});
    };

    /**
     * batchOperations : Accepts an instance of Database ( either Default or Server) and an array of prepareCreate/prepareUpdate values.
     * @param {Database} db
     * @param {Array} models
     * @returns {Promise<void>}
     */
    private batchOperations = async ({db, models}: BatchOperations) => {
        if (models.length > 0) {
            await db.action(async () => {
                await db.batch(...models);
            });
        }
    };

    /**
     * handleBaseData: Handles the Create/Update/Delete operations on an entity.
     * @param {OperationType} optType
     * @param {string} tableName
     * @param {RawApp  | RawGlobal  | RawServers } values
     * @param {(recordOperator: DataFactory) => void} recordOperator
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
            results = await recordOperator({...config, value: values as RecordValue});
        }

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
