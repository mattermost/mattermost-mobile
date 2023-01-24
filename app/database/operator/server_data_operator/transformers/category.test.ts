// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {OperationType} from '@constants/database';
import {
    transformCategoryRecord,
    transformCategoryChannelRecord,
} from '@database/operator/server_data_operator/transformers/category';
import {createTestConnection} from '@database/operator/utils/create_test_connection';

describe('*** CATEGORY Prepare Records Test ***', () => {
    it('=> transformCategoryRecord: should return an array of type CategoryModel', async () => {
        // expect.assertions(3);

        const database = await createTestConnection({databaseName: 'category_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformCategoryRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'kow9j1ttnxwig7tnqgebg7dtipno',
                    display_name: 'Test',
                    sorting: 'recent',
                    sort_order: 0,
                    muted: false,
                    collapsed: false,
                    type: 'custom',
                    team_id: '',
                } as Category,
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords.collection.table).toBe('Category');
    });

    it('=> transformCategoryChannelRecord: should return an array of type CategoryChannelModel', async () => {
        // expect.assertions(3);

        const database = await createTestConnection({databaseName: 'category_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformCategoryChannelRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'team_id-channel_id',
                    category_id: 'kow9j1ttnxwig7tnqgebg7dtipno',
                    channel_id: 'channel_id',
                    sort_order: 0,
                } as CategoryChannel,
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords.collection.table).toBe('CategoryChannel');
    });
});
