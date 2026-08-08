// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {refetchCurrentUser} from '@actions/remote/user';
import DatabaseManager from '@database/manager';
import {getCurrentUserId, prepareCommonSystemValues} from '@queries/servers/system';

import {appEntry} from './app';

jest.mock('@actions/local/systems');
jest.mock('@actions/remote/user');
jest.mock('@agents/actions/remote/agents');
jest.mock('@managers/websocket_manager');
jest.mock('@queries/servers/system');
jest.mock('./common');

describe('actions/remote/entry/app', () => {
    const serverUrl = 'https://server.example.com';

    const mockOperator = {
        batchRecords: jest.fn(),
    };
    const mockDatabase = {};

    beforeEach(() => {
        jest.clearAllMocks();

        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({
            database: mockDatabase,
            operator: mockOperator,
        }) as typeof DatabaseManager.getServerDatabaseAndOperator;

        jest.mocked(prepareCommonSystemValues).mockResolvedValue([]);
        jest.mocked(getCurrentUserId).mockResolvedValue('user1');
        jest.mocked(refetchCurrentUser).mockResolvedValue({currentUserId: 'user1'});
    });

    it('should seed the current user by calling refetchCurrentUser when getCurrentUserId returns no value', async () => {
        jest.mocked(getCurrentUserId).mockResolvedValueOnce('');
        jest.mocked(refetchCurrentUser).mockResolvedValueOnce({currentUserId: 'seededUser'});

        const result = await appEntry(serverUrl);

        expect(refetchCurrentUser).toHaveBeenCalledWith(serverUrl, undefined);
        expect(result).toEqual({});
    });

    it('should return an error when refetchCurrentUser fails to seed the current user', async () => {
        jest.mocked(getCurrentUserId).mockResolvedValueOnce('');
        jest.mocked(refetchCurrentUser).mockResolvedValueOnce({error: 'No user fetched'});

        const result = await appEntry(serverUrl);

        expect(result).toEqual({error: new Error('appEntry: failed to seed current user')});
    });
});
