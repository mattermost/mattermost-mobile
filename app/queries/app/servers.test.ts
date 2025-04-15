// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getConfigValue} from '@queries/servers/system';
import {isMinimumServerVersion} from '@utils/helpers';

import {queryServerDisplayName, queryAllActiveServers, getServer, getAllServers, getActiveServer, getActiveServerUrl, getServerByIdentifier, getServerByDisplayName, getServerDisplayName, observeServerDisplayName, observeAllActiveServers, areAllServersSupported} from './servers';

jest.mock('@database/manager', () => ({
    getAppDatabaseAndOperator: jest.fn(),
    getServerDatabaseAndOperator: jest.fn(),
}));

jest.mock('@queries/servers/system', () => ({
    getConfigValue: jest.fn(),
}));

jest.mock('@utils/helpers', () => {
    const original = jest.requireActual('@utils/helpers');
    return {
        ...original,
        isMinimumServerVersion: jest.fn(),
    };
});

const {APP: {SERVERS}} = MM_TABLES;

describe('Servers Queries', () => {
    const mockDatabase = {
        get: jest.fn(),
    };

    const mockServerModel = {
        query: jest.fn(() => ({observeWithColumns: jest.fn(() => ({pipe: jest.fn(() => ({}))})), observe: jest.fn()})),
        fetch: jest.fn(),
        observe: jest.fn(),
        observeWithColumns: jest.fn(),
    };

    const serverUrl = 'https://example.com';

    const mockedGetAppDatabaseAndOperator = jest.mocked(DatabaseManager.getAppDatabaseAndOperator);
    const getServerDatabaseAndOperator = jest.mocked(DatabaseManager.getServerDatabaseAndOperator);
    const mockedGetConfigValue = jest.mocked(getConfigValue);
    const mockedIsMinimumServerVersion = jest.mocked(isMinimumServerVersion);

    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetAppDatabaseAndOperator.mockReturnValue({database: mockDatabase} as any);
        mockDatabase.get.mockReturnValue(mockServerModel);
    });

    test('queryServerDisplayName should return server display name query', () => {
        queryServerDisplayName(serverUrl);
        expect(mockDatabase.get).toHaveBeenCalledWith(SERVERS);
        expect(mockServerModel.query).toHaveBeenCalledWith(Q.where('url', serverUrl));
    });

    it('queryServerDisplayName should return undefined if there is an error', async () => {
        mockedGetAppDatabaseAndOperator.mockImplementationOnce(() => {
            throw new Error('Error');
        });

        const result = await queryServerDisplayName(serverUrl);
        expect(result).toBeUndefined();
    });

    test('queryAllActiveServers should return all active servers query', () => {
        queryAllActiveServers();
        expect(mockDatabase.get).toHaveBeenCalledWith(SERVERS);
        expect(mockServerModel.query).toHaveBeenCalledWith(
            Q.and(
                Q.where('identifier', Q.notEq('')),
                Q.where('last_active_at', Q.gt(0)),
            ),
        );
    });

    it('queryAllActiveServers should return undefined if there is an error', async () => {
        mockedGetAppDatabaseAndOperator.mockImplementationOnce(() => {
            throw new Error('Error');
        });

        const result = await queryAllActiveServers();
        expect(result).toBeUndefined();
    });

    test('getServer should return a server by URL', async () => {
        mockServerModel.query.mockReturnValueOnce({fetch: jest.fn().mockResolvedValue([{url: serverUrl}])} as any);
        const server = await getServer(serverUrl);
        expect(server).toEqual({url: serverUrl});
    });

    it('getServer should return undefined if there is an error', async () => {
        mockedGetAppDatabaseAndOperator.mockImplementationOnce(() => {
            throw new Error('Error');
        });

        const result = await getServer(serverUrl);
        expect(result).toBeUndefined();
    });

    test('getAllServers should return all servers', async () => {
        const servers = [{url: 'https://example.com'}];
        mockServerModel.query.mockReturnValueOnce({fetch: jest.fn().mockResolvedValue(servers)} as any);
        const result = await getAllServers();
        expect(result).toEqual(servers);
    });

    test('getActiveServer should return the most recently active server', async () => {
        const servers = [
            {identifier: 'server1', url: 'https://example1.com', lastActiveAt: 1},
            {identifier: 'server2', url: 'https://example2.com', lastActiveAt: 2},
        ];
        mockServerModel.query.mockReturnValueOnce({fetch: jest.fn().mockResolvedValue(servers)} as any);
        const result = await getActiveServer();
        expect(result).toEqual(servers[1]);
    });

    it('getActiveServer should return undefined if there is an error', async () => {
        mockedGetAppDatabaseAndOperator.mockImplementationOnce(() => {
            throw new Error('Error');
        });

        const result = await getActiveServer();
        expect(result).toBeUndefined();
    });

    test('getActiveServerUrl should return the URL of the most recently active server', async () => {
        const servers = [
            {identifier: 'server1', url: 'https://example1.com', lastActiveAt: 1},
            {identifier: 'server2', url: 'https://example2.com', lastActiveAt: 2},
        ];
        mockServerModel.query.mockReturnValueOnce({fetch: jest.fn().mockResolvedValue(servers)} as any);
        const result = await getActiveServerUrl();
        expect(result).toEqual('https://example2.com');
    });

    test('getServerByIdentifier should return a server by identifier', async () => {
        const identifier = 'server-identifier';
        mockServerModel.query.mockReturnValueOnce({fetch: jest.fn().mockResolvedValue([{identifier}])} as any);
        const server = await getServerByIdentifier(identifier);
        expect(server).toEqual({identifier});
    });

    it('getServerByIdentifier should return undefined if there is an error', async () => {
        mockedGetAppDatabaseAndOperator.mockImplementationOnce(() => {
            throw new Error('Error');
        });

        const result = await getServerByIdentifier('server-identifier');
        expect(result).toBeUndefined();
    });

    test('getServerByDisplayName should return a server by display name', async () => {
        const displayName = 'Example Server';
        const servers = [{displayName: 'Example Server'}];
        mockServerModel.query.mockReturnValueOnce({fetch: jest.fn().mockResolvedValue(servers)} as any);
        const server = await getServerByDisplayName(displayName);
        expect(server).toEqual(servers[0]);
    });

    test('getServerDisplayName should return the display name of a server by URL', async () => {
        const servers = [{displayName: 'Example Server'}];
        mockServerModel.query.mockReturnValueOnce({fetch: jest.fn().mockResolvedValue(servers)} as any);
        const displayName = await getServerDisplayName(serverUrl);
        expect(displayName).toEqual('Example Server');
    });

    test('observeServerDisplayName should return an observable for server display name', () => {
        mockServerModel.observeWithColumns.mockReturnValueOnce(of$([{displayName: 'Example Server'}]));
        const observable = observeServerDisplayName(serverUrl);
        expect(observable).toBeDefined();
    });

    test('observeAllActiveServers should return an observable for all active servers', () => {
        mockServerModel.observe.mockReturnValueOnce(of$([{url: 'https://example.com'}]));
        const observable = observeAllActiveServers();
        expect(observable).toBeDefined();
    });

    test('areAllServersSupported should return true if all servers are supported', async () => {
        const servers = [{url: 'https://example.com', lastActiveAt: 1}];
        mockServerModel.query.mockReturnValueOnce({fetch: jest.fn().mockResolvedValue(servers)} as any);
        getServerDatabaseAndOperator.mockReturnValue({database: mockDatabase} as any);
        mockedGetConfigValue.mockResolvedValue('5.0.0');
        mockedIsMinimumServerVersion.mockReturnValueOnce(true);

        const result = await areAllServersSupported();
        expect(result).toBe(true);
    });

    test('areAllServersSupported should return false if any server is not supported', async () => {
        const servers = [{url: 'https://example.com', lastActiveAt: 1}];
        mockServerModel.query.mockReturnValueOnce({fetch: jest.fn().mockResolvedValue(servers)} as any);
        getServerDatabaseAndOperator.mockReturnValue({database: mockDatabase} as any);
        mockedGetConfigValue.mockResolvedValue('4.0.0');
        mockedIsMinimumServerVersion.mockReturnValueOnce(false);

        const result = await areAllServersSupported();
        expect(result).toBe(false);
    });

    it('areAllServersSupported should return true if there is an error', async () => {
        mockedGetAppDatabaseAndOperator.mockImplementationOnce(() => {
            throw new Error('Error');
        });

        const result = await areAllServersSupported();
        expect(result).toBe(true);
    });
});
