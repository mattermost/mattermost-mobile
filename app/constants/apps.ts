// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const AppBindingLocations = {
    POST_MENU_ITEM: '/post_menu',
    CHANNEL_HEADER_ICON: '/channel_header',
    COMMAND: '/command',
    IN_POST: '/in_post',
};

export const AppBindingPresentations = {
    MODAL: 'modal',
};

export const AppCallResponseTypes: { [name: string]: AppCallResponseType } = {
    OK: 'ok',
    ERROR: 'error',
    FORM: 'form',
    CALL: 'call',
    NAVIGATE: 'navigate',
};

export const AppExpandLevels: { [name: string]: AppExpandLevel } = {
    EXPAND_DEFAULT: '',
    EXPAND_NONE: 'none',
    EXPAND_ALL: 'all',
    EXPAND_SUMMARY: 'summary',
};

export const AppFieldTypes: { [name: string]: AppFieldType } = {
    TEXT: 'text',
    STATIC_SELECT: 'static_select',
    DYNAMIC_SELECT: 'dynamic_select',
    BOOL: 'bool',
    USER: 'user',
    CHANNEL: 'channel',
    MARKDOWN: 'markdown',
};

export const SelectableAppFieldTypes = [
    AppFieldTypes.CHANNEL,
    AppFieldTypes.USER,
    AppFieldTypes.STATIC_SELECT,
    AppFieldTypes.DYNAMIC_SELECT,
];

export const COMMAND_SUGGESTION_ERROR = 'error';
export const COMMAND_SUGGESTION_CHANNEL = 'channel';
export const COMMAND_SUGGESTION_USER = 'user';

export default {
    AppBindingLocations,
    AppBindingPresentations,
    AppCallResponseTypes,
    AppExpandLevels,
    AppFieldTypes,
    COMMAND_SUGGESTION_ERROR,
    COMMAND_SUGGESTION_CHANNEL,
    COMMAND_SUGGESTION_USER,
};
