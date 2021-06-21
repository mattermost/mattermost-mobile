// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    getRangeOfValues,
    getValidRecordsForUpdate,
    retrieveRecords,
} from '@database/operator/utils/general';

import type Model from '@nozbe/watermelondb/Model';

import type {
    HandleRecordsArgs,
    OperationArgs,
    ProcessRecordResults,
    ProcessRecordsArgs,
    RawValue,
    RecordPair,
} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';

export interface BaseDataOperatorType {
    database: Database;
    handleRecords: ({findMatchingRecordBy, fieldName, transformer, createOrUpdateRawValues, deleteRawValues, tableName, prepareRecordsOnly}: HandleRecordsArgs) => Promise<Model[]>;
    processRecords: ({createOrUpdateRawValues, deleteRawValues, tableName, findMatchingRecordBy, fieldName}: ProcessRecordsArgs) => Promise<ProcessRecordResults>;
    batchRecords: (models: Model[]) => Promise<void>;
    prepareRecords: ({tableName, createRaws, deleteRaws, updateRaws, transformer}: OperationArgs) => Promise<Model[]>;
}

export default class BaseDataOperator {
    database: Database;

    constructor(database: Database) {
        this.database = database;
    }

    /**
     * processRecords: This method weeds out duplicates entries.  It may happen that we do multiple inserts for
     * the same value.  Hence, prior to that we query the database and pick only those values that are  'new' from the 'Raw' array.
     * @param {ProcessRecordsArgs} inputsArg
     * @param {RawValue[]} inputsArg.createOrUpdateRawValues
     * @param {string} inputsArg.tableName
     * @param {string} inputsArg.fieldName
     * @param {(existing: Model, newElement: RawValue) => boolean} inputsArg.findMatchingRecordBy
     * @returns {Promise<{ProcessRecordResults}>}
     */
    processRecords = async ({createOrUpdateRawValues, deleteRawValues = [], tableName, findMatchingRecordBy, fieldName}: ProcessRecordsArgs): Promise<ProcessRecordResults> => {
        const getRecords = async (rawValues : RawValue[]) => {
            // We will query a table where one of its fields can match a range of values.  Hence, here we are extracting all those potential values.
            const columnValues: string[] = getRangeOfValues({
                fieldName,
                raws: rawValues,
            });

            if (!columnValues.length && rawValues.length) {
                throw new DataOperatorException(
                    `Invalid "fieldName" or "tableName" has been passed to the processRecords method for tableName ${tableName} fieldName ${fieldName}`,
                );
            }

            if (!rawValues.length) {
                return [];
            }

            const existingRecords = await retrieveRecords({
                database: this.database,
                tableName,
                condition: Q.where(fieldName, Q.oneOf(columnValues)),
            });

            return existingRecords;
        };

        const createRaws: RecordPair[] = [];
        const updateRaws: RecordPair[] = [];

        // for delete flow
        const deleteRaws = await getRecords(deleteRawValues);

        // for create or update flow
        const createOrUpdateRaws = await getRecords(createOrUpdateRawValues);
        if (createOrUpdateRawValues.length > 0) {
            createOrUpdateRawValues.forEach((newElement: RawValue) => {
                const findIndex = createOrUpdateRaws.findIndex((existing) => {
                    return findMatchingRecordBy(existing, newElement);
                });

                // We found a record in the database that matches this element; hence, we'll proceed for an UPDATE operation
                if (findIndex > -1) {
                    const existingRecord = createOrUpdateRaws[findIndex];

                    // Some raw value has an update_at field.  We'll proceed to update only if the update_at value is different from the record's value in database
                    const updateRecords = getValidRecordsForUpdate({
                        tableName,
                        existingRecord,
                        newValue: newElement,
                    });

                    updateRaws.push(updateRecords);
                    return;
                }

                // This RawValue is not present in the database; hence, we need to create it
                createRaws.push({record: undefined, raw: newElement});
            });
        }

        return {
            createRaws,
            updateRaws,
            deleteRaws,
        };
    };

    /**
     * prepareRecords: Utility method that actually calls the operators for the handlers
     * @param {OperationArgs} prepareRecord
     * @param {string} prepareRecord.tableName
     * @param {RawValue[]} prepareRecord.createRaws
     * @param {RawValue[]} prepareRecord.updateRaws
     * @param {Model[]} prepareRecord.deleteRaws
     * @param {(TransformerArgs) => Promise<Model>;} prepareRecord.composer
     * @throws {DataOperatorException}
     * @returns {Promise<Model[]>}
     */
    prepareRecords = async ({tableName, createRaws, deleteRaws, updateRaws, transformer}: OperationArgs) => {
        if (!this.database) {
            throw new DataOperatorException('Database not defined');
        }

        let preparedRecords: Promise<Model>[] = [];

        // create operation
        if (createRaws?.length) {
            const recordPromises = createRaws.map(
                (createRecord: RecordPair) => {
                    return transformer({
                        database: this.database,
                        tableName,
                        value: createRecord,
                        action: OperationType.CREATE,
                    });
                },
            );

            preparedRecords = preparedRecords.concat(recordPromises);
        }

        // update operation
        if (updateRaws?.length) {
            const recordPromises = updateRaws.map(
                (updateRecord: RecordPair) => {
                    return transformer({
                        database: this.database,
                        tableName,
                        value: updateRecord,
                        action: OperationType.UPDATE,
                    });
                },
            );

            preparedRecords = preparedRecords.concat(recordPromises);
        }

        const results = await Promise.all(preparedRecords);

        if (deleteRaws?.length) {
            deleteRaws.forEach((deleteRecord) => {
                results.push(deleteRecord.prepareDestroyPermanently());
            });
        }

        return results;
    };

    /**
     * batchRecords: Accepts an instance of Database (either Default or Server) and an array of
     * prepareCreate/prepareUpdate 'models' and executes the actions on the database.
     * @param {Array} models
     * @throws {DataOperatorException}
     * @returns {Promise<void>}
     */
    batchRecords = async (models: Model[]) => {
        try {
            if (models.length > 0) {
                await this.database.action(async () => {
                    await this.database.batch(...models);
                });
            }
        } catch (e) {
            throw new DataOperatorException('batchRecords error ', e);
        }
    };

    /**
     * handleRecords : Utility that processes some records' data against values already present in the database so as to avoid duplicity.
     * @param {HandleRecordsArgs} handleRecordsArgs
     * @param {(existing: Model, newElement: RawValue) => boolean} handleRecordsArgs.findMatchingRecordBy
     * @param {string} handleRecordsArgs.fieldName
     * @param {(TransformerArgs) => Promise<Model>} handleRecordsArgs.composer
     * @param {RawValue[]} handleRecordsArgs.createOrUpdateRawValues
     * @param {RawValue[]} handleRecordsArgs.deleteRawValues
     * @param {string} handleRecordsArgs.tableName
     * @returns {Promise<Model[]>}
     */
    handleRecords = async ({findMatchingRecordBy, fieldName, transformer, createOrUpdateRawValues, deleteRawValues = [], tableName, prepareRecordsOnly = true}: HandleRecordsArgs) => {
        if (!createOrUpdateRawValues.length) {
            throw new DataOperatorException(
                `An empty "rawValues" array has been passed to the handleRecords method for tableName ${tableName}`,
            );
        }

        const {createRaws, deleteRaws, updateRaws} = await this.processRecords({
            createOrUpdateRawValues,
            deleteRawValues,
            tableName,
            findMatchingRecordBy,
            fieldName,
        });

        let models: Model[] = [];
        models = await this.prepareRecords({
            tableName,
            createRaws,
            updateRaws,
            deleteRaws,
            transformer,
        });

        if (!prepareRecordsOnly && models?.length) {
            await this.batchRecords(models);
        }

        return models;
    };
}
