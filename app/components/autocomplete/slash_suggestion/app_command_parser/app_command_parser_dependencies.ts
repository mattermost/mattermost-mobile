// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type {
    AppCallRequest,
    AppBinding,
    AppField,
    AppSelectOption,
    AppCallResponse,
    AppContext,
    AppForm,
    AutocompleteElement,
    AutocompleteDynamicSelect,
    AutocompleteStaticSelect,
    AutocompleteUserSelect,
    AutocompleteChannelSelect,
} from '@mm-redux/types/apps';

import type {
    AutocompleteSuggestion,
} from '@mm-redux/types/integrations';
export type {AutocompleteSuggestion};

export type {
    Channel,
} from '@mm-redux/types/channels';

export type {
    GlobalState,
} from '@mm-redux/types/store';

export type {
    DispatchFunc,
} from '@mm-redux/types/actions';

export {
    AppBindingLocations,
    AppCallTypes,
    AppFieldTypes,
    AppCallResponseTypes,
} from '@mm-redux/constants/apps';

export {getAppsBindings} from '@mm-redux/selectors/entities/apps';
export {getPost} from '@mm-redux/selectors/entities/posts';
export {getChannel, getCurrentChannel} from '@mm-redux/selectors/entities/channels';
export {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';

export {doAppCall} from '@actions/apps';

import Store from '@store/store';
export const getStore = () => Store.redux;

export const EXECUTE_CURRENT_COMMAND_ITEM_ID = '_execute_current_command';

import type {ParsedCommand} from './app_command_parser';
export const getExecuteSuggestion = (_: ParsedCommand): AutocompleteSuggestion | null => { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null;
};

import {sendEphemeralPost} from '@actions/views/post';
export const displayError = (err: string) => {
    sendEphemeralPost(err);
};
