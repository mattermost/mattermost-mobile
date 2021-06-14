// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type {
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
export {getChannel, getCurrentChannel, getChannelByName as selectChannelByName} from '@mm-redux/selectors/entities/channels';
export {getCurrentTeamId, getCurrentTeam} from '@mm-redux/selectors/entities/teams';
export {getUserByUsername as selectUserByUsername} from '@mm-redux/selectors/entities/users';

export {getUserByUsername} from '@mm-redux/actions/users';
export {getChannelByNameAndTeamName} from '@mm-redux/actions/channels';

export {doAppCall} from '@actions/apps';
export {createCallRequest} from '@utils/apps';

import Store from '@store/store';
export const getStore = () => Store.redux;

import keyMirror from '@mm-redux/utils/key_mirror';
export {keyMirror};

export const EXECUTE_CURRENT_COMMAND_ITEM_ID = '_execute_current_command';

import type {ParsedCommand} from './app_command_parser';
export const getExecuteSuggestion = (_: ParsedCommand): AutocompleteSuggestion | null => { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null;
};

import {Alert} from 'react-native';
import {intlShape} from 'react-intl';
export const displayError = (intl: typeof intlShape, body: string) => {
    const title = intl.formatMessage({
        id: 'mobile.general.error.title',
        defaultMessage: 'Error',
    });
    Alert.alert(title, body);
};

export const errorMessage = (intl: typeof intlShape, error: string, _command: string, _position: number): string => { // eslint-disable-line @typescript-eslint/no-unused-vars
    return intl.formatMessage({
        id: 'apps.error.parser',
        defaultMessage: 'Parsing error: {error}',
    }, {
        error,
    });
};
