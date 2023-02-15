// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {OperationType} from '@constants/database';
import DatabaseManager from '@database/manager';
import {
    transformInfoRecord,
    transformGlobalRecord,
} from '@database/operator/app_data_operator/transformers/index';

describe('** APP DATA TRANSFORMER **', () => {
    beforeAll(async () => {
        await DatabaseManager.init([]);
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
        expect(preparedRecords!.collection.table).toBe('Info');
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
                raw: {id: 'g-n1', value: 'g-v1'},
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.table).toBe('Global');
    });
});
