// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {intlShape} from 'react-intl';

export {doAppFetchForm, doAppLookup} from '@actions/apps';

export {getChannelByNameAndTeamName, getChannel, autocompleteChannels} from '@mm-redux/actions/channels';
import {getUserByUsername, getUser, autocompleteUsers, autocompleteUsersInChannel} from '@mm-redux/actions/users';
export {AppsTypes} from '@mm-redux/action_types';
export {makeAppBindingsSelector, makeRHSAppBindingSelector, getAppCommandForm, getAppRHSCommandForm} from '@mm-redux/selectors/entities/apps';
export {getChannel as selectChannel, getCurrentChannel, getChannelByName as selectChannelByName} from '@mm-redux/selectors/entities/channels';
export {getPost} from '@mm-redux/selectors/entities/posts';
import {getCurrentTeamId, getCurrentTeam} from '@mm-redux/selectors/entities/teams';
export {getUserByUsername as selectUserByUsername, getUser as selectUser} from '@mm-redux/selectors/entities/users';
import {DispatchFunc} from '@mm-redux/types/actions';
import ReduxStore from '@store/store';

import type {ParsedCommand} from './app_command_parser';
export type {
    AppCall,
    AppCallRequest,
    AppBinding,
    AppField,
    AppSelectOption,
    AppCallResponse,
    AppCallValues,
    AppContext,
    AppForm,
    AutocompleteElement,
    AutocompleteDynamicSelect,
    AutocompleteStaticSelect,
    AutocompleteUserSelect,
    AutocompleteChannelSelect,
    AppLookupResponse,
} from '@mm-redux/types/apps';
export type {Channel} from '@mm-redux/types/channels';
import type {AutocompleteSuggestion} from '@mm-redux/types/integrations';
import type {GlobalState} from '@mm-redux/types/store';

export type {
    DispatchFunc,
    GlobalState,
};

export type {AutocompleteSuggestion};

export type {DoAppCallResult} from 'types/actions/apps';

export {
    AppBindingLocations,
    AppFieldTypes,
    AppCallResponseTypes,
    COMMAND_SUGGESTION_ERROR,
    COMMAND_SUGGESTION_CHANNEL,
    COMMAND_SUGGESTION_USER,
} from '@mm-redux/constants/apps';

export {
    getCurrentTeamId,
    getCurrentTeam,
};

export {
    getUserByUsername,
    getUser,
    autocompleteUsers,
    autocompleteUsersInChannel,
};

export {
    createCallRequest,
    filterEmptyOptions,
} from '@utils/apps';

export interface Store {
    dispatch: DispatchFunc;
    getState: () => GlobalState;
}

export const getStore = () => ReduxStore.redux as Store;

export const EXECUTE_CURRENT_COMMAND_ITEM_ID = '_execute_current_command';
export const OPEN_COMMAND_IN_MODAL_ITEM_ID = '_open_command_in_modal';

export const getOpenInModalSuggestion = (_: ParsedCommand): AutocompleteSuggestion | null => { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Not supported on mobile yet
    return null;
};

export type ExtendedAutocompleteSuggestion = AutocompleteSuggestion & {
    type?: string;
    item?: string;
}

export const getExecuteSuggestion = (_: ParsedCommand): AutocompleteSuggestion | null => { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null;
};

export const errorMessage = (intl: typeof intlShape, error: string, _command: string, _position: number): string => { // eslint-disable-line @typescript-eslint/no-unused-vars
    return intl.formatMessage({
        id: 'apps.error.parser',
        defaultMessage: 'Parsing error: {error}',
    }, {
        error,
    });
};

export {
    getChannelSuggestions,
    getUserSuggestions,
    inTextMentionSuggestions,
} from '@utils/mentions';
