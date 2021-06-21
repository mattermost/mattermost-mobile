// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {
    isRecordInfoEqualToRaw,
    isRecordGlobalEqualToRaw,
    isRecordServerEqualToRaw,
} from '@database/operator/app_data_operator/comparator';
import {
    transformAppRecord,
    transformGlobalRecord,
    transformServersRecord,
} from '@database/operator/app_data_operator/transformers';
import {RawGlobal, RawServers} from '@typings/database/database';

describe('** APP DATA OPERATOR **', () => {
    beforeAll(async () => {
        await DatabaseManager.init([]);
    });

    it('=> HandleApp: should write to APP entity', async () => {
        const appDatabase = DatabaseManager.appDatabase?.database;
        const appOperator = DatabaseManager.appDatabase?.operator;
        expect(appDatabase).toBeTruthy();
        expect(appOperator).toBeTruthy();

        const spyOnHandleEntityRecords = jest.spyOn(appOperator as any, 'handleEntityRecords');

        await appOperator?.handleInfo({
            info: [
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
            transformer: transformAppRecord,
            findMatchingRecordBy: isRecordInfoEqualToRaw,
            createOrUpdateRawValues: [
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
            tableName: 'Info',
            prepareRecordsOnly: false,
        });
    });

    it('=> HandleGlobal: should write to GLOBAL entity', async () => {
        const appDatabase = DatabaseManager.appDatabase?.database;
        const appOperator = DatabaseManager.appDatabase?.operator;
        expect(appDatabase).toBeTruthy();
        expect(appOperator).toBeTruthy();

        const spyOnHandleEntityRecords = jest.spyOn(appOperator as any, 'handleEntityRecords');
        const global: RawGlobal[] = [{name: 'global-1-name', value: 'global-1-value'}];

        await appOperator?.handleGlobal({
            global,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            findMatchingRecordBy: isRecordGlobalEqualToRaw,
            fieldName: 'name',
            transformer: transformGlobalRecord,
            createOrUpdateRawValues: global,
            tableName: 'Global',
            prepareRecordsOnly: false,
        });
    });

    it('=> HandleServers: should write to SERVERS entity', async () => {
        const appDatabase = DatabaseManager.appDatabase?.database;
        const appOperator = DatabaseManager.appDatabase?.operator;
        expect(appDatabase).toBeTruthy();
        expect(appOperator).toBeTruthy();

        const spyOnHandleEntityRecords = jest.spyOn(appOperator as any, 'handleEntityRecords');

        const servers: RawServers[] = [
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

        await appOperator?.handleServers({
            servers,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleEntityRecords).toHaveBeenCalledWith({
            fieldName: 'url',
            transformer: transformServersRecord,
            findMatchingRecordBy: isRecordServerEqualToRaw,
            createOrUpdateRawValues: [
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
            tableName: 'Servers',
            prepareRecordsOnly: false,
        });
    });
});
