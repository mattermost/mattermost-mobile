// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {License} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

import {observeIsMinimumLicenseTier, observeReportAProblemMetadata} from './system';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('expo-application', () => {
    return {
        nativeApplicationVersion: '1.2.3',
        nativeBuildVersion: '456',
    };
});

describe('observeReportAProblemMetadata', () => {
    const serverUrl = 'baseHandler.test.com';
    let database: Database;
    let operator: ServerDataOperator;
    let originalPlatform: typeof Platform.OS;
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
        originalPlatform = Platform.OS;

        // @ts-expect-error Platform.OS is mocked
        Platform.OS = 'somePlatform';
    });
    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        Platform.OS = originalPlatform;
    });

    it('should return correct metadata', (done) => {
        operator.handleConfigs({
            configs: [
                {id: 'Version', value: '7.8.0'},
                {id: 'BuildNumber', value: '123'},
            ],
            prepareRecordsOnly: false,
            configsToDelete: [],
        }).then(() => {
            operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', Compliance: 'true'}},
                    {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'user1'},
                    {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'team1'},
                ],
                prepareRecordsOnly: false,
            }).then(() => {
                observeReportAProblemMetadata(database).subscribe((data) => {
                    expect(data).toEqual({
                        currentUserId: 'user1',
                        currentTeamId: 'team1',
                        serverVersion: '7.8.0 (Build 123)',
                        appVersion: '1.2.3 (Build 456)',
                        appPlatform: 'somePlatform',
                    });
                    done();
                });
            });
        });
    });

    it('should handle empty or undefined values', (done) => {
        observeReportAProblemMetadata(database).subscribe((data) => {
            expect(data).toEqual({
                currentUserId: '',
                currentTeamId: '',
                serverVersion: 'Unknown (Build Unknown)',
                appVersion: '1.2.3 (Build 456)',
                appPlatform: 'somePlatform',
            });
            done();
        });
    });
});

describe('observeIsMinimumLicenseTier', () => {
    const serverUrl = 'baseHandler.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return false if no license is present', (done) => {
        operator.handleConfigs({configs: [
            {id: 'BuildEnterpriseReady', value: 'true'},
        ],
        prepareRecordsOnly: false,
        configsToDelete: []}).then(() => {
            observeIsMinimumLicenseTier(database, License.SKU_SHORT_NAME.Professional).subscribe((isMinimumTier) => {
                expect(isMinimumTier).toBe(false);
                done();
            });
        });
    });

    it('should return false if license tier is below the required tier', (done) => {
        operator.handleConfigs({configs: [
            {id: 'BuildEnterpriseReady', value: 'true'},
        ],
        prepareRecordsOnly: false,
        configsToDelete: []}).then(() => {
            operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.Starter}},
                ],
                prepareRecordsOnly: false,
            }).then(() => {
                observeIsMinimumLicenseTier(database, License.SKU_SHORT_NAME.Professional).subscribe((isMinimumTier) => {
                    expect(isMinimumTier).toBe(false);
                    done();
                });
            });
        });
    });

    it('should return true if license tier matches the required tier', (done) => {
        operator.handleConfigs({configs: [
            {id: 'BuildEnterpriseReady', value: 'true'},
        ],
        prepareRecordsOnly: false,
        configsToDelete: []}).then(() => {
            operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.Professional}},
                ],
                prepareRecordsOnly: false,
            }).then(() => {
                observeIsMinimumLicenseTier(database, License.SKU_SHORT_NAME.Professional).subscribe((isMinimumTier) => {
                    expect(isMinimumTier).toBe(true);
                    done();
                });
            });
        });
    });

    it('should return true if license tier is above the required tier', (done) => {
        operator.handleConfigs({configs: [
            {id: 'BuildEnterpriseReady', value: 'true'},
        ],
        prepareRecordsOnly: false,
        configsToDelete: []}).then(() => {
            operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.Enterprise}},
                ],
                prepareRecordsOnly: false,
            }).then(() => {
                observeIsMinimumLicenseTier(database, License.SKU_SHORT_NAME.Professional).subscribe((isMinimumTier) => {
                    expect(isMinimumTier).toBe(true);
                    done();
                });
            });
        });
    });

    it('should return false if BuildEnterpriseReady is false', (done) => {
        operator.handleConfigs({
            configs: [
                {id: 'BuildEnterpriseReady', value: 'false'},
            ],
            prepareRecordsOnly: false,
            configsToDelete: [],
        }).then(() => {
            operator.handleSystem({
                systems: [
                    {id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: 'Professional'}},
                ],
                prepareRecordsOnly: false,
            }).then(() => {
                observeIsMinimumLicenseTier(database, 'Professional').subscribe((isMinimumTier) => {
                    expect(isMinimumTier).toBe(false);
                    done();
                });
            });
        });
    });
});
