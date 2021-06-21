// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {
    transformInfoRecord,
    transformGlobalRecord,
    transformServersRecord,
} from '@database/operator/app_data_operator/transformers/index';
import {OperationType} from '@typings/database/enums';

describe('** APP DATA TRANSFORMER **', () => {
    beforeAll(async () => {
        await DatabaseManager.init([]);
    });

    it('=> transformServersRecord: should return an array of type Servers', async () => {
        expect.assertions(3);

        const database = DatabaseManager.appDatabase?.database;
        expect(database).toBeTruthy();

        const preparedRecords = await transformServersRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    db_path: 'mm-server',
                    display_name: 's-displayName',
                    mention_count: 1,
                    unread_count: 0,
                    url: 'https://community.mattermost.com',
                    isSecured: true,
                    lastActiveAt: 1623926359,
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('Servers');
    });

    it('=> transformInfoRecord: should return an array of type Info', async () => {
        expect.assertions(3);

        const database = DatabaseManager.appDatabase?.database;
        expect(database).toBeTruthy();

        const preparedRecords = await transformInfoRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    build_number: 'build-7',
                    created_at: 1,
                    version_number: 'v-1',
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('Info');
    });

    it('=> transformGlobalRecord: should return an array of type Global', async () => {
        expect.assertions(3);

        const database = DatabaseManager.appDatabase?.database;
        expect(database).toBeTruthy();

        const preparedRecords = await transformGlobalRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {name: 'g-n1', value: 'g-v1'},
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('Global');
    });
});
