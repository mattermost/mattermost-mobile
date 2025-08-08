// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {firstValueFrom} from 'rxjs';

import {fetchUsersByIds} from '@actions/remote/user';
import DatabaseManager from '@database/manager';
import ServerDataOperator from '@database/operator/server_data_operator';
import TestHelper from '@test/test_helper';

import {observeUserOrFetch} from './user';

import type UserModel from '@typings/database/models/servers/user';

// Mock the fetchUsersByIds action
jest.mock('@actions/remote/user', () => ({
    fetchUsersByIds: jest.fn(),
}));

const mockedFetchUsersByIds = jest.mocked(fetchUsersByIds);

describe('observeUserOrFetch', () => {
    const serverUrl = 'https://test.mattermost.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('when user exists locally', () => {
        it('should return the local user without fetching', async () => {
            const user = TestHelper.fakeUser({
                id: 'user123',
                username: 'testuser',
                email: 'test@example.com',
                first_name: 'Test',
                last_name: 'User',
            });

            await operator.handleUsers({
                users: [user],
                prepareRecordsOnly: false,
            });

            const userObservable = observeUserOrFetch(database, serverUrl, 'user123');
            const result = await firstValueFrom(userObservable);

            expect(result).toBeDefined();
            expect(result?.id).toBe('user123');
            expect(result?.username).toBe('testuser');
            expect(result?.email).toBe('test@example.com');
            expect(result?.firstName).toBe('Test');
            expect(result?.lastName).toBe('User');

            expect(mockedFetchUsersByIds).not.toHaveBeenCalled();
        });

        it('should use observeUser correctly for local users', async () => {
            const user = TestHelper.fakeUser({
                id: 'user123',
                username: 'testuser',
                first_name: 'Test',
                last_name: 'User',
            });

            await operator.handleUsers({
                users: [user],
                prepareRecordsOnly: false,
            });

            const userObservable = observeUserOrFetch(database, serverUrl, 'user123');
            const result = await firstValueFrom(userObservable);

            expect(result).toBeDefined();
            expect(result?.id).toBe('user123');
            expect(result?.username).toBe('testuser');
            expect(result?.firstName).toBe('Test');
            expect(result?.lastName).toBe('User');
            expect(mockedFetchUsersByIds).not.toHaveBeenCalled();
        });
    });

    describe('when user does not exist locally', () => {
        it('should fetch user from server and then observe', async () => {
            const fetchedUser = TestHelper.fakeUser({
                id: 'user456',
                username: 'fetcheduser',
                email: 'fetched@example.com',
            });

            mockedFetchUsersByIds.mockImplementation(async () => {
                await operator.handleUsers({
                    users: [fetchedUser],
                    prepareRecordsOnly: false,
                });
                return {users: [fetchedUser], existingUsers: []};
            });

            const userObservable = observeUserOrFetch(database, serverUrl, 'user456', mockedFetchUsersByIds);
            const emissions: Array<UserModel | undefined> = [];

            const subscription = userObservable.subscribe((userModel) => {
                emissions.push(userModel);
            });

            await new Promise(process.nextTick);

            subscription.unsubscribe();

            expect(mockedFetchUsersByIds).toHaveBeenCalledWith(serverUrl, ['user456'], false);
            expect(mockedFetchUsersByIds).toHaveBeenCalledTimes(1);
            expect(emissions.length).toBeGreaterThanOrEqual(1);

            const finalUser = emissions[emissions.length - 1];
            expect(finalUser).toBeDefined();
            expect(finalUser?.id).toBe('user456');
            expect(finalUser?.username).toBe('fetcheduser');
        });
    });
});
