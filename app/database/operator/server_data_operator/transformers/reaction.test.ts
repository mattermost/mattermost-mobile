// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {OperationType} from '@constants/database';
import {transformReactionRecord} from '@database/operator/server_data_operator/transformers/reaction';
import {createTestConnection} from '@database/operator/utils/create_test_connection';

describe('*** REACTION Prepare Records Test ***', () => {
    it('=> transformReactionRecord: should return an array of type Reaction', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'reaction_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformReactionRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'ps81iqbddesfby8jayz7owg4yypoo',
                    user_id: 'q3mzxua9zjfczqakxdkowc6u6yy',
                    post_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                    emoji_name: 'thumbsup',
                    create_at: 1596032651748,
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.table).toBe('Reaction');
    });
});
