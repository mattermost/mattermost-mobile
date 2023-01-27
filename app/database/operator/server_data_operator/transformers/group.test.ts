// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {OperationType} from '@constants/database';
import {transformGroupRecord} from '@database/operator/server_data_operator/transformers/group';
import {createTestConnection} from '@database/operator/utils/create_test_connection';

describe('*** GROUP Prepare Records Test ***', () => {
    it('=> transformGroupRecord: should return an array of type GroupModel', async () => {
        // expect.assertions(3);

        const database = await createTestConnection({databaseName: 'group_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformGroupRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'kow9j1ttnxwig7tnqgebg7dtipno',
                    display_name: 'Test',
                    name: 'recent',
                    source: 'custom',
                    remote_id: 'custom',
                    member_count: 10,
                } as Group,
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords.collection.table).toBe('Group');
    });
});
