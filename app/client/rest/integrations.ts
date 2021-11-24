// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

export interface ClientIntegrationsMix {
    getCommandsList: (teamId: string) => Promise<Command[]>;
    getCommandAutocompleteSuggestionsList: (userInput: string, teamId: string, commandArgs?: CommandArgs) => Promise<Command[]>;
    getAutocompleteCommandsList: (teamId: string, page?: number, perPage?: number) => Promise<Command[]>;
    executeCommand: (command: string, commandArgs?: CommandArgs) => Promise<CommandResponse>;
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

    executeCommand = async (command: string, commandArgs = {}) => {
        this.analytics.trackAPI('api_integrations_used');

        return this.doFetch(
            `${this.getCommandsRoute()}/execute`,
            {method: 'post', body: {command, ...commandArgs}},
        );
    };

    addCommand = async (command: Command) => {
        this.analytics.trackAPI('api_integrations_created');

        return this.doFetch(
            `${this.getCommandsRoute()}`,
            {method: 'post', body: command},
        );
    };

    submitInteractiveDialog = async (data: DialogSubmission) => {
        this.analytics.trackAPI('api_interactive_messages_dialog_submitted');
        return this.doFetch(
            `${this.urlVersion}/actions/dialogs/submit`,
            {method: 'post', body: data},
        );
    };
};

export default ClientIntegrations;
