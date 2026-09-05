// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {restoreServerAfterDatabaseWipe} from '@actions/remote/restore_server';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {attemptAppDatabaseRecovery, attemptServerDatabaseRecovery, resetDatabaseRecoveryStateForTests} from '@database/recovery';
import TestHelper from '@test/test_helper';

jest.mock('@react-native-community/netinfo');
jest.mock('@actions/remote/restore_server', () => ({
    restoreServerAfterDatabaseWipe: jest.fn(),
}));

const {USER} = MM_TABLES.SERVER;
const serverUrl = 'https://recovery.test.com';
const loopServerUrl = 'https://loop.test.com';
const corruptionError = new Error('database disk image is malformed');

async function getUserCount(url: string): Promise<number> {
    const {database} = DatabaseManager.getServerDatabaseAndOperator(url);
    return database.get(USER).query().fetchCount();
}

describe('database recovery', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetDatabaseRecoveryStateForTests();
        jest.mocked(restoreServerAfterDatabaseWipe).mockResolvedValue({});
    });

    afterEach(async () => {
        for (const url of [serverUrl, loopServerUrl]) {
            if (DatabaseManager.serverDatabases[url]) {
                // eslint-disable-next-line no-await-in-loop
                await DatabaseManager.destroyServerDatabase(url);
            }
        }
    });

    test('attemptServerDatabaseRecovery wipes and re-syncs corrupted databases', async () => {
        await TestHelper.setupServerDatabase(serverUrl);
        expect(await getUserCount(serverUrl)).toBeGreaterThan(0);

        const result = await attemptServerDatabaseRecovery(serverUrl, corruptionError, 'batchRecords');

        expect(result).toBe(true);
        expect(await getUserCount(serverUrl)).toBe(0);
        expect(DatabaseManager.serverDatabases[serverUrl]).toBeDefined();
        expect(restoreServerAfterDatabaseWipe).toHaveBeenCalledWith(serverUrl);
    });

    test('attemptServerDatabaseRecovery logs when restore returns an error', async () => {
        await TestHelper.setupServerDatabase(serverUrl);
        jest.mocked(restoreServerAfterDatabaseWipe).mockResolvedValue({error: 'no_connection'});

        const result = await attemptServerDatabaseRecovery(serverUrl, corruptionError, 'batchRecords');

        expect(result).toBe(true);
        expect(restoreServerAfterDatabaseWipe).toHaveBeenCalledWith(serverUrl);
    });

    test('attemptServerDatabaseRecovery skips resync when resync is false', async () => {
        await TestHelper.setupServerDatabase(serverUrl);

        const result = await attemptServerDatabaseRecovery(serverUrl, corruptionError, 'createServerDatabase', {resync: false});

        expect(result).toBe(true);
        expect(restoreServerAfterDatabaseWipe).not.toHaveBeenCalled();
    });

    test('attemptServerDatabaseRecovery ignores non-corruption errors', async () => {
        await TestHelper.setupServerDatabase(serverUrl);
        const countBefore = await getUserCount(serverUrl);

        const result = await attemptServerDatabaseRecovery(serverUrl, new Error('database is locked'), 'batchRecords');

        expect(result).toBe(false);
        expect(await getUserCount(serverUrl)).toBe(countBefore);
        expect(restoreServerAfterDatabaseWipe).not.toHaveBeenCalled();
    });

    test('attemptServerDatabaseRecovery stops after the recovery limit is reached', async () => {
        await TestHelper.setupServerDatabase(loopServerUrl);

        await attemptServerDatabaseRecovery(loopServerUrl, corruptionError, 'first');
        expect(await getUserCount(loopServerUrl)).toBe(0);

        const {operator} = DatabaseManager.getServerDatabaseAndOperator(loopServerUrl);
        await operator.handleUsers({
            users: [TestHelper.basicUser!],
            prepareRecordsOnly: false,
        });
        expect(await getUserCount(loopServerUrl)).toBeGreaterThan(0);

        const result = await attemptServerDatabaseRecovery(loopServerUrl, corruptionError, 'second');

        expect(result).toBe(false);
        expect(await getUserCount(loopServerUrl)).toBeGreaterThan(0);
    });

    test('attemptAppDatabaseRecovery wipes and recreates the app database', async () => {
        await DatabaseManager.initAppDatabase();
        const before = DatabaseManager.appDatabase?.database;
        expect(before).toBeDefined();
        expect(DatabaseManager.isAppDatabase(before!)).toBe(true);

        const result = await attemptAppDatabaseRecovery(corruptionError, 'addServerToAppDatabase');

        expect(result).toBe(true);
        expect(DatabaseManager.appDatabase?.database).toBeDefined();
        expect(DatabaseManager.appDatabase?.database).not.toBe(before);
        expect(DatabaseManager.isAppDatabase(before!)).toBe(false);
    });

    test('attemptAppDatabaseRecovery ignores non-corruption errors', async () => {
        await DatabaseManager.initAppDatabase();
        const before = DatabaseManager.appDatabase?.database;

        const result = await attemptAppDatabaseRecovery(new Error('database is locked'), 'addServerToAppDatabase');

        expect(result).toBe(false);
        expect(DatabaseManager.appDatabase?.database).toBe(before);
    });

    test('attemptAppDatabaseRecovery stops after the recovery limit is reached', async () => {
        await DatabaseManager.initAppDatabase();

        expect(await attemptAppDatabaseRecovery(corruptionError, 'first')).toBe(true);
        const afterFirst = DatabaseManager.appDatabase?.database;

        expect(await attemptAppDatabaseRecovery(corruptionError, 'second')).toBe(false);
        expect(DatabaseManager.appDatabase?.database).toBe(afterFirst);
    });
});
