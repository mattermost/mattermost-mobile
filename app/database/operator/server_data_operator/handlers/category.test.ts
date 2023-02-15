// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {
    transformCategoryRecord,
    transformCategoryChannelRecord,
} from '@database/operator/server_data_operator/transformers/category';

import type ServerDataOperator from '..';

describe('*** Operator: Category Handlers tests ***', () => {
    let operator: ServerDataOperator;
    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com']!.operator;
    });

    it('=> handleCategories: should write to the CATEGORY table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const categories: Category[] = [
            {
                id: 'kjlw9j1ttnxwig7tnqgebg7dtipno',
                collapsed: false,
                display_name: 'Test',
                muted: false,
                sort_order: 1,
                sorting: 'recent',
                team_id: '',
                type: 'direct_messages',
            },
        ];

        await operator.handleCategories({
            categories,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: categories,
            tableName: MM_TABLES.SERVER.CATEGORY,
            prepareRecordsOnly: false,
            transformer: transformCategoryRecord,
        }, 'handleCategories');
    });

    it('=> handleCategoryChannels: should write to the CATEGORY_CHANNEL table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const categoryChannels: CategoryChannel[] = [
            {
                id: 'team_id-channel_id',
                category_id: 'kjlw9j1ttnxwig7tnqgebg7dtipno',
                channel_id: 'channel-id',
                sort_order: 1,
            },
        ];

        await operator.handleCategoryChannels({
            categoryChannels,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: categoryChannels,
            tableName: MM_TABLES.SERVER.CATEGORY_CHANNEL,
            prepareRecordsOnly: false,
            transformer: transformCategoryChannelRecord,
        }, 'handleCategoryChannels');
    });
});
