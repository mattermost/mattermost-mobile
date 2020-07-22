// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as reselect from 'reselect';

import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import * as types from '@mm-redux/types';

export function getIncomingHooks(state: types.store.GlobalState) {
    return state.entities.integrations.incomingHooks;
}

export function getOutgoingHooks(state: types.store.GlobalState) {
    return state.entities.integrations.outgoingHooks;
}

export function getCommands(state: types.store.GlobalState) {
    return state.entities.integrations.commands;
}

export function getOAuthApps(state: types.store.GlobalState) {
    return state.entities.integrations.oauthApps;
}

export function getSystemCommands(state: types.store.GlobalState) {
    return state.entities.integrations.systemCommands;
}

export function getCommandAutocompleteSuggestionsList(state: types.store.GlobalState) {
    return state.entities.integrations.commandAutocompleteSuggestions;
}

/**
 * get outgoing hooks in current team
 */
export const getOutgoingHooksInCurrentTeam = reselect.createSelector(
    getCurrentTeamId,
    getOutgoingHooks,
    (teamId, hooks) => {
        return Object.values(hooks).filter((o) => o.team_id === teamId);
    },
);

export const getAllCommands = reselect.createSelector(
    getCommands,
    getSystemCommands,
    (commands, systemCommands) => {
        return {
            ...commands,
            ...systemCommands,
        };
    },
);

export const getAutocompleteCommandsList = reselect.createSelector(
    getAllCommands,
    getCurrentTeamId,
    (commands, currentTeamId) => {
        return Object.values(commands).filter((command) => {
            return command && (!command.team_id || command.team_id === currentTeamId) && command.auto_complete;
        }).sort((a, b) => a.display_name.localeCompare(b.display_name));
    },
);
