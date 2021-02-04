// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import App from '@typings/database/app';
import {OperationType} from '@typings/database/database';

/**
 * factoryApp :
 * @param {} db
 * @param {string} tableName
 * @param {any} value
 * @param {OperationType | undefined} opType
 * @returns {any}
 */
export const factoryApp = async ({db, optType, tableName, value}:{ db: Database, optType?: OperationType, tableName: string, value: any}) => {
    const generator = (app: App) => {
        app.buildNumber = value?.buildNumber ?? '';
        app.createdAt = value?.buildNumber ?? 0;
        app.versionNumber = value?.buildNumber ?? '';
        app._raw.id = value?.id ?? app.id;
    };

    if (optType === OperationType.UPDATE) {
        const appRecord = await db.collections.get(tableName).query(Q.where('id', value.id)).fetch() as App[];
        if (appRecord?.length) {
            const record = appRecord[0];
            return record.prepareUpdate(() => generator(record));
        }
    } else if (optType === OperationType.CREATE) {
        return db.collections.get(tableName).prepareCreate(generator);
    }

    return null;
};
