// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {OperationType} from '@constants/database';
import {
    transformCustomEmojiRecord,
    transformFileRecord,
    transformRoleRecord,
    transformSystemRecord,
} from '@database/operator/server_data_operator/transformers/general';
import {createTestConnection} from '@database/operator/utils/create_test_connection';

describe('*** Role Prepare Records Test ***', () => {
    it('=> transformRoleRecord: should return an array of type Role', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'isolated_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformRoleRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'role-1',
                    name: 'role-name-1',
                    permissions: [],
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.table).toBe('Role');
    });
});

describe('*** System Prepare Records Test ***', () => {
    it('=> transformSystemRecord: should return an array of type System', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'isolated_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformSystemRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {id: 'system-1', value: 'system'},
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.table).toBe('System');
    });
});

describe('*** CustomEmoj Prepare Records Test ***', () => {
    it('=> transformCustomEmojiRecord: should return an array of type CustomEmoji', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'isolated_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformCustomEmojiRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'i',
                    create_at: 1580913641769,
                    update_at: 1580913641769,
                    delete_at: 0,
                    creator_id: '4cprpki7ri81mbx8efixcsb8jo',
                    name: 'boomI',
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.table).toBe('CustomEmoji');
    });
});

describe('*** Files Prepare Records Test ***', () => {
    it('=> transformFileRecord: should return an array of type File', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'post_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await transformFileRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'file-id',
                    post_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                    name: 'test_file',
                    extension: '.jpg',
                    has_preview_image: true,
                    mime_type: 'image/jpeg',
                    size: 1000,
                    create_at: 1609253011321,
                    delete_at: 1609253011321,
                    height: 20,
                    width: 20,
                    update_at: 1609253011321,
                    user_id: 'wqyby5r5pinxxdqhoaomtacdhc',
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.table).toBe('File');
    });
});
