// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import {
    BatchOperations,
    DBInstance,
    HandleBaseData,
    HandleIsolatedEntityData,
    RecordValue,
} from '@typings/database/database';

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

export enum IsolatedEntities {
    APP= 'app',
    GLOBAL = 'global',
    SERVERS = 'servers',
    CUSTOM_EMOJI = 'CustomEmoji',
    ROLE = 'Role',
    SYSTEM = 'System',
    TERMS_OF_SERVICE = 'TermsOfService'
}

class DataOperator {
    private defaultDatabase: DBInstance;
    private serverDatabase: DBInstance;

    /**
     * handleIsolatedEntityData: Operator that handles Create/Update operations on the isolated entities as
     * described by the IsolatedTables type
     * @param {HandleIsolatedEntityData} entityData
     * @param {OperationType} entityData.optType
     * @param {IsolatedEntities} entityData.tableName
     * @param {Records} entityData.values
     * @returns {Promise<void>}
     */
    handleIsolatedEntityData = async ({optType, tableName, values}: HandleIsolatedEntityData): Promise<void> => {
        let recordOperator;

        switch (tableName) {
        case IsolatedEntities.APP : {
            recordOperator = operateAppRecord;
            break;
        }
        case IsolatedEntities.GLOBAL : {
            recordOperator = operateGlobalRecord;
            break;
        }
        case IsolatedEntities.SERVERS : {
            recordOperator = operateServersRecord;
            break;
        }
        case IsolatedEntities.CUSTOM_EMOJI : {
            recordOperator = operateCustomEmojiRecord;
            break;
        }
        case IsolatedEntities.ROLE : {
            recordOperator = operateRoleRecord;
            break;
        }
        case IsolatedEntities.SYSTEM : {
            recordOperator = operateSystemRecord;
            break;
        }
        case IsolatedEntities.TERMS_OF_SERVICE : {
            recordOperator = operateTermsOfServiceRecord;
            break;
        }
        default: {
            recordOperator = null;
            break;
        }
        }
        if (recordOperator) {
            await this.handleBaseData({optType, values, tableName, recordOperator});
        }
    };

    /**
     * batchOperations: Accepts an instance of Database (either Default or Server) and an array of
     * prepareCreate/prepareUpdate values and executes the actions on the database.
     * @param {BatchOperations} operation
     * @param {Database} operation.db
     * @param {Array} operation.models
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
     * handleBaseData: Handles the Create/Update operations on an entity.
     * @param {HandleBaseData} opsBase
     * @param {OperationType} opsBase.optType
     * @param {string} opsBase.tableName
     * @param {Records} opsBase.values
     * @param {(recordOperator: DataFactory) => void} opsBase.recordOperator
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
     * getDatabase: Based on the table's name, it will return a database instance either from the 'DEFAULT' database or
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
