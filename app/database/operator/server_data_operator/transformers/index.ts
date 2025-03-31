// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {OperationType} from '@constants/database';

import type Model from '@nozbe/watermelondb/Model';
import type {PrepareBaseRecordArgs} from '@typings/database/database';

/**
 * prepareBaseRecord:  This is the last step for each operator and depending on the 'action', it will either prepare an
 * existing record for UPDATE or prepare a collection for CREATE
 *
 * @param {TransformerArgs} operatorBase
 * @param {Database} operatorBase.database
 * @param {string} operatorBase.tableName
 * @param {RecordPair} operatorBase.value
 * @param {((PrepareBaseRecordArgs) => void)} operatorBase.generator
 * @returns {Promise<Model>}
 */
export const prepareBaseRecord = async <T extends Model, R extends RawValue>({
    action,
    database,
    tableName,
    value,
    fieldsMapper,
}: PrepareBaseRecordArgs<T, R>) => {
    if (action === OperationType.UPDATE) {
        const record = value.record!;
        return record.prepareUpdate(() => fieldsMapper(record));
    }

    return database.collections.get<T>(tableName!).prepareCreate(fieldsMapper);
};
