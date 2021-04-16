// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model from '@nozbe/watermelondb/Model';
import {DataFactoryArgs} from '@typings/database/database';
import {OperationType} from '@typings/database/enums';

/**
 * prepareBaseRecord:  This is the last step for each operator and depending on the 'action', it will either prepare an
 * existing record for UPDATE or prepare a collection for CREATE
 *
 * @param {DataFactoryArgs} operatorBase
 * @param {Database} operatorBase.database
 * @param {string} operatorBase.tableName
 * @param {RecordPair} operatorBase.value
 * @param {((DataFactoryArgs) => void)} operatorBase.generator
 * @returns {Promise<Model>}
 */
export const prepareBaseRecord = async ({
    action,
    database,
    tableName,
    value,
    generator,
}: DataFactoryArgs): Promise<Model> => {
    if (action === OperationType.UPDATE) {
        const record = value.record as Model;
        return record.prepareUpdate(() => generator!(record));
    }

    return database.collections.get(tableName!).prepareCreate(generator);
};
