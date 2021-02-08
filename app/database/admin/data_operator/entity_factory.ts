// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import {DataFactory} from '@typings/database/database';
import App from '@typings/database/app';

import {OperationType} from './index';

/**
 * factoryApp : Manufactures records ready for update/create of entity 'App' from the 'Default' database
 * @param {} db
 * @param {OperationType} optType
 * @param {string} tableName
 * @param {any} value
 * @returns {Promise<any>}
 */
export const factoryApp = async ({db, optType, tableName, value}: DataFactory) => {
    const generator = (app: App) => {
        app._raw.id = value?.id ?? app.id;
        app.buildNumber = value?.buildNumber ?? '';
        app.createdAt = value?.createdAt ?? 0;
        app.versionNumber = value?.buildNumber ?? '';
    };

    return factoryEntity({db, optType, tableName, value, generator});
};

/**
 *
 * @param {} db
 * @param {OperationType | undefined} optType
 * @param {string} tableName
 * @param {any} value
 * @param {((model: Model) => void)} generator
 * @returns {Promise<any>}
 */
const factoryEntity = async ({db, optType, tableName, value, generator}: DataFactory) => {
    if (optType === OperationType.UPDATE) {
        const appRecord = await db.collections.get(tableName).query(Q.where('id', value.id)).fetch() as Model[];
        if (appRecord?.length) {
            const record = appRecord[0];
            return record.prepareUpdate(() => generator!(record));
        }
        return null;
    } else if (optType === OperationType.CREATE) {
        // FIXME : checks if the id does not already exist in the db; else it fails silently for arrays
        return db.collections.get(tableName).prepareCreate(generator);
    }

    return null;
};
