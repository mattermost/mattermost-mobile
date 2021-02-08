// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import {DataFactory} from '@typings/database/database';
import App from '@typings/database/app';

import {OperationType} from './index';

/**
 * operateAppRecord : Manufactures records ready for update/create of entity 'App' from the 'Default' database
 * @param {} db
 * @param {OperationType} optType
 * @param {string} tableName
 * @param {any} value
 * @returns {Promise<any>}
 */
export const operateAppRecord = async ({db, optType, tableName, value}: DataFactory) => {
    const generator = (app: App) => {
        app._raw.id = value?.id ?? app.id;
        app.buildNumber = value?.buildNumber ?? '';
        app.createdAt = value?.createdAt ?? 0;
        app.versionNumber = value?.buildNumber ?? '';
    };

    return operateBaseRecord({db, optType, tableName, value, generator});
};

/**
 * operateBaseRecord :  The 'id' of a record is key to this function. If WatermelonDB encounters an already existing
 * record during a CREATE operation, it silently fails the operation.  In our case, if we have an existing 'id', then
 * we'll update the record with the data.  For an UPDATE operation, we fetch the existing record using the passed 'id'
 * and then we do the update operation; if no record is found for that 'id', we'll create it.
 * @param {} db
 * @param {OperationType | undefined} optType
 * @param {string} tableName
 * @param {any} value
 * @param {((model: Model) => void)} generator
 * @returns {Promise<any>}
 */
const operateBaseRecord = async ({db, optType, tableName, value, generator}: DataFactory) => {
    if (optType === OperationType.UPDATE) {
        //FIXME : If an id does not exist, do we create the record ?
        const appRecord = await db.collections.get(tableName).query(Q.where('id', value.id)).fetch() as Model[];
        console.log('appRecord => ', appRecord);
        if (appRecord?.length) {
            const record = appRecord[0];
            return record.prepareUpdate(() => generator!(record));
        }
        return null;
    } else if (optType === OperationType.CREATE) {
        // FIXME : checks if the id does not already exist in the db; if it does, then perform and update and return with a callback.
        return db.collections.get(tableName).prepareCreate(generator);
    }

    return null;
};
