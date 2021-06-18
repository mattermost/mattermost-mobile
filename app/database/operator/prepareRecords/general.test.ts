// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {
    prepareAppRecord,
    prepareCustomEmojiRecord,
    prepareGlobalRecord,
    prepareRoleRecord,
    prepareServersRecord,
    prepareSystemRecord,
    prepareTermsOfServiceRecord,
} from '@database/operator/prepareRecords/general';
import {createTestConnection} from '@database/operator/utils/create_test_connection';
import {OperationType} from '@typings/database/enums';

jest.mock('@database/manager');

describe('*** Isolated Prepare Records Test ***', () => {
    let databaseManagerClient: DatabaseManager;

    beforeAll(async () => {
        databaseManagerClient = new DatabaseManager();
    });

    it('=> prepareAppRecord: should return an array of type App', async () => {
        expect.assertions(3);

        const database = await databaseManagerClient.getDefaultDatabase();
        expect(database).toBeTruthy();

        const preparedRecords = await prepareAppRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    build_number: 'build-7',
                    created_at: 1,
                    version_number: 'v-1',
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('App');
    });

    it('=> prepareGlobalRecord: should return an array of type Global', async () => {
        expect.assertions(3);

        const database = await databaseManagerClient.getDefaultDatabase();
        expect(database).toBeTruthy();

        const preparedRecords = await prepareGlobalRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {name: 'g-n1', value: 'g-v1'},
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('Global');
    });

    it('=> prepareServersRecord: should return an array of type Servers', async () => {
        expect.assertions(3);

        const database = await databaseManagerClient.getDefaultDatabase();
        expect(database).toBeTruthy();

        const preparedRecords = await prepareServersRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    db_path: 'mm-server',
                    display_name: 's-displayName',
                    mention_count: 1,
                    unread_count: 0,
                    url: 'https://community.mattermost.com',
                    isSecured: true,
                    lastActiveAt: 1623926359,
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('Servers');
    });

    it('=> prepareRoleRecord: should return an array of type Role', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'isolated_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await prepareRoleRecord({
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
        expect(preparedRecords!.collection.modelClass.name).toBe('Role');
    });

    it('=> prepareSystemRecord: should return an array of type System', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'isolated_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await prepareSystemRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {id: 'system-1', name: 'system-name-1', value: 'system'},
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('System');
    });

    it('=> prepareTermsOfServiceRecord: should return an array of type TermsOfService', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'isolated_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await prepareTermsOfServiceRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    id: 'tos-1',
                    accepted_at: 1,
                    create_at: 1613667352029,
                    user_id: 'user1613667352029',
                    text: '',
                },
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toBe('TermsOfService');
    });

    it('=> prepareCustomEmojiRecord: should return an array of type CustomEmoji', async () => {
        expect.assertions(3);

        const database = await createTestConnection({databaseName: 'isolated_prepare_records', setActive: true});
        expect(database).toBeTruthy();

        const preparedRecords = await prepareCustomEmojiRecord({
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
        expect(preparedRecords!.collection.modelClass.name).toBe('CustomEmoji');
    });
});
