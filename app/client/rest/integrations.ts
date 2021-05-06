// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {analytics} from '@init/analytics';
import {Command, DialogSubmission} from '@mm-redux/types/integrations';
import {buildQueryString} from '@mm-redux/utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

export interface ClientIntegrationsMix {
    getCommandsList: (teamId: string) => Promise<Command[]>;
    getCommandAutocompleteSuggestionsList: (userInput: string, teamId: string, commandArgs?: Record<string, any>) => Promise<Command[]>;
    getAutocompleteCommandsList: (teamId: string, page?: number, perPage?: number) => Promise<Command[]>;
    executeCommand: (command: Command, commandArgs?: Record<string, any>) => Promise<any>;
    addCommand: (command: Command) => Promise<Command>;
    submitInteractiveDialog: (data: DialogSubmission) => Promise<any>;
}

const ClientIntegrations = (superclass: any) => class extends superclass {
    getCommandsList = async (teamId: string) => {
        return this.doFetch(
            `${this.getCommandsRoute()}?team_id=${teamId}`,
            {method: 'get'},
        );
    };

    getCommandAutocompleteSuggestionsList = async (userInput: string, teamId: string, commandArgs: {}) => {
        return this.doFetch(
            `${this.getTeamRoute(teamId)}/commands/autocomplete_suggestions${buildQueryString({...commandArgs, user_input: userInput})}`,
            {method: 'get'},
        );
    };

    getAutocompleteCommandsList = async (teamId: string, page = 0, perPage = PER_PAGE_DEFAULT) => {
        return this.doFetch(
            `${this.getTeamRoute(teamId)}/commands/autocomplete${buildQueryString({page, per_page: perPage})}`,
            {method: 'get'},
        );
    };

    executeCommand = async (command: Command, commandArgs = {}) => {
        analytics.trackAPI('api_integrations_used');

        return this.doFetch(
            `${this.getCommandsRoute()}/execute`,
            {method: 'post', body: JSON.stringify({command, ...commandArgs})},
        );
    };

    addCommand = async (command: Command) => {
        analytics.trackAPI('api_integrations_created');

        return this.doFetch(
            `${this.getCommandsRoute()}`,
            {method: 'post', body: JSON.stringify(command)},
        );
    };

    submitInteractiveDialog = async (data: DialogSubmission) => {
        analytics.trackAPI('api_interactive_messages_dialog_submitted');
        return this.doFetch(
            `${this.getBaseRoute()}/actions/dialogs/submit`,
            {method: 'post', body: JSON.stringify(data)},
        );
    };
};

export default ClientIntegrations;
