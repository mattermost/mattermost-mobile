// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Model} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type {AssociationInfo, HasManyAssociation} from '@nozbe/watermelondb/Model';
import type {IdenticalRecordArgs, RangeOfValueArgs, RecordPair, RetrieveRecordsArgs} from '@typings/database/database';

const {CHANNEL, POST, TEAM, USER} = MM_TABLES.SERVER;

/**
 * getValidRecordsForUpdate: Database Operations on some tables are expensive.  As such, we would like to operate if and only if we are
 * 100% sure that the records are actually different from what we already have in the database.
 * @param {IdenticalRecordArgs} identicalRecord
 * @param {string} identicalRecord.tableName
 * @param {RecordValue} identicalRecord.newValue
 * @param {Model} identicalRecord.existingRecord
 * @returns {boolean}
 */
export const getValidRecordsForUpdate = <T extends Model, R extends RawValue>({tableName, newValue, existingRecord}: IdenticalRecordArgs<T, R>) => {
    const guardTables = [CHANNEL, POST, TEAM, USER];
    if (guardTables.includes(tableName)) {
        const newValueUpdateAt = ('update_at' in newValue) ? newValue.update_at : 0;
        const existingRecordUpdateAt = ('updateAt' in existingRecord) ? existingRecord.updateAt : 0;
        const shouldUpdate = newValueUpdateAt === existingRecordUpdateAt;

        if (shouldUpdate) {
            return {
                record: existingRecord,
                raw: newValue,
            };
        }
    }

    return {
        record: existingRecord,
        raw: newValue,
    };
};

/**
 * This method extracts one particular field 'fieldName' from the raw values and returns them as a string array
 * @param {RangeOfValueArgs} range
 * @param {string} range.fieldName
 * @param {RawValue[]} range.raws
 * @returns {string[]}
 */
export const getRangeOfValues = ({fieldName, raws}: RangeOfValueArgs) => {
    return raws.reduce((oneOfs, current: RawValue) => {
        const key = fieldName as keyof typeof current;
        const value: string = current[key] as string;
        if (value) {
            oneOfs.push(value);
        }
        return oneOfs;
    }, [] as string[]);
};

/**
 * getRawRecordPairs: Utility method that maps over the raws array to create an array of RecordPair
 * @param {any[]} raws
 * @returns {{record: undefined, raw: any}[]}
 */
export const getRawRecordPairs = <T extends Model, R extends RawValue>(raws: R[]): Array<RecordPair<T, R>> => {
    return raws.map((raw) => {
        return {raw, record: undefined};
    });
};

/**
 * getUniqueRawsBy: We have to ensure that we are not updating the same record twice in the same operation.
 * Hence, thought it might not occur, prevention is better than cure.  This function removes duplicates from the 'raws' array.
 * @param {RawValue[]} raws
 * @param {string} key
 */
export const getUniqueRawsBy = <T extends RawValue>({raws, key}: { raws: T[]; key: string}) => {
    return [...new Map(raws.map((item) => {
        const curItemKey = item[key as keyof typeof item];
        return [curItemKey, item];
    })).values()];
};

/**
 * retrieveRecords: Retrieves records from the database
 * @param {RetrieveRecordsArgs} records
 * @param {Database} records.database
 * @param {string} records.tableName
 * @param {Clause} records.condition
 * @returns {Promise<Model[]>}
 */
export const retrieveRecords = <T extends Model>({database, tableName, condition}: RetrieveRecordsArgs) => {
    return database.collections.get<T>(tableName).query(condition).fetch();
};

export function isHasManyAssociation(associated: AssociationInfo) {
    return associated.type === 'has_many' && 'foreignKey' in associated;
}

/**
 * prepareDestroyPermanentlyAssociatedRecords: prepares children associated records
 * for permanent deletion
 * @param {Model[]} records
 * @returns {Promise<Model[]>}
 */
export const prepareDestroyPermanentlyChildrenAssociatedRecords = async (records: Model[]): Promise<Model[]> => {
    const associationPromises: Array<Promise<Model[]>> = [];

    const recordsByTable = records.reduce((acc, record) => {
        const tableName = (record.constructor as typeof Model).table;
        if (!acc[tableName]) {
            acc[tableName] = [];
        }
        acc[tableName].push(record);
        return acc;
    }, {} as Record<string, Model[]>);

    for (const groupedRecords of Object.values(recordsByTable)) {
        const associations = (groupedRecords[0].constructor as typeof Model).associations;

        const promises = Object.entries(associations).
            filter(([, associated]) => isHasManyAssociation(associated)).
            map(async ([associationName, associated]) => {
                const preparedRecords: Model[] = [];
                const child = associated as HasManyAssociation; // this is a guard as we know that we are in a has_many association
                const relatedRecords = await retrieveRecords({
                    database: groupedRecords[0].database,
                    tableName: associationName,
                    condition: Q.where(child.foreignKey, Q.oneOf(groupedRecords.map((r) => r.id))),
                });

                const childPreparedRecords = await prepareDestroyPermanentlyChildrenAssociatedRecords(relatedRecords);
                preparedRecords.push(...childPreparedRecords);
                preparedRecords.push(...relatedRecords.map((relatedRecord) => relatedRecord.prepareDestroyPermanently()));
                return preparedRecords;
            });

        associationPromises.push(...promises);
    }

    const results = await Promise.all(associationPromises);
    return results.flat();
};
