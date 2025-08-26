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
    let spyOnHandleRecords: jest.SpyInstance;
    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com']!.operator;
        spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        DatabaseManager.destroyServerDatabase('baseHandler.test.com');
    });

    describe('handleCategories', () => {
        it('should write to the CATEGORY table', async () => {
            expect.assertions(2);

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
    });

    describe('handleCategoryChannels', () => {
        const categoryChannels: CategoryChannel[] = [
            {
                id: 'team_id-channel_id',
                category_id: 'kjlw9j1ttnxwig7tnqgebg7dtipno',
                channel_id: 'channel-id',
                sort_order: 1,
            },
        ];

        it('should write to the CATEGORY_CHANNEL table', async () => {
            expect.assertions(2);

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

        it('should not update an existing record if no changes are made', async () => {

            await operator.handleCategoryChannels({
                categoryChannels,
                prepareRecordsOnly: false,
            });

            expect(spyOnHandleRecords).not.toHaveBeenCalled();
        });

        it('should update an existing record if changes are made', async () => {

            await operator.handleCategoryChannels({
                categoryChannels: [
                    {
                        ...categoryChannels[0],
                        sort_order: 2,
                    },
                ],
                prepareRecordsOnly: false,
            });

            expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
            expect(spyOnHandleRecords).toHaveBeenCalledWith(expect.objectContaining({
                createOrUpdateRawValues: [
                    expect.objectContaining({
                        sort_order: 2,
                    }),
                ],
            }), 'handleCategoryChannels');
        });

        it('should not update when missing id', async () => {

            const result = await operator.handleCategoryChannels({
                categoryChannels: [
                    {
                        ...categoryChannels[0],
                        id: undefined,
                    },
                ],
                prepareRecordsOnly: false,
            });

            expect(spyOnHandleRecords).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should return empty array when no category channels are provided', async () => {
            const result = await operator.handleCategoryChannels({
                categoryChannels: undefined,
                prepareRecordsOnly: false,
            });

            expect(result).toEqual([]);
        });
    });
});
