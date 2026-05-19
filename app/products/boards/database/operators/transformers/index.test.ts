// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BOARDS_TABLES} from '@boards/constants/database';
import {transformBoardViewRecord} from '@boards/database/operators/transformers';
import {OperationType} from '@constants/database';
import {createTestConnection} from '@database/operator/utils/create_test_connection';

import type BoardViewModel from '@boards/types/database/models/board_view';

const {BOARD_VIEW} = BOARDS_TABLES;

describe('*** BOARDS Prepare Records Test ***', () => {
    describe('=> transformBoardViewRecord', () => {
        it('should prepare a create record for the BoardView table', async () => {
            expect.assertions(3);

            const database = await createTestConnection({databaseName: 'boards_view_create', setActive: true});
            expect(database).toBeTruthy();

            const preparedRecord = await transformBoardViewRecord({
                action: OperationType.CREATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
                        id: 'view1',
                        channel_id: 'channel1',
                        type: 'kanban',
                        creator_id: 'user1',
                        title: 'Roadmap',
                        description: 'Q3 roadmap view',
                        sort_order: 0,
                        props: {group_by: {field_id: 'field_status', columns: []}},
                        create_at: 1,
                        update_at: 1,
                        delete_at: 0,
                    },
                },
            });

            expect(preparedRecord).toBeTruthy();
            expect(preparedRecord!.collection.table).toBe(BOARD_VIEW);
        });

        it('should throw on non-create action without record', async () => {
            expect.assertions(2);

            const database = await createTestConnection({databaseName: 'boards_view_error', setActive: true});
            expect(database).toBeTruthy();

            expect(() => transformBoardViewRecord({
                action: OperationType.UPDATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
                        id: 'view1',
                        channel_id: 'channel1',
                        type: 'kanban',
                        creator_id: 'user1',
                        title: 'Roadmap',
                        sort_order: 0,
                        props: {},
                        create_at: 1,
                        update_at: 1,
                        delete_at: 0,
                    } as BoardView,
                },
            })).toThrow('Record not found for non create action');
        });

        it('should preserve existing fields when partial payload omits them', async () => {
            expect.assertions(1);

            const existing = {
                id: 'view1',
                channelId: 'channel1',
                type: 'kanban',
                creatorId: 'user1',
                title: 'Roadmap',
                description: 'Original',
                sortOrder: 2,
                props: {colorBy: 'status'},
                createAt: 1,
                updateAt: 1,
                deleteAt: 0,
            };

            const mockRecord = {
                ...existing,
                _raw: {},
                prepareUpdate: jest.fn().mockImplementation((cb) => {
                    cb();
                    return mockRecord;
                }),
                collection: {table: BOARD_VIEW},
            } as unknown as BoardViewModel;

            // Only title changes in partial payload.
            await transformBoardViewRecord({
                action: OperationType.UPDATE,
                database: {} as never,
                value: {
                    record: mockRecord,
                    raw: {id: 'view1', title: 'New title'} as BoardView,
                },
            });

            expect(mockRecord.description).toBe('Original');
        });
    });
});
