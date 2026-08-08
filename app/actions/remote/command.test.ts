// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';

import DatabaseManager from '@database/manager';
import IntegrationsManager from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {getConfig} from '@queries/servers/system';
import {matchDeepLink, handleDeepLink} from '@utils/deep_link';
import {logDebug} from '@utils/log';
import {tryOpenURL} from '@utils/url';

import {
    executeCommand,
    handleGotoLocation,
    fetchCommands,
    fetchSuggestions,
} from './command';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@database/manager');
jest.mock('@managers/integrations_manager');
jest.mock('@managers/network_manager');
jest.mock('@queries/servers/system');
jest.mock('@utils/log');
jest.mock('@utils/deep_link');
jest.mock('@utils/url');

jest.mock('@screens/navigation', () => {
    const original = jest.requireActual('@screens/navigation');
    return {
        ...original,
        navigateToScreen: jest.fn(),
    };
});

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const intl = createIntl({
    locale: 'en',
    messages: {},
});

const channelId = 'channel_id';
const teamId = 'team_id';
const rootId = 'root_id';
const message = '/test command';
const args = {
    channel_id: channelId,
    team_id: teamId,
    root_id: rootId,
    parent_id: rootId,
};

const channel: Channel = {
    id: channelId,
    display_name: 'channelname',
    team_id: teamId,
    total_msg_count: 0,
    group_constrained: true,
} as Channel;

const mockCommands = [{id: 'command1'}, {id: 'command2'}];
const mockSuggestions = ['suggestion1', 'suggestion2'];
const error = new Error('Test error');

const mockClient = {
    executeCommand: jest.fn(() => ({trigger_id: 'trigger_id'})),
    getCommandsList: jest.fn().mockResolvedValue(mockCommands),
    getCommandAutocompleteSuggestionsList: jest.fn().mockResolvedValue(mockSuggestions),
};

describe('app commands', () => {
    beforeAll(() => {

        // @ts-ignore
        NetworkManager.getClient = () => mockClient;
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('executeCommand', () => {
        it('handle not found database', async () => {
            const result = await executeCommand('invalid_url', intl, message, channelId, rootId);
            expect(result).toEqual({error: 'invalid_url database not found'});
        });

        it('handle client error', async () => {
            jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(() => {
                throw error;
            });

            const result = await executeCommand(serverUrl, intl, message, channelId, rootId);
            expect(result).toEqual({error});
        });

        it('handle command execution with successful response', async () => {
            await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

            const mockSetTriggerId = jest.fn();
            jest.spyOn(IntegrationsManager, 'getManager').mockReturnValue({
                setTriggerId: mockSetTriggerId,
            } as any);

            const result = await executeCommand(serverUrl, intl, message, channelId, rootId);

            expect(mockClient.executeCommand).toHaveBeenCalledWith(message, args);
            expect(mockSetTriggerId).toHaveBeenCalledWith('trigger_id');
            expect(result).toEqual({data: {trigger_id: 'trigger_id'}});
        });

        it('handle /code command execution with successful response', async () => {
            await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

            const mockSetTriggerId = jest.fn();
            jest.spyOn(IntegrationsManager, 'getManager').mockReturnValue({
                setTriggerId: mockSetTriggerId,
            } as any);

            const result = await executeCommand(serverUrl, intl, '/code', channelId, rootId);

            expect(mockClient.executeCommand).toHaveBeenCalledWith('/code ', args);
            expect(mockSetTriggerId).toHaveBeenCalledWith('trigger_id');
            expect(result).toEqual({data: {trigger_id: 'trigger_id'}});
        });

        it('handle command execution with no trigger id', async () => {
            await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

            mockClient.executeCommand.mockResolvedValueOnce({} as never);

            const result = await executeCommand(serverUrl, intl, message, channelId, rootId);

            expect(mockClient.executeCommand).toHaveBeenCalledWith(message, args);
            expect(result).toEqual({data: {}});
        });

        it('handle command execution with error response', async () => {
            await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

            mockClient.executeCommand.mockRejectedValue(error as never);

            const result = await executeCommand(serverUrl, intl, message, channelId, rootId);

            expect(mockClient.executeCommand).toHaveBeenCalledWith(message, args);
            expect(logDebug).toHaveBeenCalledWith('error on executeCommand', error.message);
            expect(result).toEqual({error});
        });
    });

    describe('handleGotoLocation', () => {
        const location = 'https://example.com/some/path';

        it('should return error if database not found', async () => {
            (DatabaseManager.serverDatabases as any) = {};

            const result = await handleGotoLocation(serverUrl, intl, location);

            expect(result).toEqual({error: `${serverUrl} database not found`});
        });

        it('should handle deep link match found', async () => {
            const mockOperator = {
                database: {},
            };
            (DatabaseManager.serverDatabases as any) = {
                [serverUrl]: {operator: mockOperator},
            };
            (getConfig as jest.Mock).mockResolvedValue({SiteURL: serverUrl});
            (matchDeepLink as jest.Mock).mockReturnValue({url: location});

            const result = await handleGotoLocation(serverUrl, intl, location);

            expect(getConfig).toHaveBeenCalledWith(mockOperator.database);
            expect(matchDeepLink).toHaveBeenCalledWith(location, serverUrl, serverUrl);
            expect(handleDeepLink).toHaveBeenCalledWith({url: location}, intl, location);
            expect(result).toEqual({data: true});
        });

        it('should handle deep link match not found and URL opened successfully', async () => {
            const mockOperator = {
                database: {},
            };
            (DatabaseManager.serverDatabases as any) = {
                [serverUrl]: {operator: mockOperator},
            };
            (getConfig as jest.Mock).mockResolvedValue({SiteURL: serverUrl});
            (matchDeepLink as jest.Mock).mockReturnValue(null);
            (tryOpenURL as jest.Mock).mockImplementation((url, onError) => onError());

            const result = await handleGotoLocation(serverUrl, intl, location);

            expect(getConfig).toHaveBeenCalledWith(mockOperator.database);
            expect(matchDeepLink).toHaveBeenCalledWith(location, serverUrl, serverUrl);
            expect(tryOpenURL).toHaveBeenCalledWith(location, expect.any(Function));
            expect(result).toEqual({data: true});
        });

        it('should handle deep link match not found and URL open failed', async () => {
            const mockOperator = {
                database: {},
            };
            (DatabaseManager.serverDatabases as any) = {
                [serverUrl]: {operator: mockOperator},
            };
            (getConfig as jest.Mock).mockResolvedValue({SiteURL: serverUrl});
            (matchDeepLink as jest.Mock).mockReturnValue(null);
            (tryOpenURL as jest.Mock).mockImplementation((url, onError) => onError());

            const result = await handleGotoLocation(serverUrl, intl, location);

            expect(getConfig).toHaveBeenCalledWith(mockOperator.database);
            expect(matchDeepLink).toHaveBeenCalledWith(location, serverUrl, serverUrl);
            expect(tryOpenURL).toHaveBeenCalledWith(location, expect.any(Function));
            expect(result).toEqual({data: true});
        });
    });

    describe('fetchCommands', () => {
        it('should fetch commands successfully', async () => {
            const result = await fetchCommands(serverUrl, teamId);

            expect(mockClient.getCommandsList).toHaveBeenCalledWith(teamId);
            expect(result).toEqual({commands: mockCommands});
        });

        it('should handle error during fetch commands', async () => {
            mockClient.getCommandsList.mockRejectedValue(error);

            const result = await fetchCommands(serverUrl, teamId);

            expect(mockClient.getCommandsList).toHaveBeenCalledWith(teamId);
            expect(logDebug).toHaveBeenCalledWith('error on fetchCommands', 'Test error');
            expect(result).toEqual({error});
        });
    });

    describe('fetchSuggestions', () => {
        const term = 'test';

        it('should fetch suggestions successfully', async () => {
            const result = await fetchSuggestions(serverUrl, term, teamId, channelId, rootId);

            expect(mockClient.getCommandAutocompleteSuggestionsList).toHaveBeenCalledWith(term, teamId, channelId, rootId);
            expect(result).toEqual({suggestions: mockSuggestions});
        });

        it('should handle error during fetch suggestions', async () => {
            mockClient.getCommandAutocompleteSuggestionsList.mockRejectedValue(error);

            const result = await fetchSuggestions(serverUrl, term, teamId, channelId, rootId);

            expect(mockClient.getCommandAutocompleteSuggestionsList).toHaveBeenCalledWith(term, teamId, channelId, rootId);
            expect(logDebug).toHaveBeenCalledWith('error on fetchSuggestions', 'Test error');
            expect(result).toEqual({error});
        });
    });
});
