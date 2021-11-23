// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {transformCategoryRecord} from '@database/operator/server_data_operator/transformers/category';
import {createTestConnection} from '@database/operator/utils/create_test_connection';
import {OperationType} from '@typings/database/enums';

describe('*** Category Prepare Records Test ***', () => {
    it('=> transformCategoryRecord: should return an array of type Category', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'category_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformCategoryRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'category-id',
                } as Category,
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords.collection.modelClass.name).toBe('CategoryModel');
    });
});
