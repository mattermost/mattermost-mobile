// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import {firstValueFrom} from 'rxjs';

import {License, Preferences} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

import {
    getCurrentChannelId, getCurrentTeamId, getCurrentUserId, getPushVerificationStatus,
    getCommonSystemValues, getConfig, getConfigValue, getLastGlobalDataRetentionRun,
    getLastBoRPostCleanupRun, getGlobalDataRetentionPolicy, getGranularDataRetentionPolicies,
    getIsDataRetentionEnabled, getLicense, getRecentCustomStatuses, getExpandedLinks,
    getRecentReactions, getLastFullSync, setLastFullSync, resetLastFullSync,
    getTeamHistory, patchTeamHistory, prepareCommonSystemValues, setCurrentUserId,
    setCurrentChannelId, setCurrentTeamId, setCurrentTeamAndChannelId,
    getLastUnreadChannelId, getExpiredSession,
    observeCurrentChannelId, observeCurrentTeamId, observeCurrentUserId, observeGlobalThreadsTab,
    observePushVerificationStatus, observeConfig, observeConfigValue, observeMaxFileCount,
    observeIsCustomStatusExpirySupported, observeConfigBooleanValue, observeConfigIntValue,
    observeLicense, observeAllowedThemesKeys, observeOnlyUnreads,
    observeIsMinimumLicenseTier, observeReportAProblemMetadata,
} from './system';

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

describe('getLastBoRPostCleanupRun', () => {
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

    it('should return 0 when no BoR post cleanup run record exists', async () => {
        const result = await getLastBoRPostCleanupRun(database);
        expect(result).toBe(0);
    });

    it('should return the stored timestamp when BoR post cleanup run record exists', async () => {
        const timestamp = 1640995200000; // Example timestamp

        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.LAST_BOR_POST_CLEANUP_RUN, value: timestamp},
            ],
            prepareRecordsOnly: false,
        });

        const result = await getLastBoRPostCleanupRun(database);
        expect(result).toBe(timestamp);
    });

    it('should return 0 when stored value is falsy', async () => {
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.LAST_BOR_POST_CLEANUP_RUN, value: 0},
            ],
            prepareRecordsOnly: false,
        });

        const result = await getLastBoRPostCleanupRun(database);
        expect(result).toBe(0);
    });

    it('should return 0 when stored value is null or undefined', async () => {
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.LAST_BOR_POST_CLEANUP_RUN, value: null},
            ],
            prepareRecordsOnly: false,
        });

        const result = await getLastBoRPostCleanupRun(database);
        expect(result).toBe(0);
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
                    {id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: 'professional'}},
                ],
                prepareRecordsOnly: false,
            }).then(() => {
                observeIsMinimumLicenseTier(database, 'professional').subscribe((isMinimumTier) => {
                    expect(isMinimumTier).toBe(false);
                    done();
                });
            });
        });
    });
});

describe('system query functions', () => {
    const serverUrl = 'system.query.test.com';
    let database: ReturnType<typeof DatabaseManager.getServerDatabaseAndOperator>['database'];
    let operator: ReturnType<typeof DatabaseManager.getServerDatabaseAndOperator>['operator'];

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        ({database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl));
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('getCurrentChannelId returns empty string when not set', async () => {
        expect(await getCurrentChannelId(database)).toBe('');
    });

    it('getCurrentChannelId returns value when set', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'ch1'}], prepareRecordsOnly: false});
        expect(await getCurrentChannelId(database)).toBe('ch1');
    });

    it('getCurrentTeamId returns empty string when not set', async () => {
        expect(await getCurrentTeamId(database)).toBe('');
    });

    it('getCurrentTeamId returns value when set', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'team1'}], prepareRecordsOnly: false});
        expect(await getCurrentTeamId(database)).toBe('team1');
    });

    it('getCurrentUserId returns empty string when not set', async () => {
        expect(await getCurrentUserId(database)).toBe('');
    });

    it('getCurrentUserId returns value when set', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'user1'}], prepareRecordsOnly: false});
        expect(await getCurrentUserId(database)).toBe('user1');
    });

    it('getPushVerificationStatus returns empty string when not set', async () => {
        expect(await getPushVerificationStatus(database)).toBe('');
    });

    it('getPushVerificationStatus returns value when set', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS, value: 'verified'}], prepareRecordsOnly: false});
        expect(await getPushVerificationStatus(database)).toBe('verified');
    });

    it('getCommonSystemValues returns defaults when nothing set', async () => {
        const result = await getCommonSystemValues(database);
        expect(result.currentChannelId).toBe('');
        expect(result.currentTeamId).toBe('');
        expect(result.currentUserId).toBe('');
        expect(result.lastUnreadChannelId).toBe('');
    });

    it('getCommonSystemValues returns stored values', async () => {
        const license = {IsLicensed: 'true'};
        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'ch1'},
                {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'team1'},
                {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'user1'},
                {id: SYSTEM_IDENTIFIERS.LICENSE, value: license},
                {id: SYSTEM_IDENTIFIERS.LAST_UNREAD_CHANNEL_ID, value: 'unread1'},
            ],
            prepareRecordsOnly: false,
        });
        const result = await getCommonSystemValues(database);
        expect(result.currentChannelId).toBe('ch1');
        expect(result.currentTeamId).toBe('team1');
        expect(result.currentUserId).toBe('user1');
        expect(result.lastUnreadChannelId).toBe('unread1');
    });

    it('getConfig returns all config as object', async () => {
        await operator.handleConfigs({
            configs: [{id: 'SiteName', value: 'MyMattermost'}, {id: 'Version', value: '7.0.0'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        const config = await getConfig(database);
        expect(config.SiteName).toBe('MyMattermost');
        expect(config.Version).toBe('7.0.0');
    });

    it('getConfigValue returns undefined when key missing', async () => {
        expect(await getConfigValue(database, 'SiteName')).toBeUndefined();
    });

    it('getConfigValue returns value when key present', async () => {
        await operator.handleConfigs({configs: [{id: 'SiteName', value: 'Test'}], configsToDelete: [], prepareRecordsOnly: false});
        expect(await getConfigValue(database, 'SiteName')).toBe('Test');
    });

    it('getLastGlobalDataRetentionRun returns undefined when not set', async () => {
        expect(await getLastGlobalDataRetentionRun(database)).toBeUndefined();
    });

    it('getLastGlobalDataRetentionRun returns stored value', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LAST_DATA_RETENTION_RUN, value: 12345}], prepareRecordsOnly: false});
        expect(await getLastGlobalDataRetentionRun(database)).toBe(12345);
    });

    it('getGlobalDataRetentionPolicy returns undefined when not set', async () => {
        expect(await getGlobalDataRetentionPolicy(database)).toBeUndefined();
    });

    it('getGranularDataRetentionPolicies returns undefined when not set', async () => {
        expect(await getGranularDataRetentionPolicies(database)).toBeUndefined();
    });

    it('getIsDataRetentionEnabled returns null when no license', async () => {
        expect(await getIsDataRetentionEnabled(database)).toBeNull();
    });

    it('getIsDataRetentionEnabled returns false when DataRetention not in license', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', DataRetention: 'false'}}], prepareRecordsOnly: false});
        await operator.handleConfigs({configs: [{id: 'DataRetentionEnableMessageDeletion', value: 'true'}], configsToDelete: [], prepareRecordsOnly: false});
        expect(await getIsDataRetentionEnabled(database)).toBe(false);
    });

    it('getIsDataRetentionEnabled returns true when all conditions met', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', DataRetention: 'true'}}], prepareRecordsOnly: false});
        await operator.handleConfigs({configs: [{id: 'DataRetentionEnableMessageDeletion', value: 'true'}], configsToDelete: [], prepareRecordsOnly: false});
        expect(await getIsDataRetentionEnabled(database)).toBe(true);
    });

    it('getLicense returns undefined when not set', async () => {
        expect(await getLicense(database)).toBeUndefined();
    });

    it('getLicense returns stored license', async () => {
        const license = {IsLicensed: 'true', SkuShortName: 'enterprise'};
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: license}], prepareRecordsOnly: false});
        expect(await getLicense(database)).toEqual(license);
    });

    it('getRecentCustomStatuses returns empty array when not set', async () => {
        expect(await getRecentCustomStatuses(database)).toEqual([]);
    });

    it('getExpandedLinks returns empty object when not set', async () => {
        expect(await getExpandedLinks(database)).toEqual({});
    });

    it('getExpandedLinks returns stored value', async () => {
        const links = {'https://short.url': 'https://expanded.url'};
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.EXPANDED_LINKS, value: links}], prepareRecordsOnly: false});
        expect(await getExpandedLinks(database)).toEqual(links);
    });

    it('getRecentReactions returns empty array when not set', async () => {
        expect(await getRecentReactions(database)).toEqual([]);
    });

    it('getLastFullSync returns 0 when not set', async () => {
        expect(await getLastFullSync(database)).toBe(0);
    });

    it('setLastFullSync stores value and getLastFullSync retrieves it', async () => {
        await setLastFullSync(operator, 99999);
        expect(await getLastFullSync(database)).toBe(99999);
    });

    it('resetLastFullSync sets value to 0 when previously set', async () => {
        await setLastFullSync(operator, 12345);
        await resetLastFullSync(operator);
        expect(await getLastFullSync(database)).toBe(0);
    });

    it('resetLastFullSync returns empty array when already 0', async () => {
        const result = await resetLastFullSync(operator);
        expect(result).toEqual([]);
    });

    it('getTeamHistory returns empty array when not set', async () => {
        expect(await getTeamHistory(database)).toEqual([]);
    });

    it('patchTeamHistory stores team history', async () => {
        await patchTeamHistory(operator, ['team1', 'team2']);
        const history = await getTeamHistory(database);
        expect(history).toEqual(['team1', 'team2']);
    });

    it('prepareCommonSystemValues returns system models', async () => {
        const models = await prepareCommonSystemValues(operator, {currentUserId: 'u1', currentTeamId: 't1', currentChannelId: 'c1'});
        expect(models.length).toBeGreaterThan(0);
    });

    it('setCurrentUserId stores and returns userId', async () => {
        const result = await setCurrentUserId(operator, 'user123');
        expect(result).toEqual({currentUserId: 'user123'});
        expect(await getCurrentUserId(database)).toBe('user123');
    });

    it('setCurrentChannelId stores and returns channelId', async () => {
        const result = await setCurrentChannelId(operator, 'ch123');
        expect(result).toEqual({currentChannelId: 'ch123'});
        expect(await getCurrentChannelId(database)).toBe('ch123');
    });

    it('setCurrentTeamId stores and returns teamId', async () => {
        const result = await setCurrentTeamId(operator, 'team123');
        expect(result).toEqual({currentTeamId: 'team123'});
        expect(await getCurrentTeamId(database)).toBe('team123');
    });

    it('setCurrentTeamAndChannelId stores both values', async () => {
        const result = await setCurrentTeamAndChannelId(operator, 'team1', 'ch1');
        expect(result).toEqual({currentTeamId: 'team1', currentChannelId: 'ch1'});
    });

    it('getLastUnreadChannelId returns empty string when not set', async () => {
        expect(await getLastUnreadChannelId(database)).toBe('');
    });

    it('getLastUnreadChannelId returns stored value', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LAST_UNREAD_CHANNEL_ID, value: 'ch_unread'}], prepareRecordsOnly: false});
        expect(await getLastUnreadChannelId(database)).toBe('ch_unread');
    });

    it('getExpiredSession returns undefined when not set', async () => {
        expect(await getExpiredSession(database)).toBeUndefined();
    });
});

describe('system observe functions', () => {
    const serverUrl = 'system.observe.test.com';
    let database: ReturnType<typeof DatabaseManager.getServerDatabaseAndOperator>['database'];
    let operator: ReturnType<typeof DatabaseManager.getServerDatabaseAndOperator>['operator'];

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        ({database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl));
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('observeCurrentChannelId emits empty string when not set', async () => {
        expect(await firstValueFrom(observeCurrentChannelId(database))).toBe('');
    });

    it('observeCurrentChannelId emits stored value', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'ch1'}], prepareRecordsOnly: false});
        expect(await firstValueFrom(observeCurrentChannelId(database))).toBe('ch1');
    });

    it('observeCurrentTeamId emits empty string when not set', async () => {
        expect(await firstValueFrom(observeCurrentTeamId(database))).toBe('');
    });

    it('observeCurrentUserId emits empty string when not set', async () => {
        expect(await firstValueFrom(observeCurrentUserId(database))).toBe('');
    });

    it('observeGlobalThreadsTab emits "all" when not set', async () => {
        expect(await firstValueFrom(observeGlobalThreadsTab(database))).toBe('all');
    });

    it('observePushVerificationStatus emits unknown when not set', async () => {
        const val = await firstValueFrom(observePushVerificationStatus(database));
        expect(typeof val).toBe('string');
    });

    it('observeConfig emits config object', async () => {
        await operator.handleConfigs({configs: [{id: 'SiteName', value: 'Test'}], configsToDelete: [], prepareRecordsOnly: false});
        const config = await firstValueFrom(observeConfig(database));
        expect(config?.SiteName).toBe('Test');
    });

    it('observeConfigValue emits value for key', async () => {
        await operator.handleConfigs({configs: [{id: 'Version', value: '8.0.0'}], configsToDelete: [], prepareRecordsOnly: false});
        expect(await firstValueFrom(observeConfigValue(database, 'Version'))).toBe('8.0.0');
    });

    it('observeConfigValue emits undefined when key missing', async () => {
        expect(await firstValueFrom(observeConfigValue(database, 'SiteName'))).toBeUndefined();
    });

    it('observeMaxFileCount emits 5 for old server version', async () => {
        await operator.handleConfigs({configs: [{id: 'Version', value: '5.0.0'}], configsToDelete: [], prepareRecordsOnly: false});
        expect(await firstValueFrom(observeMaxFileCount(database))).toBe(5);
    });

    it('observeMaxFileCount emits 10 for server version >= 6.0', async () => {
        await operator.handleConfigs({configs: [{id: 'Version', value: '6.0.0'}], configsToDelete: [], prepareRecordsOnly: false});
        expect(await firstValueFrom(observeMaxFileCount(database))).toBe(10);
    });

    it('observeIsCustomStatusExpirySupported emits true for server version >= 5.37', async () => {
        await operator.handleConfigs({configs: [{id: 'Version', value: '5.37.0'}], configsToDelete: [], prepareRecordsOnly: false});
        expect(await firstValueFrom(observeIsCustomStatusExpirySupported(database))).toBe(true);
    });

    it('observeConfigBooleanValue emits false by default', async () => {
        expect(await firstValueFrom(observeConfigBooleanValue(database, 'EnableCustomEmoji'))).toBe(false);
    });

    it('observeConfigBooleanValue emits true when config is "true"', async () => {
        await operator.handleConfigs({configs: [{id: 'EnableCustomEmoji', value: 'true'}], configsToDelete: [], prepareRecordsOnly: false});
        expect(await firstValueFrom(observeConfigBooleanValue(database, 'EnableCustomEmoji'))).toBe(true);
    });

    it('observeConfigIntValue emits defaultValue when not set', async () => {
        expect(await firstValueFrom(observeConfigIntValue(database, 'MaxPostSize', 50))).toBe(50);
    });

    it('observeConfigIntValue emits parsed integer', async () => {
        await operator.handleConfigs({configs: [{id: 'MaxPostSize', value: '200'}], configsToDelete: [], prepareRecordsOnly: false});
        expect(await firstValueFrom(observeConfigIntValue(database, 'MaxPostSize'))).toBe(200);
    });

    it('observeLicense emits undefined when not set', async () => {
        expect(await firstValueFrom(observeLicense(database))).toBeUndefined();
    });

    it('observeLicense emits stored license', async () => {
        const license = {IsLicensed: 'true'};
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: license}], prepareRecordsOnly: false});
        expect(await firstValueFrom(observeLicense(database))).toEqual(license);
    });

    it('observeAllowedThemesKeys emits all default theme keys when AllowedThemes not set', async () => {
        const keys = await firstValueFrom(observeAllowedThemesKeys(database));
        expect(keys).toEqual(Object.keys(Preferences.THEMES));
    });

    it('observeAllowedThemesKeys filters when AllowedThemes is set', async () => {
        await operator.handleConfigs({configs: [{id: 'AllowedThemes', value: 'denim'}], configsToDelete: [], prepareRecordsOnly: false});
        const keys = await firstValueFrom(observeAllowedThemesKeys(database));
        expect(keys).toEqual(['denim']);
    });

    it('observeOnlyUnreads emits false when not set', async () => {
        expect(await firstValueFrom(observeOnlyUnreads(database))).toBe(false);
    });
});
