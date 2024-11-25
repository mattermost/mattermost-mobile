// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {createIntl} from 'react-intl';

import {doAppSubmit, postEphemeralCallResponseForCommandArgs} from '@actions/remote/apps';
import {AppCommandParser} from '@components/autocomplete/slash_suggestion/app_command_parser/app_command_parser';
import {AppCallResponseTypes} from '@constants/apps';
import DatabaseManager from '@database/manager';
import AppsManager from '@managers/apps_manager';
import IntegrationsManager from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {getConfig} from '@queries/servers/system';
import {showAppForm} from '@screens/navigation';
import {matchDeepLink, handleDeepLink} from '@utils/deep_link';
import {logDebug} from '@utils/log';
import {tryOpenURL} from '@utils/url';

import {
    executeCommand,
    executeAppCommand,
    handleGotoLocation,
    fetchCommands,
    fetchSuggestions,
} from './command';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@actions/remote/apps');
jest.mock('@components/autocomplete/slash_suggestion/app_command_parser/app_command_parser');
jest.mock('@constants/apps');
jest.mock('@database/manager');
jest.mock('@managers/apps_manager');
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
        showAppForm: jest.fn(),
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

beforeAll(() => {
    // eslint-disable-next-line
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

    it('handle apps enabled', async () => {
        jest.spyOn(AppsManager, 'isAppsEnabled').mockResolvedValue(true);
        const parser = {
            isAppCommand: jest.fn().mockReturnValue(true),
            composeCommandSubmitCall: jest.fn().mockResolvedValue({creq: {}, errorMessage: null}),
        };
        (AppCommandParser as jest.Mock).mockReturnValue(parser);
        (doAppSubmit as jest.Mock).mockResolvedValue({data: {type: AppCallResponseTypes.OK, text: 'Success'}});

        const result = await executeCommand(serverUrl, intl, message, channelId, rootId);

        expect(AppsManager.isAppsEnabled).toHaveBeenCalledWith(serverUrl);
        expect(parser.isAppCommand).toHaveBeenCalledWith(message);
        expect(result).toEqual(await executeAppCommand(serverUrl, intl, parser as any, message, args));
    });

    it('handle apps enabled but not an app command', async () => {
        jest.spyOn(AppsManager, 'isAppsEnabled').mockResolvedValue(true);
        const parser = {
            isAppCommand: jest.fn().mockReturnValue(false),
        };
        (AppCommandParser as jest.Mock).mockImplementation(() => parser);

        const result = await executeCommand(serverUrl, intl, message, channelId, rootId);

        expect(AppsManager.isAppsEnabled).toHaveBeenCalledWith(serverUrl);
        expect(parser.isAppCommand).toHaveBeenCalledWith(message);
        expect(mockClient.executeCommand).toHaveBeenCalled();
        expect(result).toEqual({data: {trigger_id: 'trigger_id'}});
    });

    it('handle apps disabled', async () => {
        jest.spyOn(AppsManager, 'isAppsEnabled').mockResolvedValue(false);

        const result = await executeCommand(serverUrl, intl, message, channelId, rootId);

        expect(AppsManager.isAppsEnabled).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.executeCommand).toHaveBeenCalled();
        expect(result).toEqual({data: {trigger_id: 'trigger_id'}});
    });

    it('handle command execution with successful response', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

        jest.spyOn(AppsManager, 'isAppsEnabled').mockResolvedValue(false);
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

        jest.spyOn(AppsManager, 'isAppsEnabled').mockResolvedValue(false);
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

        jest.spyOn(AppsManager, 'isAppsEnabled').mockResolvedValue(false);
        mockClient.executeCommand.mockResolvedValueOnce({} as never);

        const result = await executeCommand(serverUrl, intl, message, channelId, rootId);

        expect(mockClient.executeCommand).toHaveBeenCalledWith(message, args);
        expect(result).toEqual({data: {}});
    });

    it('handle command execution with error response', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

        jest.spyOn(AppsManager, 'isAppsEnabled').mockResolvedValue(false);
        mockClient.executeCommand.mockRejectedValue(error as never);

        const result = await executeCommand(serverUrl, intl, message, channelId, rootId);

        expect(mockClient.executeCommand).toHaveBeenCalledWith(message, args);
        expect(logDebug).toHaveBeenCalledWith('error on executeCommand', error.message);
        expect(result).toEqual({error});
    });
});

describe('executeAppCommand', () => {
    const msg = 'test message';

    it('should handle a undefined creq', async () => {
        const parser = {
            composeCommandSubmitCall: jest.fn().mockResolvedValue({errorMessage: 'Error occurred'}),
        };

        const result = await executeAppCommand(serverUrl, intl, parser as any, msg, args);

        expect(result).toEqual({error: {message: 'Error occurred'}});
    });

    it('should handle a successful command execution with OK response', async () => {
        const parser = {
            composeCommandSubmitCall: jest.fn().mockResolvedValue({creq: {}, errorMessage: null}),
        };
        (AppCommandParser as jest.Mock).mockReturnValue(parser);
        (doAppSubmit as jest.Mock).mockResolvedValue({data: {type: AppCallResponseTypes.OK, text: 'Success'}});

        const result = await executeAppCommand(serverUrl, intl, parser as any, msg, args);

        expect(parser.composeCommandSubmitCall).toHaveBeenCalledWith(msg);
        expect(doAppSubmit).toHaveBeenCalledWith(serverUrl, {}, intl);
        expect(postEphemeralCallResponseForCommandArgs).toHaveBeenCalledWith(serverUrl, {type: AppCallResponseTypes.OK, text: 'Success'}, 'Success', args);
        expect(result).toEqual({data: {}});
    });

    it('should handle OK response with no text', async () => {
        const parser = {
            composeCommandSubmitCall: jest.fn().mockResolvedValue({creq: {}, errorMessage: null}),
        };
        (AppCommandParser as jest.Mock).mockReturnValue(parser);
        (doAppSubmit as jest.Mock).mockResolvedValue({data: {type: AppCallResponseTypes.OK}});

        const result = await executeAppCommand(serverUrl, intl, parser as any, msg, args);

        expect(parser.composeCommandSubmitCall).toHaveBeenCalledWith(msg);
        expect(doAppSubmit).toHaveBeenCalledWith(serverUrl, {}, intl);
        expect(result).toEqual({data: {}});
    });

    it('should handle an error response', async () => {
        const parser = {
            composeCommandSubmitCall: jest.fn().mockResolvedValue({creq: {}, errorMessage: null}),
        };
        (AppCommandParser as jest.Mock).mockReturnValue(parser);
        (doAppSubmit as jest.Mock).mockResolvedValue({error: {text: 'Error occurred'}});

        const result = await executeAppCommand(serverUrl, intl, parser as any, msg, args);

        expect(parser.composeCommandSubmitCall).toHaveBeenCalledWith(msg);
        expect(doAppSubmit).toHaveBeenCalledWith(serverUrl, {}, intl);
        expect(result).toEqual({error: {message: 'Error occurred'}});
    });

    it('should handle an error response with no text', async () => {
        const parser = {
            composeCommandSubmitCall: jest.fn().mockResolvedValue({creq: {}, errorMessage: null}),
        };
        (AppCommandParser as jest.Mock).mockReturnValue(parser);
        (doAppSubmit as jest.Mock).mockResolvedValue({error: {}});

        const result = await executeAppCommand(serverUrl, intl, parser as any, msg, args);

        expect(parser.composeCommandSubmitCall).toHaveBeenCalledWith(msg);
        expect(doAppSubmit).toHaveBeenCalledWith(serverUrl, {}, intl);
        expect(result).toEqual({error: {message: 'Unknown error.'}});
    });

    it('should handle a form response', async () => {
        const parser = {
            composeCommandSubmitCall: jest.fn().mockResolvedValue({creq: {context: {}}, errorMessage: null}),
        };
        (AppCommandParser as jest.Mock).mockReturnValue(parser);
        (doAppSubmit as jest.Mock).mockResolvedValue({data: {type: AppCallResponseTypes.FORM, form: {title: 'Form Title'}}});

        const result = await executeAppCommand(serverUrl, intl, parser as any, msg, args);

        expect(parser.composeCommandSubmitCall).toHaveBeenCalledWith(msg);
        expect(doAppSubmit).toHaveBeenCalledWith(serverUrl, {context: {}}, intl);
        expect(showAppForm).toHaveBeenCalledWith({title: 'Form Title'}, {});
        expect(result).toEqual({data: {}});
    });

    it('should handle a form response with no form', async () => {
        const parser = {
            composeCommandSubmitCall: jest.fn().mockResolvedValue({creq: {context: {}}, errorMessage: null}),
        };
        (AppCommandParser as jest.Mock).mockReturnValue(parser);
        (doAppSubmit as jest.Mock).mockResolvedValue({data: {type: AppCallResponseTypes.FORM}});

        const result = await executeAppCommand(serverUrl, intl, parser as any, msg, args);

        expect(parser.composeCommandSubmitCall).toHaveBeenCalledWith(msg);
        expect(doAppSubmit).toHaveBeenCalledWith(serverUrl, {context: {}}, intl);
        expect(result).toEqual({data: {}});
    });

    it('should handle a navigate response', async () => {
        const parser = {
            composeCommandSubmitCall: jest.fn().mockResolvedValue({creq: {}, errorMessage: null}),
        };
        (AppCommandParser as jest.Mock).mockReturnValue(parser);
        (doAppSubmit as jest.Mock).mockResolvedValue({data: {type: AppCallResponseTypes.NAVIGATE, navigate_to_url: 'https://navigate.com'}});

        const result = await executeAppCommand(serverUrl, intl, parser as any, msg, args);

        expect(parser.composeCommandSubmitCall).toHaveBeenCalledWith(msg);
        expect(doAppSubmit).toHaveBeenCalledWith(serverUrl, {}, intl);
        expect(result).toEqual({data: {}});
    });

    it('should handle a navigate response with no url', async () => {
        const parser = {
            composeCommandSubmitCall: jest.fn().mockResolvedValue({creq: {}, errorMessage: null}),
        };
        (AppCommandParser as jest.Mock).mockReturnValue(parser);
        (doAppSubmit as jest.Mock).mockResolvedValue({data: {type: AppCallResponseTypes.NAVIGATE}});

        const result = await executeAppCommand(serverUrl, intl, parser as any, msg, args);

        expect(parser.composeCommandSubmitCall).toHaveBeenCalledWith(msg);
        expect(doAppSubmit).toHaveBeenCalledWith(serverUrl, {}, intl);
        expect(result).toEqual({data: {}});
    });

    it('should handle an unknown response type', async () => {
        const parser = {
            composeCommandSubmitCall: jest.fn().mockResolvedValue({creq: {}, errorMessage: null}),
        };
        (AppCommandParser as jest.Mock).mockReturnValue(parser);
        (doAppSubmit as jest.Mock).mockResolvedValue({data: {type: 'UNKNOWN'}});

        const result = await executeAppCommand(serverUrl, intl, parser as any, msg, args);

        expect(parser.composeCommandSubmitCall).toHaveBeenCalledWith(msg);
        expect(doAppSubmit).toHaveBeenCalledWith(serverUrl, {}, intl);
        expect(result).toEqual({error: {message: 'App response type not supported. Response type: UNKNOWN.'}});
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
        expect(handleDeepLink).toHaveBeenCalledWith(location, intl, location);
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
