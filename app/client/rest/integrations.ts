// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';

export interface ClientIntegrationsMix {
    getCommandsList: (teamId: string) => Promise<Command[]>;
    getCommandAutocompleteSuggestionsList: (userInput: string, teamId: string, channelId: string, rootId?: string) => Promise<AutocompleteSuggestion[]>;
    getAutocompleteCommandsList: (teamId: string, page?: number, perPage?: number) => Promise<Command[]>;
    executeCommand: (command: string, commandArgs?: CommandArgs) => Promise<CommandResponse>;
    addCommand: (command: Command) => Promise<Command>;
    submitInteractiveDialog: (data: DialogSubmission) => Promise<SubmitDialogResponse>;
    lookupInteractiveDialog: (data: DialogSubmission) => Promise<LookupDialogResponse>;
    executeDialogAction: (url: string, context: Record<string, string> | undefined, channelId: string, teamId: string) => Promise<PostActionResponse>;
    doBlockAction: (request: DoBlockActionRequest) => Promise<DoBlockActionResponse>;
}

const ClientIntegrations = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getCommandsList = async (teamId: string) => {
        return this.doFetch(
            `${this.getCommandsRoute()}?team_id=${teamId}`,
            {method: 'get'},
        );
    };

    getCommandAutocompleteSuggestionsList = async (userInput: string, teamId: string, channelId: string, rootId?: string) => {
        return this.doFetch(
            `${this.getTeamRoute(teamId)}/commands/autocomplete_suggestions${buildQueryString({user_input: userInput, team_id: teamId, channel_id: channelId, root_id: rootId})}`,
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
        return this.doFetch(
            `${this.getCommandsRoute()}/execute`,
            {method: 'post', body: {command, ...commandArgs}},
        );
    };

    addCommand = async (command: Command) => {
        return this.doFetch(
            `${this.getCommandsRoute()}`,
            {method: 'post', body: command},
        );
    };

    submitInteractiveDialog = async (data: DialogSubmission) => {
        return this.doFetch(
            `${this.urlVersion}/actions/dialogs/submit`,
            {method: 'post', body: data},
        );
    };

    lookupInteractiveDialog = async (data: DialogSubmission) => {
        return this.doFetch(
            `${this.urlVersion}/actions/dialogs/lookup`,
            {method: 'post', body: data},
        );
    };

    executeDialogAction = async (url: string, context: Record<string, string> | undefined, channelId: string, teamId: string) => {
        return this.doFetch(
            `${this.urlVersion}/actions/dialogs/execute`,
            {method: 'post', body: {url, context, channel_id: channelId, team_id: teamId}},
        );
    };

    doBlockAction = async (request: DoBlockActionRequest) => {
        return this.doFetch(
            `${this.urlVersion}/actions/blocks/do`,
            {method: 'post', body: request},
        );
    };
};

export default ClientIntegrations;
