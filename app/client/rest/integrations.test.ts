// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';
import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';
import type {ClientIntegrationsMix} from './integrations';

describe('ClientIntegrations', () => {
    let client: ClientIntegrationsMix & ClientBase;
    const teamId = 'team_id';

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('getCommandsList', async () => {
        await client.getCommandsList(teamId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getCommandsRoute()}?team_id=${teamId}`,
            {method: 'get'},
        );
    });

    test('getCommandAutocompleteSuggestionsList', async () => {
        const userInput = 'input';
        const channelId = 'channel_id';
        const rootId = 'root_id';
        await client.getCommandAutocompleteSuggestionsList(userInput, teamId, channelId, rootId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getTeamRoute(teamId)}/commands/autocomplete_suggestions${buildQueryString({user_input: userInput, team_id: teamId, channel_id: channelId, root_id: rootId})}`,
            {method: 'get'},
        );
    });

    test('getAutocompleteCommandsList', async () => {
        const page = 1;
        const perPage = 10;
        await client.getAutocompleteCommandsList(teamId, page, perPage);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getTeamRoute(teamId)}/commands/autocomplete${buildQueryString({page, per_page: perPage})}`,
            {method: 'get'},
        );

        // Test with default values
        await client.getAutocompleteCommandsList(teamId);
        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getTeamRoute(teamId)}/commands/autocomplete${buildQueryString({page: 0, per_page: PER_PAGE_DEFAULT})}`,
            {method: 'get'},
        );
    });

    test('executeCommand', async () => {
        const command = '/command';
        const commandArgs = {channel_id: 'channel_id'} as CommandArgs;
        await client.executeCommand(command, commandArgs);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getCommandsRoute()}/execute`,
            {method: 'post', body: {command, ...commandArgs}},
        );

        // Test without commandArgs
        await client.executeCommand(command);
        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.getCommandsRoute()}/execute`,
            {method: 'post', body: {command}},
        );
    });

    test('addCommand', async () => {
        const command = {id: 'command_id', trigger: 'trigger'} as Command;
        await client.addCommand(command);

        expect(client.doFetch).toHaveBeenCalledWith(
            client.getCommandsRoute(),
            {method: 'post', body: command},
        );
    });

    test('submitInteractiveDialog', async () => {
        const data = {url: 'data'} as DialogSubmission;
        await client.submitInteractiveDialog(data);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.urlVersion}/actions/dialogs/submit`,
            {method: 'post', body: data},
        );
    });
});
