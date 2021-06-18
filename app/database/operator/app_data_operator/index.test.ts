// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    isRecordAppEqualToRaw,
    isRecordGlobalEqualToRaw,
    isRecordServerEqualToRaw,
} from '@database/operator/app_data_operator/comparator';
import {
    transformAppRecord,
    transformGlobalRecord,
    transformServersRecord,
} from '@database/operator/app_data_operator/transformers';
import {RawGlobal, RawServers} from '@typings/database/database';
import {IsolatedEntities} from '@typings/database/enums';

describe('', () => {
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
            operator: transformAppRecord,
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
            operator: transformGlobalRecord,
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
            operator: transformServersRecord,
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
});
