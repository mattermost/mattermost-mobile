// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import type {Model} from '@nozbe/watermelondb';
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
