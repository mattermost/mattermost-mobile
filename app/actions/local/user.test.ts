// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

import {
    setCurrentUserStatus,
    updateLocalCustomStatus,
    updateRecentCustomStatuses,
    updateLocalUser,
    storeProfile,
} from './user';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

jest.mock('@init/credentials', () => {
    const original = jest.requireActual('@init/credentials');
    return {
        ...original,
        getServerCredentials: jest.fn(async (url: string) => ({serverUrl: url})),
    };
});

const user: UserProfile = {
    id: 'userid',
    username: 'username',
    roles: '',
} as UserProfile;

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('setCurrentUserStatus', () => {
    it('handle not found database', async () => {
        const result = await setCurrentUserStatus('foo', '') as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('handle no user', async () => {
        const result = await setCurrentUserStatus(serverUrl, '') as {error: unknown};
        expect(result?.error).toBeDefined();
        expect((result?.error as Error).message).toBe(`No current user for ${serverUrl}`);
    });

    it('base case', async () => {
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        const result = await setCurrentUserStatus(serverUrl, 'away');
        expect(result).toBeNull();
    });
});

describe('updateLocalCustomStatus', () => {
    it('handle not found database', async () => {
        const result = await updateLocalCustomStatus('foo', {} as UserModel) as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('base case', async () => {
        const userModels = await operator.handleUsers({users: [user], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        const result = await updateLocalCustomStatus(serverUrl, userModels[0], {text: 'customstatus'}) as {};
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });
});

describe('updateRecentCustomStatuses', () => {
    it('handle not found database', async () => {
        const result = await updateRecentCustomStatuses('foo', {text: 'customstatus'}) as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('base case', async () => {
        const result = await updateRecentCustomStatuses(serverUrl, {text: 'customstatus'}) as SystemModel[];
        expect(result).toBeDefined();
        expect(result.length).toBe(1); // system
    });
});

describe('updateLocalUser', () => {
    it('handle not found database', async () => {
        const {error} = await updateLocalUser('foo', user);
        expect(error).toBeDefined();
    });

    it('base case', async () => {
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        const {user: userModel} = await updateLocalUser(serverUrl, user);
        expect(userModel).toBeDefined();
    });

    it('base case with user id', async () => {
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        const {user: userModel} = await updateLocalUser(serverUrl, {status: 'away'}, user.id);
        expect(userModel).toBeDefined();
    });
});

describe('storeProfile', () => {
    it('handle not found database', async () => {
        const {error} = await storeProfile('foo', user);
        expect(error).toBeDefined();
    });

    it('base case - user exists', async () => {
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});
        const {user: userModel} = await storeProfile(serverUrl, user);
        expect(userModel).toBeDefined();
    });

    it('base case - no user', async () => {
        const {user: userModel} = await storeProfile(serverUrl, user);
        expect(userModel).toBeDefined();
    });
});

