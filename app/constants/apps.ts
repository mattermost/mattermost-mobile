// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const AppCallResponseTypes: { [name: string]: AppCallResponseType } = {
    OK: 'ok',
    ERROR: 'error',
    FORM: 'form',
    CALL: 'call',
    NAVIGATE: 'navigate',
};

export const AppFieldTypes: { [name: string]: AppFieldType } = {
    TEXT: 'text',
    STATIC_SELECT: 'static_select',
    DYNAMIC_SELECT: 'dynamic_select',
    BOOL: 'bool',
    USER: 'user',
    CHANNEL: 'channel',
    MARKDOWN: 'markdown',
    RADIO: 'radio',
    DATE: 'date',
    DATETIME: 'datetime',
};

export const SelectableAppFieldTypes = [
    AppFieldTypes.CHANNEL,
    AppFieldTypes.USER,
    AppFieldTypes.STATIC_SELECT,
    AppFieldTypes.DYNAMIC_SELECT,
];

export const DEFAULT_TIME_INTERVAL_MINUTES = 60;

export const COMMAND_SUGGESTION_ERROR = 'error';

export default {
    AppCallResponseTypes,
    AppFieldTypes,
    DEFAULT_TIME_INTERVAL_MINUTES,
    COMMAND_SUGGESTION_ERROR,
};
