// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {transformBoardViewRecord} from '@database/operator/server_data_operator/transformers/boards';

import type ServerDataOperator from '@database/operator/server_data_operator';

const {BOARD_VIEW} = MM_TABLES.SERVER;

describe('*** Operator: Boards Handlers tests ***', () => {
    let operator: ServerDataOperator;
    const serverUrl = `boardsHandler.test.${Date.now()}.com`;

    beforeAll(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('=> handleBoardViews', () => {
        it('should delegate to handleRecords with the board view transformer', async () => {
            expect.assertions(2);

            const spy = jest.spyOn(operator, 'handleRecords');
            const boardViews: BoardView[] = [{
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
            }];

            await operator.handleBoardViews({boardViews, prepareRecordsOnly: false});

            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith({
                fieldName: 'id',
                createOrUpdateRawValues: boardViews,
                tableName: BOARD_VIEW,
                prepareRecordsOnly: false,
                transformer: transformBoardViewRecord,
            }, 'handleBoardViews');
        });

        it('should return [] without calling handleRecords when boardViews is empty', async () => {
            expect.assertions(2);

            const spy = jest.spyOn(operator, 'handleRecords');
            const result = await operator.handleBoardViews({boardViews: [], prepareRecordsOnly: false});

            expect(result).toEqual([]);
            expect(spy).not.toHaveBeenCalled();
        });

        it('should return [] without calling handleRecords when boardViews is undefined', async () => {
            expect.assertions(2);

            const spy = jest.spyOn(operator, 'handleRecords');
            const result = await operator.handleBoardViews({prepareRecordsOnly: false});

            expect(result).toEqual([]);
            expect(spy).not.toHaveBeenCalled();
        });
    });
});
