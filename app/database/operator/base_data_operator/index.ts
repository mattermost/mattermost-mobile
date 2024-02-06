// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {OperationType} from '@constants/database';
import {
    getRangeOfValues,
    getValidRecordsForUpdate,
    retrieveRecords,
} from '@database/operator/utils/general';
import {logWarning} from '@utils/log';

import type Model from '@nozbe/watermelondb/Model';
import type {
    HandleRecordsArgs,
    OperationArgs,
    ProcessRecordResults,
    ProcessRecordsArgs,
    RecordPair,
} from '@typings/database/database';

export interface BaseDataOperatorType {
    database: Database;
    handleRecords: <T extends Model>({buildKeyRecordBy, fieldName, transformer, createOrUpdateRawValues, deleteRawValues, tableName, prepareRecordsOnly}: HandleRecordsArgs<T>, description: string) => Promise<Model[]>;
    processRecords: <T extends Model>({createOrUpdateRawValues, deleteRawValues, tableName, buildKeyRecordBy, fieldName}: ProcessRecordsArgs) => Promise<ProcessRecordResults<T>>;
    batchRecords: (models: Model[], description: string) => Promise<void>;
    prepareRecords: <T extends Model>({tableName, createRaws, deleteRaws, updateRaws, transformer}: OperationArgs<T>) => Promise<Model[]>;
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
     * @param {(existing: Model, newElement: RawValue) => boolean} inputsArg.buildKeyRecordBy
     * @returns {Promise<{ProcessRecordResults}>}
     */
    processRecords = async <T extends Model>({createOrUpdateRawValues = [], deleteRawValues = [], tableName, buildKeyRecordBy, fieldName, shouldUpdate}: ProcessRecordsArgs): Promise<ProcessRecordResults<T>> => {
        const getRecords = async (rawValues: RawValue[]) => {
            // We will query a table where one of its fields can match a range of values.  Hence, here we are extracting all those potential values.
            const columnValues: string[] = getRangeOfValues({fieldName, raws: rawValues});

            if (!columnValues.length && rawValues.length) {
                throw new Error(
                    `Invalid "fieldName" or "tableName" has been passed to the processRecords method for tableName ${tableName} fieldName ${fieldName}`,
                );
            }

            if (!rawValues.length) {
                return [];
            }

            const existingRecords = await retrieveRecords<T>({
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
        const recordsByKeys = createOrUpdateRaws.reduce((result: Record<string, Model>, record) => {
            // @ts-expect-error object with string key
            const key = buildKeyRecordBy?.(record) || record[fieldName];
            result[key] = record;
            return result;
        }, {});

        if (createOrUpdateRawValues.length > 0) {
            for (const newElement of createOrUpdateRawValues) {
                // @ts-expect-error object with string key
                const key = buildKeyRecordBy?.(newElement) || newElement[fieldName];
                const existingRecord = recordsByKeys[key];

                // We found a record in the database that matches this element; hence, we'll proceed for an UPDATE operation
                if (existingRecord) {
                    if (shouldUpdate && !shouldUpdate(existingRecord, newElement)) {
                        continue;
                    }

                    // Some raw value has an update_at field.  We'll proceed to update only if the update_at value is different from the record's value in database
                    const updateRecords = getValidRecordsForUpdate({
                        tableName,
                        existingRecord,
                        newValue: newElement,
                    });

                    updateRaws.push(updateRecords);
                    continue;
                }

                // This RawValue is not present in the database; hence, we need to create it
                createRaws.push({record: undefined, raw: newElement});
            }
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
     * @param {(TransformerArgs) => Promise<Model>;} transformer
     * @returns {Promise<Model[]>}
     */
    prepareRecords = async <T extends Model>({tableName, createRaws, deleteRaws, updateRaws, transformer}: OperationArgs<T>): Promise<T[]> => {
        if (!this.database) {
            logWarning('Database not defined in prepareRecords');
            return [];
        }

        let preparedRecords: Array<Promise<T>> = [];

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

        const results = (await Promise.all(preparedRecords)) as T[];

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
     * @returns {Promise<void>}
     */
    async batchRecords(models: Model[], description: string): Promise<void> {
        try {
            if (models.length > 0) {
                await this.database.write(async (writer) => {
                    await writer.batch(...models);
                }, description);
            }
        } catch (e) {
            logWarning('batchRecords error ', description, e as Error);
        }
    }

    /**
     * handleRecords : Utility that processes some records' data against values already present in the database so as to avoid duplicity.
     * @param {HandleRecordsArgs} handleRecordsArgs
     * @param {(existing: Model, newElement: RawValue) => boolean} handleRecordsArgs.buildKeyRecordBy
     * @param {string} handleRecordsArgs.fieldName
     * @param {(TransformerArgs) => Promise<Model>} handleRecordsArgs.composer
     * @param {RawValue[]} handleRecordsArgs.createOrUpdateRawValues
     * @param {RawValue[]} handleRecordsArgs.deleteRawValues
     * @param {string} handleRecordsArgs.tableName
     * @returns {Promise<Model[]>}
     */
    async handleRecords<T extends Model>({buildKeyRecordBy, fieldName, transformer, createOrUpdateRawValues, deleteRawValues = [], tableName, prepareRecordsOnly = true, shouldUpdate}: HandleRecordsArgs<T>, description: string): Promise<T[]> {
        if (!createOrUpdateRawValues.length) {
            logWarning(
                `An empty "rawValues" array has been passed to the handleRecords method for tableName ${tableName}`,
            );
            return [];
        }

        const {createRaws, deleteRaws, updateRaws} = await this.processRecords<T>({
            createOrUpdateRawValues,
            deleteRawValues,
            tableName,
            buildKeyRecordBy,
            fieldName,
            shouldUpdate,
        });

        let models: T[] = [];
        models = await this.prepareRecords<T>({
            tableName,
            createRaws,
            updateRaws,
            deleteRaws,
            transformer,
        });

        if (!prepareRecordsOnly && models?.length) {
            await this.batchRecords(models, description);
        }

        return models;
    }
}
