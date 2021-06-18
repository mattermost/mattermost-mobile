// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DataOperatorException from '@database/exceptions/data_operator_exception';
import DatabaseManager from '@database/manager';
import Operator from '@database/operator';
import {
    isRecordAppEqualToRaw,
    isRecordCustomEmojiEqualToRaw,
    isRecordGlobalEqualToRaw,
    isRecordRoleEqualToRaw,
    isRecordServerEqualToRaw,
    isRecordSystemEqualToRaw,
    isRecordTermsOfServiceEqualToRaw,
} from '@database/operator/comparators';
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
import {RawGlobal, RawRole, RawServers, RawTermsOfService} from '@typings/database/database';
import {DatabaseType, IsolatedEntities} from '@typings/database/enums';

jest.mock('@database/manager');

/* eslint-disable  @typescript-eslint/no-explicit-any */

describe('*** DataOperator: Base Handlers tests ***', () => {
    let databaseManagerClient: DatabaseManager;
    let operatorClient: Operator;

    beforeAll(async () => {
        databaseManagerClient = new DatabaseManager();
        const database = await databaseManagerClient.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            configs: {
                actionsEnabled: true,
                dbName: 'base_handler',
                dbType: DatabaseType.SERVER,
                serverUrl: 'baseHandler.test.com',
            },
        });

        operatorClient = new Operator(database!);
    });

    it('=> HandleApp: should write to APP entity', async () => {
        expect.assertions(3);

        const defaultDatabase = await databaseManagerClient.getDefaultDatabase();
        expect(defaultDatabase).toBeTruthy();

        const spyOnHandleEntityRecords = jest.spyOn(operatorClient as any, 'handleEntityRecords');

        await operatorClient.handleIsolatedEntity({
            tableName: IsolatedEntities.APP,
            values: [
                {
                    build_number: 'build-10x',
                    created_at: 1,
                    version_number: 'version-10',
                },
                {
                    build_number: 'build-11y',
                    created_at: 1,
                    version_number: 'version-11',
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'version_number',
            operator: prepareAppRecord,
            findMatchingRecordBy: isRecordAppEqualToRaw,
            rawValues: [
                {
                    build_number: 'build-10x',
                    created_at: 1,
                    version_number: 'version-10',
                },
                {
                    build_number: 'build-11y',
                    created_at: 1,
                    version_number: 'version-11',
                },
            ],
            tableName: 'app',
            prepareRecordsOnly: false,
        });
    });

    it('=> HandleGlobal: should write to GLOBAL entity', async () => {
        expect.assertions(2);

        const defaultDatabase = await databaseManagerClient.getDefaultDatabase();
        expect(defaultDatabase).toBeTruthy();

        const spyOnHandleEntityRecords = jest.spyOn(operatorClient as any, 'handleEntityRecords');
        const values: RawGlobal[] = [{name: 'global-1-name', value: 'global-1-value'}];

        await operatorClient.handleIsolatedEntity({
            tableName: IsolatedEntities.GLOBAL,
            values,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            findMatchingRecordBy: isRecordGlobalEqualToRaw,
            fieldName: 'name',
            operator: prepareGlobalRecord,
            rawValues: values,
            tableName: 'global',
            prepareRecordsOnly: false,
        });
    });

    it('=> HandleServers: should write to SERVERS entity', async () => {
        expect.assertions(2);

        const defaultDatabase = await databaseManagerClient.getDefaultDatabase();
        expect(defaultDatabase).toBeTruthy();

        const spyOnHandleEntityRecords = jest.spyOn(operatorClient as any, 'handleEntityRecords');

        const values: RawServers[] = [
            {
                db_path: 'server.db',
                display_name: 'community',
                mention_count: 0,
                unread_count: 0,
                url: 'https://community.mattermost.com',
                isSecured: true,
                lastActiveAt: 1623926359,
            },
        ];

        await operatorClient.handleIsolatedEntity({
            tableName: IsolatedEntities.SERVERS,
            values,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'url',
            operator: prepareServersRecord,
            findMatchingRecordBy: isRecordServerEqualToRaw,
            rawValues: [
                {
                    db_path: 'server.db',
                    display_name: 'community',
                    mention_count: 0,
                    unread_count: 0,
                    url: 'https://community.mattermost.com',
                    isSecured: true,
                    lastActiveAt: 1623926359,
                },
            ],
            tableName: 'servers',
            prepareRecordsOnly: false,
        });
    });

    it('=> HandleRole: should write to ROLE entity', async () => {
        expect.assertions(1);

        await createTestConnection({databaseName: 'base_handler', setActive: true});

        const spyOnHandleEntityRecords = jest.spyOn(operatorClient as any, 'handleEntityRecords');

        const values: RawRole[] = [
            {
                id: 'custom-emoji-id-1',
                name: 'custom-emoji-1',
                permissions: ['custom-emoji-1'],
            },
        ];

        await operatorClient.handleIsolatedEntity({
            tableName: IsolatedEntities.ROLE,
            values,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            operator: prepareRoleRecord,
            findMatchingRecordBy: isRecordRoleEqualToRaw,
            rawValues: [
                {
                    id: 'custom-emoji-id-1',
                    name: 'custom-emoji-1',
                    permissions: ['custom-emoji-1'],
                },
            ],
            tableName: 'Role',
            prepareRecordsOnly: false,
        });
    });

    it('=> HandleCustomEmojis: should write to CUSTOM_EMOJI entity', async () => {
        expect.assertions(2);

        const spyOnHandleEntityRecords = jest.spyOn(operatorClient as any, 'handleEntityRecords');

        await createTestConnection({databaseName: 'base_handler', setActive: true});

        await operatorClient.handleIsolatedEntity({
            tableName: IsolatedEntities.CUSTOM_EMOJI,
            values: [
                {
                    id: 'i',
                    create_at: 1580913641769,
                    update_at: 1580913641769,
                    delete_at: 0,
                    creator_id: '4cprpki7ri81mbx8efixcsb8jo',
                    name: 'boomI',
                },
            ],
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            rawValues: [
                {
                    id: 'i',
                    create_at: 1580913641769,
                    update_at: 1580913641769,
                    delete_at: 0,
                    creator_id: '4cprpki7ri81mbx8efixcsb8jo',
                    name: 'boomI',
                },
            ],
            tableName: 'CustomEmoji',
            prepareRecordsOnly: false,
            findMatchingRecordBy: isRecordCustomEmojiEqualToRaw,
            operator: prepareCustomEmojiRecord,
        });
    });

    it('=> HandleSystem: should write to SYSTEM entity', async () => {
        expect.assertions(1);

        await createTestConnection({databaseName: 'base_handler', setActive: true});

        const spyOnHandleEntityRecords = jest.spyOn(operatorClient as any, 'handleEntityRecords');

        const values = [{id: 'system-id-1', name: 'system-1', value: 'system-1'}];

        await operatorClient.handleIsolatedEntity({
            tableName: IsolatedEntities.SYSTEM,
            values,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            findMatchingRecordBy: isRecordSystemEqualToRaw,
            fieldName: 'name',
            operator: prepareSystemRecord,
            rawValues: values,
            tableName: 'System',
            prepareRecordsOnly: false,
        });
    });

    it('=> HandleTermsOfService: should write to TERMS_OF_SERVICE entity', async () => {
        expect.assertions(1);

        await createTestConnection({databaseName: 'base_handler', setActive: true});

        const spyOnHandleEntityRecords = jest.spyOn(operatorClient as any, 'handleEntityRecords');

        const values: RawTermsOfService[] = [
            {
                id: 'tos-1',
                accepted_at: 1,
                create_at: 1613667352029,
                user_id: 'user1613667352029',
                text: '',
            },
        ];

        await operatorClient.handleIsolatedEntity({
            tableName: IsolatedEntities.TERMS_OF_SERVICE,
            values,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            findMatchingRecordBy: isRecordTermsOfServiceEqualToRaw,
            fieldName: 'id',
            operator: prepareTermsOfServiceRecord,
            rawValues: values,
            tableName: 'TermsOfService',
            prepareRecordsOnly: false,
        });
    });

    it('=> No table name: should not call executeInDatabase if tableName is invalid', async () => {
        expect.assertions(2);

        const defaultDatabase = await databaseManagerClient.getDefaultDatabase();
        expect(defaultDatabase).toBeTruthy();

        await expect(
            operatorClient.handleIsolatedEntity({
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                tableName: 'INVALID_TABLE_NAME',
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                values: [{id: 'tos-1', accepted_at: 1}],
            }),
        ).rejects.toThrow(DataOperatorException);
    });
});
