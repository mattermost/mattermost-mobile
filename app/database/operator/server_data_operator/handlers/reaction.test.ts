// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('*** Operator: User Handlers tests ***', () => {
    let operator: ServerDataOperator;

    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com']!.operator;
    });

    it('=> HandleReactions: should write to Reactions table', async () => {
        expect.assertions(2);

        const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
        const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

        await operator.handleReactions({
            postsReactions: [{
                post_id: '4r9jmr7eqt8dxq3f9woypzurry',
                reactions: [
                    {
                        create_at: 1608263728086,
                        emoji_name: 'p4p1',
                        post_id: '4r9jmr7eqt8dxq3f9woypzurry',
                        user_id: 'ooumoqgq3bfiijzwbn8badznwc',
                    },
                ],
            }],
            prepareRecordsOnly: false,
        });

        // Called twice:  Once for Reaction record
        expect(spyOnPrepareRecords).toHaveBeenCalledTimes(1);

        // Only one batch operation for both tables
        expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
    });
});
