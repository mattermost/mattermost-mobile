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
import {showAppForm} from '@screens/navigation';
import {logDebug} from '@utils/log';

import {
    executeCommand,
    executeAppCommand,
} from './command';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@actions/remote/apps');
jest.mock('@components/autocomplete/slash_suggestion/app_command_parser/app_command_parser');
jest.mock('@constants/apps');
jest.mock('@database/manager');
jest.mock('@managers/apps_manager');
jest.mock('@managers/integrations_manager');
jest.mock('@managers/network_manager');
jest.mock('@utils/log');

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

const mockClient = {
    executeCommand: jest.fn(() => ({trigger_id: 'trigger_id'})),
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

    it('handle command execution with error response', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

        jest.spyOn(AppsManager, 'isAppsEnabled').mockResolvedValue(false);
        const error = new Error('Test error');
        mockClient.executeCommand.mockRejectedValue(error as never);

        const result = await executeCommand(serverUrl, intl, message, channelId, rootId);

        expect(mockClient.executeCommand).toHaveBeenCalledWith(message, args);
        expect(logDebug).toHaveBeenCalledWith('error on executeCommand', error.message);
        expect(result).toEqual({error});
    });
});

describe('executeAppCommand', () => {
    const msg = 'test message';

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
