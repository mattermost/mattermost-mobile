// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {buildAppInfoKey} from '@database/operator/app_data_operator/comparator';
import {
    transformInfoRecord,
    transformGlobalRecord,
} from '@database/operator/app_data_operator/transformers';

describe('** APP DATA OPERATOR **', () => {
    beforeAll(async () => {
        await DatabaseManager.init([]);
    });

    it('=> HandleApp: should write to INFO table', async () => {
        const appDatabase = DatabaseManager.appDatabase?.database;
        const appOperator = DatabaseManager.appDatabase?.operator;
        expect(appDatabase).toBeTruthy();
        expect(appOperator).toBeTruthy();

        const spyOnHandleRecords = jest.spyOn(appOperator as any, 'handleRecords');

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

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'version_number',
            transformer: transformInfoRecord,
            buildKeyRecordBy: buildAppInfoKey,
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
        }, 'handleInfo');
    });

    it('=> HandleGlobal: should write to GLOBAL table', async () => {
        const appDatabase = DatabaseManager.appDatabase?.database;
        const appOperator = DatabaseManager.appDatabase?.operator;
        expect(appDatabase).toBeTruthy();
        expect(appOperator).toBeTruthy();

        const spyOnHandleRecords = jest.spyOn(appOperator as any, 'handleRecords');
        const globals: IdValue[] = [{id: 'global-1-name', value: 'global-1-value'}];

        await appOperator?.handleGlobal({
            globals,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            transformer: transformGlobalRecord,
            createOrUpdateRawValues: globals,
            tableName: 'Global',
            prepareRecordsOnly: false,
        }, 'handleGlobal');
    });
});
